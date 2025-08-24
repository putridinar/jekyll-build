// src/app/api/verifyUser/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin'; // Impor setup admin

export async function POST(request: NextRequest) {
    console.log("API /api/verifyUser endpoint was hit!");
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized: No token provided.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];

    try {
        if (!adminAuth || !adminDb) {
            throw new Error("Firebase Admin SDK not initialized on the server.");
        }

        // 2. Verifikasi token menggunakan Firebase Admin
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // 3. Cek 'role' pengguna di Firestore
        const userDoc = await adminDb.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found in Firestore.' }, { status: 404 });
        }

        const userData = userDoc.data();
        const isPro = userData?.role === 'proUser';

        // 4. Kirim balik respons JSON yang valid
        return NextResponse.json({ isPro: isPro });

    } catch (error) {
        console.error("Error in verifyUser API:", error);
        return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
    }
}