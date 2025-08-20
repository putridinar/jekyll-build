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
        // 1. Get user info from GitHub
        const githubResponse = await fetch('https://api.github.com/user', {
            headers: { 'Authorization': `Bearer ${githubToken}` },
        });
        if (!githubResponse.ok) throw new Error('Failed to fetch user from GitHub.');
        
        const githubUser = await githubResponse.json();
        const githubId = githubUser.id.toString();
        const email = githubUser.email;
        
        let userRecord: any = null;
        let finalUid: string | null = null;

        // 2. Try to find user by githubId first
        const userQueryByGithubId = adminDb.collection('users').where('githubId', '==', githubId);
        const githubIdQuerySnapshot = await userQueryByGithubId.get();

        if (!githubIdQuerySnapshot.empty) {
            // User found by githubId
            const userDoc = githubIdQuerySnapshot.docs[0];
            userRecord = userDoc.data();
            finalUid = userDoc.id;
        } 
        // 3. If not found, try to find by email
        else if (email) {
            const userQueryByEmail = adminDb.collection('users').where('email', '==', email);
            const emailQuerySnapshot = await userQueryByEmail.get();

            if (!emailQuerySnapshot.empty) {
                // User found by email, link githubId
                const userDoc = emailQuerySnapshot.docs[0];
                userRecord = userDoc.data();
                finalUid = userDoc.id;
                
                // Add githubId to existing user for future logins
                await userDoc.ref.update({ githubId: githubId });
            }
        }

        // 4. If still no user record, create a new user
        if (!userRecord) { // Use githubId as the UID for the new user
            const newUserRef = adminDb.collection('users').doc(githubId);
            
            const newUser = {
                uid: finalUid,
                email: email,
                displayName: githubUser.name || githubUser.login,
                photoURL: githubUser.avatar_url,
                role: 'freeUser',
                createdAt: FieldValue.serverTimestamp(),
                githubId: githubId,
            };
            finalUid = githubId;
            
            await newUserRef.set(newUser);
            userRecord = newUser;
        }
        
        // 5. Create Custom Token using the correct finalUid
        if (!finalUid) {
            throw new Error("Could not determine a user ID for authentication.");
        }
        const firebaseCustomToken = await adminAuth.createCustomToken(finalUid!);
        
        return NextResponse.json({ firebaseCustomToken });

    } catch (error: any) {
        console.error("VS Code login error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
