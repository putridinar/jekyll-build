// /api/github/get-branches/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getRepoBranches } from '@/lib/github';

export async function GET(request: NextRequest) {
    try {
        if (!adminAuth || !adminDb) {
            throw new Error('Firebase Admin not initialized.');
        }

        // Mengambil owner dan repo dari URL search params
        const { searchParams } = new URL(request.url);
        const repoFullName = searchParams.get('repoFullName');
        
        if (!repoFullName) {
            return NextResponse.json({ error: 'Owner and repo are required.' }, { status: 400 });
        }

        const sessionCookie = request.cookies.get('__session')?.value || '';
        if (!sessionCookie) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
        const userId = decodedClaims.uid;
        
        const settingsRef = adminDb.collection('users').doc(userId).collection('settings').doc('github');
        const settingsDoc = await settingsRef.get();
        const installationId = settingsDoc.data()?.installationId;

        if (!installationId) {
            return NextResponse.json({ error: 'GitHub App not installed.' }, { status: 400 });
        }

        const branches = await getRepoBranches({ repoFullName, installationId });

        return NextResponse.json({ branches });

    } catch (error: any) {
        console.error("Error fetching branches:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
