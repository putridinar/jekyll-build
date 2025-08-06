
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import * as crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Memverifikasi tanda tangan dari permintaan webhook yang masuk.
 * @param request Permintaan NextRequest yang masuk.
 * @param secret Rahasia webhook dari variabel lingkungan.
 * @returns Teks isi permintaan mentah jika verifikasi berhasil.
 * @throws Kesalahan jika tanda tangan tidak valid atau hilang.
 */
async function verifySignature(request: NextRequest, secret: string): Promise<string> {
    const signature = request.headers.get('x-hub-signature-256');
    if (!signature) {
        throw new Error('No signature found on request');
    }

    const bodyText = await request.text();
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(bodyText, 'utf-8');
    const expectedSignature = `sha256=${hmac.digest('hex')}`;

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        throw new Error('Invalid signature');
    }

    return bodyText;
}

/**
 * Menangani webhook masuk dari GitHub.
 * Secara khusus mendengarkan event 'installation' dengan tindakan 'deleted'
 * untuk membersihkan ID instalasi dari Firestore ketika pengguna menghapus instalasi aplikasi.
 */
export async function POST(request: NextRequest) {
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error('GITHUB_WEBHOOK_SECRET is not set.');
        return new NextResponse('Webhook secret not configured', { status: 500 });
    }

    try {
        const rawBody = await verifySignature(request, webhookSecret);
        const payload = JSON.parse(rawBody);
        const event = request.headers.get('x-github-event');

        if (!adminDb) throw new Error('Firebase Admin not initialized');

        // LOGIKA UNTUK INSTALASI BARU
        if (event === 'installation' && payload.action === 'created') {
            const installationId = payload.installation.id.toString();
            const account = payload.installation.account;
            
            console.log(`Webhook 'created': Mencari dokumen dengan installationId: ${installationId}`);

            // 1. Cari dokumen settings yang cocok dengan installationId
            const settingsQuery = adminDb.collectionGroup('settings').where('installationId', '==', installationId);
            const querySnapshot = await settingsQuery.get();

            if (!querySnapshot.empty) {
                // 2. Jika ketemu, PERBARUI dokumen itu dengan info username dan avatar
                const doc = querySnapshot.docs[0];
                console.log(`Webhook 'created': Menambahkan data ke ${doc.ref.path}`);
                await doc.ref.update({
                    githubUsername: account.login,
                    githubAvatarUrl: account.avatar_url,
                    githubAccountId: account.id.toString(),
                });
                console.log(`Webhook 'created': Sukses memperbarui data untuk ${account.login}.`);
            } else {
                 console.warn(`Webhook 'created': Tidak ada user yang cocok untuk installationId ${installationId}. Mungkin callback sedikit tertunda.`);
            }
        }

        // LOGIKA UNTUK UNINSTALL
        if (event === 'installation' && payload.action === 'deleted') {
            const installationId = payload.installation.id.toString();
            console.log(`Webhook 'deleted': Mencari dokumen dengan installationId: ${installationId}`);
            
            const settingsQuery = adminDb.collectionGroup('settings').where('installationId', '==', installationId);
            const querySnapshot = await settingsQuery.get();

            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                console.log(`Webhook 'deleted': Menghapus dokumen di ${doc.ref.path}`);
                await doc.ref.delete();
            }
        }

        return new NextResponse('Webhook received', { status: 200 });

    } catch (error: any) {
        console.error(`Webhook Error: ${error.message}`);
        // Untuk kesalahan tanda tangan, kami mengirim respons 401 Tidak Sah.
        if (error.message.toLowerCase().includes('signature')) {
            return new NextResponse(error.message, { status: 401 });
        }
        // Untuk kesalahan lain, 400 Permintaan Buruk lebih tepat.
        return new NextResponse(error.message, { status: 400 });
    }
}
