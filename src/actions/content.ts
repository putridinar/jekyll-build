
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { getUserId } from '@/lib/auth-utils';
import { FieldValue } from 'firebase-admin/firestore';
import { commitFileToRepo, createBranch, createPullRequest, getBranchSha } from '@/lib/github';
import { revalidatePath } from 'next/cache';
import sharp from 'sharp';

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
        const GITHUB_FILE_SIZE_LIMIT_BYTES = GITHUB_FILE_SIZE_LIMIT_MB * 512 * 512;

        if (data.mainImage && data.mainImage.startsWith('data:image')) {
            const base64Data = data.mainImage.split(',')[1];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            let processedImageBuffer = await sharp(imageBuffer)
                .webp({ quality: 80 })
                .toBuffer();

            // Jika gambar masih terlalu besar, ubah ukurannya dan kompres lagi.
            if (processedImageBuffer.length > GITHUB_FILE_SIZE_LIMIT_BYTES) {
                 console.log(`Image still too large (${(processedImageBuffer.length / 512 / 512).toFixed(2)}MB). Resizing...`);
                 processedImageBuffer = await sharp(imageBuffer)
                    .resize({ width: 1200 }) // Lebar yang wajar untuk gambar blog
                    .webp({ quality: 80 })
                    .toBuffer();
            }

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
                commitMessage: `feat: add image for ${data.slug}`,
                branch: settings.githubBranch,
                isBase64: true
            });
            
            finalMainImage = `/${imagePath}`;
        }
        
        const filePath = `_posts/${data.slug}.md`;
        const commitMessage = `feat: publish post "${data.title}"`;
        const markdownContent = `---
title: "${data.title}"
slug: "${data.slug}"
mainImage: "${finalMainImage || ''}"
---

${finalContent}`;

        await commitFileToRepo({
            repoFullName: settings.githubRepo,
            installationId: settings.installationId,
            path: filePath,
            content: markdownContent,
            commitMessage: commitMessage,
            branch: settings.githubBranch
        });
        
        if (finalMainImage !== data.mainImage) {
            const userId = await getUserId();
            const docRef = getUserContentDoc(userId, contentType, data.slug);
            await docRef.update({ mainImage: finalMainImage });
        }
        
        revalidatePath('/');
        return { success: true, slug: data.slug, savedData: { mainImage: finalMainImage } };

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
        await stateRef.set({
            ...state,
            savedAt: FieldValue.serverTimestamp()
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

        // Fungsi bantuan untuk meratakan pohon file menjadi array file sederhana
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

        // Proses file secara berurutan untuk menghindari kondisi balapan dan kesalahan 409 dari GitHub
        for (const file of filesToCommit) {
            const isBase64 = file.content.startsWith('data:');
            const contentToCommit = isBase64 ? file.content.split(',')[1] : file.content;

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
        // Berikan pesan kesalahan yang lebih ramah pengguna untuk masalah otentikasi.
        if (error.message.includes('Not authenticated') || error.message.includes('Session expired')) {
             return { success: false, error: "Your session has expired. Please log in again to publish your changes." };
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
        const newBranchName = `jekyll-flow-update-${timestamp}`;

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
                commitMessage: `feat: update ${file.name}`,
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
    