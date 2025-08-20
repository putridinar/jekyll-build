// src/app/api/auth/vscode-login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { string } from 'zod';


export async function POST(request: NextRequest) {
    if (!adminAuth || !adminDb) {
        return NextResponse.json({ error: "Firebase Admin not configured." }, { status: 500 });
    }

    const { githubToken } = await request.json();
    if (!githubToken) {
        return NextResponse.json({ error: 'GitHub token is required.' }, { status: 400 });
    }

    try {
        // 1. Dapatkan info user dari GitHub untuk mendapatkan ID akun mereka
        const githubResponse = await fetch('https://api.github.com/user', {
            headers: { 'Authorization': `Bearer ${githubToken}` },
        });
        if (!githubResponse.ok) throw new Error('Failed to fetch user from GitHub.');
        
        const githubUser = await githubResponse.json();
        const githubId = githubUser.id.toString(); // Ini ID akun GitHub

        // --- INI DIA LOGIKA BARU BERDASARKAN IDEMU ---
        let finalUid: string;

        // 2. Cari di semua sub-koleksi 'settings' yang punya githubAccountId yang cocok
        const settingsQuery = adminDb.collectionGroup('settings').where('githubAccountId', '==', githubId);
        const querySnapshot = await settingsQuery.get();

        if (!querySnapshot.empty) {
            // DITEMUKAN! Pengguna ini sudah pernah menghubungkan akunnya dari web app.
            const settingsDoc = querySnapshot.docs[0];
            // ID dokumen induk dari sub-koleksi 'settings' adalah Firebase Auth UID yang kita cari!
            finalUid = settingsDoc.ref.parent.parent!.id; 
            console.log(`[API-LOG] User found via settings collection. Firebase UID is: ${finalUid}`);
        } else {
            // 3. Jika tidak ketemu, buat user baru
            console.log(`[API-LOG] User not found in settings. Creating new user with UID = GitHub ID: ${githubId}`);
            const newUserRef = adminDb.collection('users').doc(githubId);
            await newUserRef.set({
                uid: githubId,
                email: githubUser.email,
                displayName: githubUser.name || githubUser.login,
                photoURL: githubUser.avatar_url,
                role: 'freeUser',
                createdAt: FieldValue.serverTimestamp(),
                // Kita juga bisa tambahkan githubId di sini untuk konsistensi
                githubId: githubId,
            });
            finalUid = githubId;
        }
        
        // 4. Buat Custom Token menggunakan UID yang benar dan final
        const firebaseCustomToken = await adminAuth.createCustomToken(finalUid);
        
        return NextResponse.json({ firebaseCustomToken });

    } catch (error: any) {
        console.error("VS Code login error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}