// src/app/api/auth/vscode-login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
    if (!adminAuth || !adminDb) {
        console.error("Firebase Admin SDK not initialized.");
        return NextResponse.json({ error: "Firebase Admin not configured on the server." }, { status: 500 });
    }
    const { githubToken } = await request.json();

    if (!githubToken) {
        return NextResponse.json({ error: 'GitHub token is required.' }, { status: 400 });
    }

    try {
        if (!adminAuth || !adminDb) {
            throw new Error("Firebase Admin SDK not initialized.");
        }

        // 1. Dapatkan info user dari GitHub menggunakan token mereka
        const githubResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
            },
        });

        if (!githubResponse.ok) {
            throw new Error('Failed to fetch user from GitHub.');
        }

        const githubUser = await githubResponse.json();
        const githubId = githubUser.id.toString();
        
        // 2. Cari atau buat user di Firestore
        const userRef = adminDb.collection('users').doc(githubId);
        let userSnap = await userRef.get();

        if (!userSnap.exists) {
            await userRef.set({
                uid: githubId,
                email: githubUser.email,
                displayName: githubUser.name || githubUser.login,
                photoURL: githubUser.avatar_url,
                role: 'freeUser',
                createdAt: FieldValue.serverTimestamp(),
            });
        }
        
        // 3. Buat Custom Firebase Token
        const firebaseCustomToken = await adminAuth.createCustomToken(githubId);
        
        // 4. Kirim kembali ke ekstensi
        return NextResponse.json({ firebaseCustomToken });

    } catch (error: any) {
        console.error("VS Code login error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}