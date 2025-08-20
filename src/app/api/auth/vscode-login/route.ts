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
        const email = githubUser.email; // Bisa jadi null
        const displayName = githubUser.name || githubUser.login;
        const photoURL = githubUser.avatar_url;

        let uid: string;

        try {
            // 2. Cari user di Firebase Auth berdasarkan UID = githubId
            // Ini akan menemukan user yang dibuat oleh alur VS Code sebelumnya.
            const userRecord = await adminAuth.getUser(githubId);
            uid = userRecord.uid;
            console.log(`[API-LOG] User found directly in Auth by UID. UID: ${uid}`);
        } catch (error: any) {
            // Jika user tidak ditemukan, error 'auth/user-not-found' akan muncul. Kita lanjutkan.
            if (error.code !== 'auth/user-not-found') {
                throw error; // Lemparkan error lain yang tidak terduga
            }

            // 3. Jika tidak ketemu di Auth, cari di Firestore berdasarkan field 'githubId'
            console.log(`[API-LOG] User not in Auth, querying Firestore for githubId: ${githubId}`);
            const query = adminDb.collection('users').where('githubId', '==', githubId);
            const querySnapshot = await query.get();

            if (!querySnapshot.empty) {
                // User ditemukan di Firestore, berarti dibuat dari Web App dan sudah pernah login dari VS Code
                uid = querySnapshot.docs[0].id;
                console.log(`[API-LOG] User found in Firestore by githubId field. UID: ${uid}`);
            } else {
                // 4. Benar-benar user baru untuk alur VS Code. Buat user baru di Auth & Firestore.
                console.log(`[API-LOG] User not found anywhere. Creating new user in Auth & Firestore with UID = githubId.`);
                
                // Firebase Auth tidak mengizinkan UID kustom saat membuat user.
                // Jadi, kita akan tetap menggunakan UID yang digenerate Firebase, TAPI kita jadikan githubId sebagai penghubung utama.
                // Cara terbaik adalah dengan mencari berdasarkan email (jika ada), atau membuat user baru.
                
                let userRecord;
                if (email) {
                    try {
                        userRecord = await adminAuth.getUserByEmail(email);
                    } catch (e: any) {
                        if (e.code !== 'auth/user-not-found') throw e;
                    }
                }

                if (userRecord) {
                    uid = userRecord.uid;
                } else {
                    const newUser = await adminAuth.createUser({
                        displayName: displayName,
                        photoURL: photoURL,
                        email: email || null,
                    });
                    uid = newUser.uid;
                }
            }
        }
        
        // 5. Update/buat dokumen di Firestore menggunakan UID yang benar
        const userDocRef = adminDb.collection('users').doc(uid);
        await userDocRef.set({
            uid: uid,
            email: email,
            displayName: displayName,
            photoURL: photoURL,
            githubId: githubId, // Selalu simpan/update githubId sebagai penghubung
            role: (await userDocRef.get()).data()?.role || 'freeUser',
        }, { merge: true });

        // 6. Buat Custom Token
        const firebaseCustomToken = await adminAuth.createCustomToken(uid);
        
        return NextResponse.json({ firebaseCustomToken });

    } catch (error: any) {
        console.error("VS Code login error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}