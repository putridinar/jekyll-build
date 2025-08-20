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
        const githubResponse = await fetch('https://api.github.com/user', {
            headers: { 'Authorization': `Bearer ${githubToken}` },
        });
        if (!githubResponse.ok) throw new Error('Failed to fetch user from GitHub.');
        
        const githubUser = await githubResponse.json();
        const githubUsername = githubUser.login;
        const githubId = githubUser.id.toString();

        // 1. Inisialisasi dengan null
        let finalUid: string | null = null; 

        const settingsQuery = adminDb.collectionGroup('settings').where('githubUsername', '==', githubUsername);
        const querySnapshot = await settingsQuery.get();

        if (!querySnapshot.empty) {
            const settingsDoc = querySnapshot.docs[0];
            finalUid = settingsDoc.ref.parent.parent!.id;
            console.log(`[API-LOG] User found via githubUsername. Firebase UID is: ${finalUid}`);
            await settingsDoc.ref.update({ githubAccountId: githubId });
        }

        if (!finalUid) {
            console.log(`[API-LOG] User not found by username. Creating new user with UID = GitHub ID: ${githubId}`);
            const newUserRef = adminDb.collection('users').doc(githubId);
            await newUserRef.set({
                uid: githubId,
                githubId: githubId,
                email: githubUser.email,
                displayName: githubUser.name || githubUser.login,
                photoURL: githubUser.avatar_url,
                role: 'freeUser',
                createdAt: FieldValue.serverTimestamp(),
            });
            finalUid = githubId;
        }
        
        // 2. Tambahkan pemeriksaan sebelum digunakan
        if (!finalUid) {
            throw new Error("Could not determine a valid user ID to create a token.");
        }
        
        const firebaseCustomToken = await adminAuth.createCustomToken(finalUid);
        
        return NextResponse.json({ firebaseCustomToken });

    } catch (error: any) {
        console.error("VS Code login error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}