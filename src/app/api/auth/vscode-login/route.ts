// src/app/api/auth/vscode-login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

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
        const role = 'freeUser';

        let uid: string;

        // 2. Cari di Firestore, adakah user yang sudah punya githubId ini?
        const usersRef = adminDb.collection('users');
        const query = usersRef.where('githubId', '==', githubId);
        const querySnapshot = await query.get();

        if (!querySnapshot.empty) {
            // DITEMUKAN! User ini sudah pernah login sebelumnya.
            // Gunakan UID yang sudah ada dari dokumen tersebut.
            const existingUserDoc = querySnapshot.docs[0];
            uid = existingUserDoc.id; // ID dokumen adalah UID Firebase Auth
            console.log(`[API-LOG] User found in Firestore by githubId. UID: ${uid}`);
        } else {
            // TIDAK DITEMUKAN. Ini adalah login pertama dari VS Code untuk user ini.
            // Kita akan buat user baru di Firebase Authentication untuk mendapatkan UID resmi.
            console.log(`[API-LOG] User not found by githubId. Creating new user in Firebase Auth...`);
            
            // Coba buat user. Jika email sudah ada, Firebase akan error, dan kita tangkap di blok catch.
            const newUserRecord = await adminAuth.createUser({
                displayName: displayName,
                photoURL: photoURL,
                email: email || undefined, // Email bisa jadi null, tidak masalah
                emailVerified: email ? true : false,
            });
            uid = newUserRecord.uid;
        }
        
        // 3. Sekarang kita punya UID yang pasti dan tunggal. Buat/Update dokumen di Firestore.
        const userDocRef = adminDb.collection('users').doc(uid);
        await userDocRef.set({
            uid: uid,
            githubId: githubId, // WAJIB: simpan githubId sebagai "jembatan"
            email: email,
            displayName: displayName,
            photoURL: photoURL,
            role: role,
        }, { merge: true }); // Gunakan merge untuk jaga data lama seperti 'role'

        // 4. Buat Custom Token dengan UID yang sudah terunifikasi
        const firebaseCustomToken = await adminAuth.createCustomToken(uid);
        
        return NextResponse.json({ firebaseCustomToken });

    } catch (error: any) {
        // Tangani kasus di mana user sudah ada di Firebase Auth (dibuat dari web) tapi belum punya githubId
        if (error.code === 'auth/email-already-exists' && error.email) {
            console.log(`[API-LOG] Email already exists. Linking githubId to existing user.`);
            const user = await adminAuth.getUserByEmail(error.email);
            const uid = user.uid;
            
            // Tambahkan githubId ke user yang sudah ada
            const githubResponse = await fetch('https://api.github.com/user', {
                headers: { 'Authorization': `Bearer ${githubToken}` },
            });
            const githubUserData = await githubResponse.json();
            const githubId = githubUserData.id.toString();

            await adminDb.collection('users').doc(uid).update({ githubId: githubId });
            
            const firebaseCustomToken = await adminAuth.createCustomToken(uid);
            return NextResponse.json({ firebaseCustomToken });
        }
        
        console.error("VS Code login error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}