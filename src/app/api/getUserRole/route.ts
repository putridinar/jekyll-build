// src/app/api/getUserRole/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    if (!adminAuth || !adminDb) {
        console.error("Firebase Admin SDK not initialized.");
        return NextResponse.json({ error: "Firebase Admin not configured on the server." }, { status: 500 });
    }
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        console.log(`[API-LOG] Verifying role for UID: ${uid}`); // Log 1

        const userDoc = await adminDb.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            console.log(`[API-LOG] User document for UID: ${uid} does not exist.`); // Log 2
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        
        const userData = userDoc.data();
        console.log('[API-LOG] Fetched user data from Firestore:', userData); // Log 3 (Paling Penting)

        const role = userData?.role || 'freeUser';
        const displayName = userData?.displayName || 'User';

        console.log(`[API-LOG] Determined role: '${role}' for user: '${displayName}'. Sending response.`); // Log 4

        return NextResponse.json({ role, displayName });

    } catch (error) {
        console.error("[API-LOG] Error in getUserRole:", error);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
}