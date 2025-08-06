// Lokasi: src/app/api/github/get-repos/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getInstallationAccessToken } from '@/lib/github'; 

export async function GET(request: NextRequest) {
    try {
        if (!adminAuth || !adminDb) {
            throw new Error('Firebase Admin not initialized.');
        }

        const sessionCookie = request.cookies.get('__session')?.value || '';
        if (!sessionCookie) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
        const userId = decodedClaims.uid;

        // ✅ MEMBACA DARI LOKASI YANG BENAR
        const settingsRef = adminDb.collection('users').doc(userId).collection('settings').doc('github');
        const settingsDoc = await settingsRef.get();
        const installationId = settingsDoc.data()?.installationId;

        if (!installationId) {
            return NextResponse.json({ error: 'GitHub App not installed for this user.' }, { status: 400 });
        }

        const accessToken = await getInstallationAccessToken(installationId);

        const repoResponse = await fetch('https://api.github.com/installation/repositories', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });

        if (!repoResponse.ok) {
            const errorData = await repoResponse.json();
            throw new Error(errorData.message || 'Failed to fetch repositories from GitHub.');
        }

        const data = await repoResponse.json();
        const repositories = data.repositories.map((repo: any) => repo.full_name);

        return NextResponse.json({ repositories });

    } catch (error: any) {
        console.error("Error in /api/github/get-repos:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}