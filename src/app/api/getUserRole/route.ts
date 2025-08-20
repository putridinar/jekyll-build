// src/app/api/getUserRole/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];

    try {
        if (!adminAuth || !adminDb) {
            throw new Error("Firebase Admin SDK not initialized.");
        }
        
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid; // Kita gunakan UID dari token yang sudah diverifikasi

        const userDoc = await adminDb.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        
        const role = userDoc.data()?.role || 'freeUser';
        const displayName = userDoc.data()?.displayName || 'User';

        return NextResponse.json({ role, displayName });

    } catch (error) {
        console.error("Get User Role Error:", error);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
}