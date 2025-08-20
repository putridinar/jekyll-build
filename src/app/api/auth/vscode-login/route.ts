// src/app/api/auth/vscode-login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
    if (!adminAuth || !adminDb) {
        return NextResponse.json({ error: "Firebase Admin not configured." }, { status: 500 });
    }

    const { githubToken } = await request.json();
    if (!githubToken) {
        return NextResponse.json({ error: 'GitHub token is required.' }, { status: 400 });
    }

    try {
        // 1. Dapatkan info user dari GitHub
        const githubResponse = await fetch('https://api.github.com/user', {
            headers: { 'Authorization': `Bearer ${githubToken}` },
        });
        if (!githubResponse.ok) throw new Error('Failed to fetch user from GitHub.');
        
        const githubUser = await githubResponse.json();
        const githubId = githubUser.id.toString();
        const githubEmail = githubUser.email;

        // --- LOGIKA BARU UNTUK MENGGABUNGKAN AKUN ---
        
        // 2. Coba cari user berdasarkan UID yang sama dengan ID GitHub
        const userRefByUid = adminDb.collection('users').doc(githubId);
        let userSnap = await userRefByUid.get();
        let userRecord = userSnap.data();
        let finalUid = githubId;

        // 3. Jika tidak ketemu, coba cari berdasarkan email
        if (!userSnap.exists && githubEmail) {
            const query = adminDb.collection('users').where('email', '==', githubEmail);
            const querySnapshot = await query.get();
            
            if (!querySnapshot.empty) {
                // User ditemukan via email! Ini adalah user asli kita.
                const existingUserDoc = querySnapshot.docs[0];
                userRecord = existingUserDoc.data();
                finalUid = existingUserDoc.id; // Gunakan UID asli dari Firebase Auth

                // Update dokumen yang ada dengan ID GitHub untuk login di masa depan
                await existingUserDoc.ref.update({ githubId: githubId });
            }
        }

        // 4. Jika masih tidak ada, buat user baru
        if (!userRecord) {
            await userRefByUid.set({
                uid: githubId,
                email: githubEmail,
                displayName: githubUser.name || githubUser.login,
                photoURL: githubUser.avatar_url,
                role: 'freeUser',
                createdAt: FieldValue.serverTimestamp(),
            });
        }
        
        // 5. Buat Custom Token menggunakan UID yang benar (finalUid)
        const firebaseCustomToken = await adminAuth.createCustomToken(finalUid);
        
        return NextResponse.json({ firebaseCustomToken });

    } catch (error: any) {
        console.error("VS Code login error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}