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
        const email = githubUser.email;
        const displayName = githubUser.name || githubUser.login;
        const photoURL = githubUser.avatar_url;

        let uid: string;

        try {
            // 2. Cari user di Firebase Authentication berdasarkan email
            const userRecord = await adminAuth.getUserByEmail(email);
            uid = userRecord.uid; // User sudah ada, gunakan UID yang ada
            console.log(`[API-LOG] User found by email. UID: ${uid}`);
        } catch (error: any) {
            // Jika user tidak ditemukan (error code 'auth/user-not-found'), buat user baru
            if (error.code === 'auth/user-not-found') {
                console.log(`[API-LOG] User not found by email. Creating new user...`);
                const newUserRecord = await adminAuth.createUser({
                    email: email,
                    displayName: displayName,
                    photoURL: photoURL,
                });
                uid = newUserRecord.uid;
            } else {
                // Tangani error lain
                throw error;
            }
        }
        
        // 3. Buat atau update dokumen di Firestore menggunakan UID dari Firebase Auth
        const userDocRef = adminDb.collection('users').doc(uid);
        await userDocRef.set({
            uid: uid,
            email: email,
            displayName: displayName,
            photoURL: photoURL,
            githubId: githubId, // Simpan githubId untuk referensi
            // Hanya set role dan createdAt jika dokumen belum ada
            role: (await userDocRef.get()).data()?.role || 'freeUser',
            createdAt: (await userDocRef.get()).data()?.createdAt || FieldValue.serverTimestamp(),
        }, { merge: true });

        // 4. Buat Custom Token dengan UID yang benar
        const firebaseCustomToken = await adminAuth.createCustomToken(uid);
        
        return NextResponse.json({ firebaseCustomToken });

    } catch (error: any) {
        console.error("VS Code login error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}