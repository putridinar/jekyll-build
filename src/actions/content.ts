
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { getUserId } from '@/lib/auth-utils';
import { FieldValue } from 'firebase-admin/firestore';
import { commitFileToRepo, createBranch, createPullRequest, getBranchSha, getRepoTree, getFileContent, } from '@/lib/github';
import { revalidatePath } from 'next/cache';
import sharp from 'sharp';
import { FileNode } from '@/types';

// Bantuan untuk mendapatkan referensi ke dokumen pengguna untuk konten
function getUserContentDoc(
 userId: string,
 contentType: string,
 slug: string,
) {
    if (!adminDb) throw new Error('Firestore not initialized');
    return adminDb.collection('users').doc(userId).collection('data').doc('content').collection(contentType).doc(slug);
}

// Bantuan untuk mendapatkan referensi ke dokumen pengaturan template
function getTemplateSettingsDoc(userId: string) {
 if (!adminDb) {
 throw new Error('Firestore not initialized');
 }
    return adminDb.collection('users').doc(userId).collection('settings').doc('template');
}

// Bantuan untuk mendapatkan referensi ke dokumen status template
function getTemplateStateDoc(userId: string) {
 if (!adminDb) {
 throw new Error('Firestore not initialized');
 }
    return adminDb.collection('users').doc(userId).collection('settings').doc('templateState');
}

/**
 * Menyimpan konten sebagai draf di Firestore.
 * Menangani pembuatan dan pembaruan konten baru.
 * Untuk konten baru, ini memeriksa apakah pengguna telah mencapai batas posting mereka.
**/
export async function saveContent(contentType: string, data: any) {
    try {
        const userId = await getUserId();
 if (!adminDb) {
 throw new Error('Firestore not initialized');
 }
        const userRef = adminDb.collection('users').doc(userId);
        const userSnap = await userRef.get();
        const userRole = userSnap.data()?.role;

        const docRef = getUserContentDoc(userId, contentType, data.slug);
        const docSnap = await docRef.get();

        // Hanya periksa batas posting untuk posting BARU, bukan untuk pembaruan.
        if (!docSnap.exists) {
            // Pengguna gratis dibatasi hingga 3 posting per jenis konten.
            if (userRole === 'freeUser') {
                const contentCollection = adminDb.collection('users').doc(userId).collection('data').doc('content').collection(contentType);
                const countResult = await contentCollection.count().get();
                // Pastikan countResult.data() tidak null atau undefined sebelum mengakses count
                const contentCount = countResult.data()?.count ?? 0; 

                if (countResult.data() === undefined) {
                 console.warn("Could not get content count data for user", userId, "contentType", contentType);
                }

                if (contentCount >= 3) {
                    throw new Error(`Free users are limited to 3 items of each content type. You currently have ${contentCount}.`);
                }
            }
        }
        
        await docRef.set({
            ...data,
            createdAt: docSnap.exists && docSnap.data()?.createdAt ? docSnap.data()?.createdAt : FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        revalidatePath('/');
        
        return { success: true, slug: data.slug };

    } catch (error: any) {
        console.error("Error saving content:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Publishes content to a GitHub repository.
 * It first saves the content as a draft, then commits it to GitHub.
 * It now compresses AI-generated images before committing and validates file size.
 * If compression isn't enough, it will resize the image.
**/
export async function publishContent(contentType: string, data: any) {
    try {
        const saveResult = await saveContent(contentType, data);
        if (!saveResult.success) {
            return saveResult; 
        }

        const settingsResult = await getSettings();
        if (!settingsResult.success || !settingsResult.data) {
             throw new Error(settingsResult.error || 'Could not retrieve user settings for publishing.');
        }
        const settings = settingsResult.data;
        if (!settings?.githubRepo || !settings?.githubBranch || !settings?.installationId) {
            throw new Error('GitHub repository details are incomplete. Please check your settings.');
        }

        let finalContent = data.content;
        let finalMainImage = data.mainImage;
        const GITHUB_FILE_SIZE_LIMIT_MB = 0.8;
        const GITHUB_FILE_SIZE_LIMIT_BYTES = GITHUB_FILE_SIZE_LIMIT_MB * 1024 * 1024;

        if (data.mainImage && data.mainImage.startsWith('data:image')) {
            const base64Data = data.mainImage.split(',')[1];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            let processedImageBuffer = await sharp(imageBuffer)
                .resize({ width: 512, height: 512, fit: 'inside' })
                .webp({ quality: 80 })
                .toBuffer();

            if (processedImageBuffer.length > GITHUB_FILE_SIZE_LIMIT_BYTES) {
                 throw new Error(`Image is too large to publish to GitHub even after compression and resizing. Please use a smaller image.`);
            }
            
            const compressedImageBase64 = processedImageBuffer.toString('base64');
            const imagePath = `assets/images/${data.slug}.webp`;
            
            await commitFileToRepo({
                repoFullName: settings.githubRepo,
                installationId: settings.installationId,
                path: imagePath,
                content: compressedImageBase64,
                commitMessage: `buildr: add image for ${data.slug}`,
                branch: settings.githubBranch,
                isBase64: true
            });
            
            finalMainImage = `/${imagePath}`;
        }
        
        const date = new Date().toISOString().split('T')[0];
        const filePath = `_posts/${date}-${data.slug}.md`;
        const commitMessage = `buildr: publish post "${data.title}"`;

        const frontmatter = `---
title: "${data.title}"
author: "${data.author || ''}"
date: ${new Date().toISOString()}
categories: ${data.categories || ''}
image: "${finalMainImage || ''}"
---`;

        const markdownContent = `${frontmatter}\n\n${finalContent}`;

        await commitFileToRepo({
            repoFullName: settings.githubRepo,
            installationId: settings.installationId,
            path: filePath,
            content: markdownContent,
            commitMessage: commitMessage,
            branch: settings.githubBranch
        });
        
        // Update the post in Firestore with the final image path
        if (finalMainImage !== data.mainImage) {
            const userId = await getUserId();
            const docRef = getUserContentDoc(userId, contentType, data.slug);
            await docRef.update({ mainImage: finalMainImage });
        }
        
        revalidatePath('/');
        return { success: true, slug: data.slug, savedData: { mainImage: finalMainImage, filename: `${date}-${data.slug}.md`, content: markdownContent } };


    } catch (error: any) {
        console.error("Error publishing content:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Mengambil satu item posting/konten berdasarkan slug-nya untuk pengguna saat ini.
**/
export async function getPost(contentType: string, slug: string) {
    try {
        const userId = await getUserId();
        const docRef = getUserContentDoc(userId, contentType, slug);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return { success: false, error: 'Post not found.' };
        }
        
        const postData = docSnap.data();
        if (postData) {
             if (postData.createdAt) postData.createdAt = postData.createdAt.toMillis();
             if (postData.updatedAt) postData.updatedAt = postData.updatedAt.toMillis();
        }

        return { success: true, data: postData };
    } catch (error: any) {
        console.error("Error getting post:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Mengambil semua item posting/konten dari jenis tertentu untuk pengguna saat ini.
**/
export async function getPosts(contentType: string) {
    try {
        const userId = await getUserId();
 if (!adminDb) {
 throw new Error('Firestore not initialized');
 }
        const collectionRef = adminDb.collection('users').doc(userId).collection('data').doc('content').collection(contentType);
        const snapshot = await collectionRef.orderBy('createdAt', 'desc').get();
        
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                slug: doc.id,
                createdAt: data.createdAt?.toMillis(),
                updatedAt: data.updatedAt?.toMillis(),
            };
        });

    } catch (error: any) {
        console.error(`Error getting posts for ${contentType}:`, error);
        return [];
    }
}

/**
 * Menghapus item posting/konten dari Firestore untuk pengguna saat ini.
**/
export async function deletePost(contentType: string, slug: string) {
    try {
        const userId = await getUserId();
        const docRef = getUserContentDoc(userId, contentType, slug);
        await docRef.delete();
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting post:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Menyimpan pengaturan GitHub ke subkoleksi pengguna saat ini.
 * Sekarang memastikan semua info GitHub yang relevan disimpan bersama. Hanya menyimpan bidang pengaturan yang ditentukan.
 */
export async function saveSettings(settings: { githubRepo: string; githubBranch: string; }) {
    try {
        const userId = await getUserId();
 if (!adminDb) {
 throw new Error('Firestore not initialized');
 }
        const settingsRef = adminDb.collection('users').doc(userId).collection('settings').doc('github');

        // Ambil pengaturan lengkap saat ini untuk memastikan kita tidak kehilangan apa pun.
        const currentSettings: any = (await settingsRef.get()).data() || {};
        
        // Logika ini memastikan kita menggabungkan pilihan repo/cabang baru dengan info otentikasi yang ada.
        const updatedSettings = {
            ...currentSettings,
            ...settings // Timpa dengan repo dan cabang baru
        };

        if (!updatedSettings.installationId || !updatedSettings.githubUsername) {
            throw new Error("Cannot save settings without a valid GitHub App installation and user information.");
        }

        await settingsRef.set(updatedSettings, { merge: true });
        return { success: true };
    } catch (error: any) {
        console.error("Error saving settings:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Mengambil pengaturan GitHub untuk pengguna saat ini.
**/
export async function getSettings() {
    try {
        const userId = await getUserId();
 if (!adminDb) {
 throw new Error('Firestore not initialized');
 }
        const settingsRef = adminDb.collection('users').doc(userId).collection('settings').doc('github');
        const docSnap = await settingsRef.get();
        if (!docSnap.exists) {
            return { success: true, data: null };
        }
        return { success: true, data: docSnap.data() };
    } catch (error: any) {
        console.error("Error getting settings:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Menghapus data pengaturan GitHub dari Firestore untuk pengguna saat ini.
**/
export async function disconnectGithub() {
    try {
        const userId = await getUserId();
 if (!adminDb) {
 throw new Error('Firestore not initialized');
 }
        const settingsRef = adminDb.collection('users').doc(userId).collection('settings').doc('github');
        
        // Gunakan `update` dengan `FieldValue.delete()` untuk setiap bidang yang akan dihapus.
        await settingsRef.update({
            installationId: FieldValue.delete(),
            githubUsername: FieldValue.delete(),
            githubRepo: FieldValue.delete(),
            githubBranch: FieldValue.delete(),
            githubAvatarUrl: FieldValue.delete(),
            githubAccountId: FieldValue.delete()
        });

        revalidatePath('/settings');
        return { success: true };
    } catch (error: any) {
        console.error("Error disconnecting GitHub:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Mengambil status publikasi template untuk pengguna saat ini.
**/
export async function getTemplateStatus() {
    try {
        const userId = await getUserId();
 if (!adminDb) {
 throw new Error('Firestore not initialized');
 }
        const templateRef = getTemplateSettingsDoc(userId);
        const docSnap = await templateRef.get();
        if (docSnap.exists) {
            return { success: true, data: docSnap.data() };
        }
        return { success: true, data: { isPublished: false } };
    } catch (error: any) {
        console.error("Error getting template status:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Membuat perancah dan menerbitkan template Jekyll/SSG default ke repo pengguna.
**/
export async function scaffoldTemplate() {
    try {
        const settingsResult = await getSettings();
        if (!settingsResult.success || !settingsResult.data) {
             throw new Error(settingsResult.error || 'Could not retrieve user settings for scaffolding.');
        }
        const settings = settingsResult.data;
        if (!settings?.githubRepo || !settings?.githubBranch || !settings?.installationId) {
            throw new Error('GitHub repository details are incomplete. Please check your settings.');
        }

        const templateFiles = {
            '_posts/.gitkeep': '',
            'assets/images/.gitkeep': '',
            '_data/.gitkeep': '',
        };

        for (const [path, content] of Object.entries(templateFiles)) {
            await commitFileToRepo({
                repoFullName: settings.githubRepo,
                installationId: settings.installationId,
                path: path,
                content: content,
                commitMessage: `[LYЯA]: Scaffold Template - add ${path}`,
                branch: settings.githubBranch,
            });
        }
        
        // Tandai template sebagai diterbitkan
        const userId = await getUserId();
        const templateRef = getTemplateSettingsDoc(userId);
        await templateRef.set({ isPublished: true, publishedAt: FieldValue.serverTimestamp() });

        revalidatePath('/template');

        return { success: true };
    } catch (error: any) {
        console.error("Error scaffolding template:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Menyimpan status editor template saat ini ke Firestore.
**/
export async function saveTemplateState(state: any) {
    try {
        const userId = await getUserId();
        if (!adminDb) {
            throw new Error('Firestore not initialized');
        }
        const stateRef = getTemplateStateDoc(userId);
        const filteredFileContents: { [key: string]: string } = {};
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
        
        for (const path in state.fileContents) {
            const isImage = imageExtensions.some(ext => path.toLowerCase().endsWith(ext));
            if (!isImage) {
                filteredFileContents[path] = state.fileContents[path];
            }
        }

        // Ensure expandedFolders is an array for Firestore compatibility
        const stateToSave = {
            ...state,
            expandedFolders: Array.isArray(state.expandedFolders)
                ? state.expandedFolders
                : Array.from(state.expandedFolders || []),
        };

        await stateRef.set({
            ...stateToSave,
            savedAt: FieldValue.serverTimestamp(),
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error saving template state:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Mengambil status editor template dari Firestore.
**/
export async function getTemplateState() {
    try {
        const userId = await getUserId();
 if (!adminDb) {
 throw new Error('Firestore not initialized');
 }
        const stateRef = getTemplateStateDoc(userId);
        const docSnap = await stateRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            // Ubah Stempel Waktu Firestore ke format yang dapat diserialkan (milidetik)
            if (data?.savedAt) {
                data.savedAt = data.savedAt.toMillis();
            }
            return { success: true, data: data };
        }
        return { success: true, data: null }; // Belum ada status yang disimpan
    } catch (error: any) {
        console.error("Error getting template state:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Menghapus status editor template yang disimpan dari Firestore.
**/
export async function deleteTemplateState() {
    try {
        const userId = await getUserId();
 if (!adminDb) {
 throw new Error('Firestore not initialized');
 }
        const stateRef = getTemplateStateDoc(userId);
        await stateRef.delete();
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting template state:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Menerbitkan sekumpulan file template ke repositori GitHub pengguna secara berurutan.
 * Sekarang dengan kompresi gambar otomatis untuk file di bawah batas ukuran GitHub.
**/
export async function publishTemplateFiles(files: any[]) {
    try {
        const settingsResult = await getSettings();
        if (!settingsResult.success || !settingsResult.data) {
             throw new Error(settingsResult.error || 'Could not retrieve user settings.');
        }
        const settings = settingsResult.data;

        if (!settings?.githubUsername || !settings?.githubRepo || !settings?.githubBranch || !settings?.installationId) {
            throw new Error('GitHub repository details are incomplete. Please check your settings.');
        }

        const filesToCommit: any[] = [];
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
        const GITHUB_FILE_SIZE_LIMIT_BYTES = 800 * 1024; // Batas aman 800KB

        // Fungsi bantuan untuk meratakan pohon file
        const collectFiles = (items: any[]) => {
            for (const item of items) {
                if (item.type === 'file') {
                    filesToCommit.push(item);
                } else if (item.type === 'folder' && item.children) {
                    if (item.children.length === 0) {
                        filesToCommit.push({ path: `${item.path}/.gitkeep`, name: '.gitkeep', content: '', type: 'file' });
                    } else {
                        collectFiles(item.children);
                    }
                }
            }
        };
        collectFiles(files);

        // Proses file secara berurutan
        for (const file of filesToCommit) {
            let contentToCommit = file.content;
            let isBase64 = false;

            // Cek apakah file adalah gambar dan perlu dikompresi
            const isImage = imageExtensions.some(ext => file.path.toLowerCase().endsWith(ext));
            if (isImage && file.content.startsWith('data:image')) {
                const base64Data = file.content.split(',')[1];
                const imageBuffer = Buffer.from(base64Data, 'base64');

                // Jika sudah di bawah batas, tidak perlu kompresi ulang
                if (imageBuffer.length > GITHUB_FILE_SIZE_LIMIT_BYTES) {
                    const processedImageBuffer = await sharp(imageBuffer)
                        .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }) // Resize jika terlalu besar
                        .webp({ quality: 80 }) // Kompres ke WebP
                        .toBuffer();

                    // Cek lagi setelah kompresi
                    if (processedImageBuffer.length > GITHUB_FILE_SIZE_LIMIT_BYTES) {
                        throw new Error(`File '${file.name}' terlalu besar (> 800KB) bahkan setelah kompresi. Harap gunakan gambar yang lebih kecil.`);
                    }
                    contentToCommit = processedImageBuffer.toString('base64');
                } else {
                    contentToCommit = base64Data; // Gunakan data base64 yang sudah ada
                }
                isBase64 = true;
            } else if (file.content.startsWith('data:')) {
                // Untuk file non-gambar (mis. SVG) yang berupa data URI
                contentToCommit = file.content.split(',')[1];
                isBase64 = true;
            }

            await commitFileToRepo({
                repoFullName: settings.githubRepo,
                installationId: settings.installationId,
                path: file.path,
                content: contentToCommit,
                commitMessage: `buildr: update ${file.name}`,
                branch: settings.githubBranch,
                isBase64: isBase64,
            });
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error publishing template files:", error);
        if (error.message.includes('Session expired')) {
             return { success: false, error: "Sesi Anda telah berakhir. Harap login kembali." };
        }
        return { success: false, error: error.message };
    }
}

/**
 * Membuat cabang baru, melakukan commit file, dan membuka pull request.
 */
export async function createPullRequestAction(files: any[], prDetails: { title: string; body: string }) {
    try {
        const settingsResult = await getSettings();
        if (!settingsResult.success || !settingsResult.data) {
            throw new Error(settingsResult.error || 'Could not retrieve user settings.');
        }
        const settings = settingsResult.data;

        if (!settings?.githubRepo || !settings?.githubBranch || !settings?.installationId) {
            throw new Error('GitHub repository details are incomplete. Please check your settings.');
        }
        
        const { githubRepo, githubBranch, installationId } = settings;
        const { title, body } = prDetails;
        
        // 1. Buat nama cabang yang unik
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
        const newBranchName = `jekyll-buildr-update-${timestamp}`;

        // 2. Dapatkan SHA komit terbaru dari cabang dasar
        const baseSha = await getBranchSha(githubRepo, githubBranch, installationId);

        // 3. Buat cabang baru
        await createBranch(githubRepo, newBranchName, baseSha, installationId);

        // 4. Lakukan commit semua file ke cabang baru
        const filesToCommit: any[] = [];
        const collectFiles = (items: any[]) => {
            for (const item of items) {
                if (item.type === 'file') {
                    filesToCommit.push(item);
                } else if (item.type === 'folder' && item.children) {
                    if (item.children.length === 0) {
                        filesToCommit.push({
                            path: `${item.path}/.gitkeep`,
                            name: '.gitkeep',
                            content: '',
                            type: 'file'
                        });
                    } else {
                        collectFiles(item.children);
                    }
                }
            }
        };
        collectFiles(files);

        for (const file of filesToCommit) {
             const isBase64 = file.content.startsWith('data:');
             const contentToCommit = isBase64 ? file.content.split(',')[1] : file.content;

            await commitFileToRepo({
                repoFullName: githubRepo,
                installationId: installationId,
                path: file.path,
                content: contentToCommit,
                commitMessage: `buildr: update ${file.name}`,
                branch: newBranchName,
                isBase64,
            });
        }

        // 5. Buat pull request
        const pr = await createPullRequest({
            repoFullName: githubRepo,
            installationId: installationId,
            title,
            body,
            head: newBranchName,
            base: githubBranch,
        });

        return { success: true, prUrl: pr.html_url };

    } catch (error: any) {
        console.error("Error creating pull request:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Mensimulasikan 'git clone' dengan mengambil semua file dari repositori
 * dan mengembalikannya dalam format yang bisa digunakan oleh IDE.
 */
export async function cloneRepository() {
    try {
        const settingsResult = await getSettings();
        if (!settingsResult.success || !settingsResult.data) {
            throw new Error(settingsResult.error || 'Could not retrieve user settings.');
        }
        const settings = settingsResult.data;
        if (!settings?.githubRepo || !settings?.githubBranch || !settings?.installationId) {
            throw new Error('GitHub repository details are incomplete. Please check your settings.');
        }

        const treeItems = await getRepoTree(settings.githubRepo, settings.githubBranch, settings.installationId);
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

        const fileContents: { [key: string]: string } = {};
        const fileStructure: FileNode[] = [];

        const structureMap: { [key: string]: FileNode } = {};

        // Proses semua item dari tree file
        for (const item of treeItems) {
            // Cek apakah file adalah gambar berdasarkan ekstensinya
            const isImage = imageExtensions.some(ext => item.path.toLowerCase().endsWith(ext));

            // Jika ini gambar, lewati dan jangan proses lebih lanjut
            if (isImage) {
                continue;
            }
            // Kita hanya proses file (blob), bukan folder (tree) atau submodule
            if (item.type === 'blob') {
                const fileData = await getFileContent(settings.githubRepo, item.sha, settings.installationId);
                
                // Konten dari GitHub API dalam format base64, jadi perlu di-decode
                if (fileData.encoding === 'base64') {
                    fileContents[item.path] = Buffer.from(fileData.content, 'base64').toString('utf-8');
                }
            }

            // Membangun struktur folder/file untuk file explorer
            const pathParts = item.path.split('/');
            let currentLevel = fileStructure;

            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                const currentPath = pathParts.slice(0, i + 1).join('/');

                let node = structureMap[currentPath];

                if (!node) {
                    node = {
                        name: part,
                        path: currentPath,
                        type: (i === pathParts.length - 1 && item.type === 'blob') ? 'file' : 'folder',
                    };
                    if (node.type === 'folder') node.children = [];
                    
                    structureMap[currentPath] = node;
                    currentLevel.push(node);
                }

                if (node.type === 'folder') {
                    currentLevel = node.children!;
                }
            }
        }
        
        return { success: true, fileStructure, fileContents };

    } catch (error: any) {
        console.error("Error cloning repository:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Mengambil daftar semua workspace milik pengguna. (Fitur Pro)
 */
export async function getWorkspaces() {
    const userId = await getUserId();
    if (!adminDb) {
        throw new Error('Firestore not initialized');
    }
    const workspacesRef = adminDb.collection('users').doc(userId).collection('workspaces');
    const snapshot = await workspacesRef.get();
    
    if (snapshot.empty) {
        return [];
    }
    
    // Kembalikan data penting seperti nama dan repo untuk ditampilkan di UI
    return snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || doc.data().githubRepo, // Ambil nama workspace atau nama repo
        githubRepo: doc.data().githubRepo,
    }));
}

/**
 * Mengambil state lengkap dari sebuah workspace spesifik.
 */
export async function getWorkspaceState(workspaceId: string) {
    try {
        const userId = await getUserId();
        if (!adminDb) {
            throw new Error('Firestore not initialized');
        }
        const stateRef = adminDb.collection('users').doc(userId).collection('workspaces').doc(workspaceId);
        const docSnap = await stateRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            // ... (logika konversi timestamp jika ada)
            return { success: true, data: data };
        }
        return { success: true, data: null };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Menyimpan state dari workspace yang aktif.
 */
export async function saveWorkspaceState(workspaceId: string, state: any) {
    try {
        const userId = await getUserId();
        if (!adminDb) {
            throw new Error('Firestore not initialized');
        }
        const stateRef = adminDb.collection('users').doc(userId).collection('workspaces').doc(workspaceId);
        
        const stateToSave = {
            ...state,
            expandedFolders: Array.isArray(state.expandedFolders)
                ? state.expandedFolders
                : Array.from(state.expandedFolders || []),
        };

        await stateRef.set({
            ...stateToSave,
            savedAt: FieldValue.serverTimestamp(),
        }, { merge: true }); // Gunakan merge agar tidak menimpa data lain seperti 'name'
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Membuat workspace baru dengan mengkloning repositori dari GitHub.
 * Fitur ini hanya untuk proUser.
 */
export async function createWorkspace(repoFullName: string, branch: string) {
    try {
        const userId = await getUserId();
        if (!adminDb) throw new Error('Firestore not initialized');

        // 1. Validasi Peran Pengguna (Hanya untuk Pro)
        const userRef = adminDb.collection('users').doc(userId);
        const userSnap = await userRef.get();
        if (userSnap.data()?.role !== 'proUser') {
            throw new Error('Hanya Pro User yang dapat membuat workspace baru.');
        }

        // 2. Ambil pengaturan untuk mendapatkan installationId yang SUDAH ADA
        const settingsResult = await getSettings();
        if (!settingsResult.success || !settingsResult.data?.installationId) {
            throw new Error('Koneksi GitHub tidak ditemukan. Harap hubungkan akun Anda di pengaturan terlebih dahulu.');
        }
        const installationId = settingsResult.data.installationId;

        // 3. Logika Kloning (sekarang menggunakan installationId yang benar)
        const treeItems = await getRepoTree(repoFullName, branch, installationId);
        
        const fileContents: { [key: string]: string } = {};
        const fileStructure: any[] = [];
        const structureMap: { [key: string]: any } = {};
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

        for (const item of treeItems) {
            const isImage = imageExtensions.some(ext => item.path.toLowerCase().endsWith(ext));
            if (isImage) continue;

            if (item.type === 'blob') {
                const fileData = await getFileContent(repoFullName, item.sha, installationId);
                if (fileData.encoding === 'base64') {
                    fileContents[item.path] = Buffer.from(fileData.content, 'base64').toString('utf-8');
                }
            }
            
            // Logika untuk membangun struktur file agar bisa tampil di explorer
            const pathParts = item.path.split('/');
            let currentLevel = fileStructure;
            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                const currentPath = pathParts.slice(0, i + 1).join('/');
                let node = structureMap[currentPath];
                if (!node) {
                    node = {
                        name: part,
                        path: currentPath,
                        type: (i === pathParts.length - 1 && item.type === 'blob') ? 'file' : 'folder',
                    };
                    if (node.type === 'folder') node.children = [];
                    structureMap[currentPath] = node;
                    currentLevel.push(node);
                }
                if (node.type === 'folder') currentLevel = node.children!;
            }
        }

        // Buat dokumen baru di koleksi workspaces
        const newWorkspaceRef = adminDb.collection('users').doc(userId).collection('workspaces').doc();
        await newWorkspaceRef.set({
            name: repoFullName.split('/')[1] || 'Workspace Baru',
            githubRepo: repoFullName,
            githubBranch: branch,
            fileStructure, // <-- Sekarang ini akan berisi data yang benar
            fileContents,
            activeFile: 'index.html',
            createdAt: FieldValue.serverTimestamp(),
        });

        // 5. Atur workspace baru sebagai yang aktif
        await setActiveWorkspace(newWorkspaceRef.id);

        return { success: true, workspaceId: newWorkspaceRef.id };

    } catch (error: any) {
        console.error("Error creating workspace:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Mengatur workspace mana yang sedang aktif untuk pengguna.
 */
export async function setActiveWorkspace(workspaceId: string) {
    const userId = await getUserId();
    if (!adminDb) {
        throw new Error('Firestore not initialized');
    }
    const settingsRef = adminDb.collection('users').doc(userId).collection('settings').doc('github');
    await settingsRef.set({ activeWorkspaceId: workspaceId }, { merge: true });
    return { success: true };
}

const initialFileStructure: FileNode[] = [
  {
    name: '_layouts',
    path: '_layouts',
    type: 'folder',
    children: [
      {name: 'default.html', path: '_layouts/default.html', type: 'file'},
      {name: 'post.html', path: '_layouts/post.html', type: 'file'},
    ],
  },
  {
    name: '_includes',
    path: '_includes',
    type: 'folder',
    children: [
      {name: 'header.html', path: '_includes/header.html', type: 'file'},
      {name: 'footer.html', path: '_includes/footer.html', type: 'file'},
    ],
  },
  {
    name: '_posts',
    path: '_posts',
    type: 'folder',
    children: [
      {
        name: '2024-01-01-welcome-to-jekyll.md',
        path: '_posts/2024-01-01-welcome-to-jekyll.md',
        type: 'file',
      },
    ],
  },
  {
    name: '_data',
    path: '_data',
    type: 'folder',
    children: [{name: 'navigation.yml', path: '_data/navigation.yml', type: 'file'}],
  },
  {
    name: 'assets',
    path: 'assets',
    type: 'folder',
    children: [
      {
        name: 'css',
        path: 'assets/css',
        type: 'folder',
        children: [{name: 'style.css', path: 'assets/css/style.css', type: 'file'}],
      },
      {
        name: 'images',
        path: 'assets/images',
        type: 'folder',
        children: [{name: '.gitkeep', path: 'assets/images/.gitkeep', type: 'file'}],
      },
      {
        name: 'js',
        path: 'assets/js',
        type: 'folder',
        children: [{name: 'script.js', path: 'assets/js/script.js', type: 'file'}],
      },
    ],
  },
  {name: '_config.yml', path: '_config.yml', type: 'file'},
  {name: 'index.html', path: 'index.html', type: 'file'},
  {name: 'Gemfile', path: 'Gemfile', type: 'file'},
];

const initialFileContents: {[key: string]: string} = {
  '_config.yml': `title: My Jekyll Site
email: your-email@example.com
description: >- # this means to ignore newlines until "baseurl:"
baseurl: "" # subpath situs Anda, mis. /blog
url: "" # nama host & protokol dasar untuk situs Anda, mis. http://example.com
twitter_username: jekyllrb
github_username:  jekyll

permalink: /post/:title

defaults:
- scope:
    type: posts
  values:
    layout: post

- scope:
    type: pages
  values:
    layout: page

# Pengaturan Markdown
markdown: kramdown

# Pengaturan build
plugins:
  - jekyll-feed
  - jekyll-sitemap

# Kecualikan dari pemrosesan.
# Item berikut tidak akan diproses, secara default.
# Setiap item yang tercantum di bawah kunci "exclude:" di sini akan secara otomatis ditambahkan ke
# daftar internal "default_excludes".
#
# Item yang dikecualikan dapat diproses dengan secara eksplisit mencantumkan direktori atau
# path file entri dalam daftar "include:".
#
# exclude:
#   - .sass-cache/
#   - .jekyll-cache/
#   - gemfiles/
#   - Gemfile
#   - Gemfile.lock
#   - node_modules/
#   - vendor/bundle/
#   - vendor/cache/
#   - vendor/gems/
#   - vendor/ruby/
`,
  'index.html': `---
layout: default
title: Welcome to Your New Blog!
permalink: /
---

<h1 class="flex justify-center items-center mb-6 text-3xl font-bold text-center">Hello Broo..!</h1>
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

  {% for post in site.posts %}
    <a href="{{ post.url | relative_url }}" class="group block rounded-lg overflow-hidden bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 dark:bg-slate-800">
      
      {% if post.image %}
        <img src="{{ post.image | relative_url }}" alt="{{ post.title }}" class="w-full h-48 object-cover">
      {% endif %}

      <div class="p-6">
        <h2 class="mb-2 text-xl font-bold tracking-tight text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 transition-colors">
          {{ post.title }}
        </h2>
        
        <p class="font-normal text-slate-600 dark:text-slate-400 mb-4">
          {{ post.excerpt | strip_html | truncatewords: 20 }}
        </p>

        <p class="text-sm text-slate-500 dark:text-slate-500">
          {{ post.date | date: "%b %d, %Y" }}
        </p>
      </div>

    </a>
  {% endfor %}

</div>
`,
  '_layouts/default.html': `<!DOCTYPE html>
<html lang="{{ page.lang | default: site.lang | default: "id-ID" }}" class="h-full">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ page.title | escape }} | {{ site.title | escape }}</title>
    <meta name="description" content="{{ page.excerpt | default: site.description | strip_html | normalize_whitespace | truncate: 160 | escape }}">
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <link rel="stylesheet" href="{{ '/assets/css/style.css' | relative_url }}">
    <link rel="canonical" href="{{ page.url | replace:'index.html','' | absolute_url }}">
  </head>
  <body class="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans min-h-screen flex flex-col">
    {% include header.html %}
    
    <main class="page-content flex-grow" aria-label="Content">
      <div class="container mx-auto px-4 py-8">
        {{ content }}
      </div>
    </main>
    
    {% include footer.html %}
  </body>
</html>
`,
  '_layouts/post.html': `---
layout: default
---
<article class="post h-entry px-4 py-8 max-w-3xl mx-auto" itemscope itemtype="http://schema.org/BlogPosting">

        <h2 class="mb-4 text-lg font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
          {{ page.title }}
        </h2>

      {% if page.image %}
        <img src="{{ page.image | relative_url }}" alt="{{ page.title }}" class="w-full h-58 rounded-md shadow object-cover">
      {% endif %}

  <div class="post-content e-content prose prose-lg dark:prose-invert" itemprop="articleBody">
    {{ content }}
  </div>
  
  <div class="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
    Diposting pada <time class="dt-published" datetime="{{ page.date | date_to_xmlschema }}" itemprop="datePublished">{{ page.date | date: "%b %-d, %Y" }}</time>
    {%- if page.author -%}
      oleh <span itemprop="author" itemscope itemtype="http://schema.org/Person"><span class="p-author h-card" itemprop="name">{{ page.author }}</span></span>
    {%- endif -%}
    {%- if page.tags and page.tags.size > 0 -%}
      <br>
      Kategori:
      {%- for tag in page.tags -%}
        <a href="/tags/{{ tag | slugify }}/" class="text-purple-600 dark:text-purple-400 hover:underline">#{{ tag }}</a>{%- unless forloop.last -%},{%- endunless -%}
      {%- endfor -%}
    {%- endif -%}
  </div>

  <a class="u-url" href="{{ page.url | relative_url }}" hidden></a>
</article>
`,
  '_includes/header.html': `<header class="bg-white dark:bg-gray-800 shadow-md py-4">
  <div class="container mx-auto px-4 flex justify-between items-center">
    <a class="text-2xl font-bold text-gray-900 dark:text-white" href="{{ '/' | relative_url }}">{{ site.title | escape }}</a>
    
    <nav class="site-nav">
      <div class="hidden md:block">
        {%- for item in site.data.navigation -%}
          <a class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md font-medium" href="{{ item.url | relative_url }}">{{ item.title }}</a>
        {%- endfor -%}
      </div>
      </nav>
  </div>
</header>
`,
  '_includes/footer.html': `<footer class="w-full bg-white border-t border-slate-200 dark:bg-slate-900 dark:border-slate-700">
    <div class="container mx-auto py-5 px-4 text-center text-sm text-slate-500 dark:text-slate-400">
      <p>&copy; {% capture current_year %}{{ 'now' | date: '%Y' }}{% endcapture %}{{ current_year }} {{ site.title }} <br /> Dibuat dengan <a href="https://jekyll-buildr.vercel.app/" target="_blank">Jekyll-Buildr</a> by Daffa</p>
    </div>
  </footer>
`,
  '_posts/2024-01-01-welcome-to-jekyll.md': `---
title: "Welcome to Jekyll!"
image: "https://placehold.co/600x400?text=Jekyll-World"
date: 2024-01-01 00:00:00 -0000
categories: jekyll update
---
You’ll find this post in your \`_posts\` directory. Go ahead and edit it and re-build the site to see your changes. You can rebuild the site in many different ways, but the most common way is to run \`bundle exec jekyll serve\`, which launches a web server and auto-regenerates your site when a file is updated.

To add new posts, simply add a file in the \`_posts\` directory that follows the convention \`YYYY-MM-DD-name-of-post.ext\` and includes the necessary front matter. Take a look at the source for this post to get an idea about how it works.
`,
  '_data/navigation.yml': `- title: Home
  url: /
- title: About
  url: /about/
`,
  'assets/css/style.css': `/* Add your Tailwind CSS directives here, or other custom CSS */
`,
  'assets/js/script.js': `/* Add your Javascript code here */
`,
  'Gemfile': `source "https://rubygems.org"

gem "jekyll"
gem "jekyll-feed"
gem "jekyll-sitemap"
`,
};

/**
 * Membuat workspace default untuk freeUser jika belum ada.
 * Fungsi ini akan dipanggil oleh getWorkspaceState jika tidak ada ID yang diberikan.
 */
export async function createDefaultWorkspaceIfNeeded(userId: string) {
    if (!adminDb) {
        throw new Error('Firestore not initialized');
    }
    const defaultWsRef = adminDb.collection('users').doc(userId).collection('workspaces').doc('default');
    const docSnap = await defaultWsRef.get();
    
    if (!docSnap.exists) {
        await defaultWsRef.set({
            name: 'Project Default',
            githubRepo: null, // Proyek default tidak terhubung ke GitHub
            githubBranch: null,
            fileStructure: initialFileStructure,
            fileContents: initialFileContents,
            activeFile: 'index.html', // File default yang terbuka
            createdAt: FieldValue.serverTimestamp(),
        });
    }
    return 'default';
}