// /api/github/get-account-info/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getInstallationAccessToken } from '@/lib/github'; 
import { adminDb, adminAuth } from '@/lib/firebase-admin';

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

        const settingsRef = adminDb.collection('users').doc(userId).collection('settings').doc('github');
        const settingsDoc = await settingsRef.get();
        const installationId = settingsDoc.data()?.installationId;

        if (!installationId) {
            return NextResponse.json({ error: 'GitHub App not installed' }, { status: 400 });
        }

        const accessToken = await getInstallationAccessToken(installationId);

        const repoResponse = await fetch('https://api.github.com/installation/repositories', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });

        if (!repoResponse.ok) throw new Error('Failed to fetch installation data from GitHub.');
        
        const data = await repoResponse.json();
        if (!data.repositories || data.repositories.length === 0) {
            return NextResponse.json({ error: 'No repositories accessible' }, { status: 404 });
        }
        
        const owner = data.repositories[0].owner;
        const accountInfo = {
            githubUsername: owner.login,
            githubAvatarUrl: owner.avatar_url,
        };

        // Simpan info ini ke Firestore agar tidak perlu fetch lagi
        await settingsRef.update(accountInfo);

        return NextResponse.json(accountInfo);

    } catch (error: any) {
        console.error("Error fetching GitHub account info:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}