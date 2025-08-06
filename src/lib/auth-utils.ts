'use server';

import { adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

// Fungsi pembantu untuk mendapatkan UID pengguna saat ini dari cookie sesi
export async function getUserId() {
    if (!adminAuth) throw new Error('Firebase Admin not initialized');
    const cookieStore = cookies();
    const sessionCookie = (await cookieStore).get('__session')?.value;
    if (!sessionCookie) {
        throw new Error('Not authenticated. No session cookie found.');
    }
    try {
        // Kembalikan checkRevoked ke true untuk keamanan yang lebih baik dan tangani potensi kesalahan dengan baik.
        // Sesi yang dicabut akan ditangkap di sini, mencegah tindakan yang tidak sah.
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
        return decodedClaims.uid;
    } catch (error) {
        console.error("Kesalahan memverifikasi cookie sesi, kemungkinan dicabut atau kedaluwarsa:", error);
        // Ini memberikan pesan kesalahan yang lebih jelas dan konsisten saat cookie tidak valid.
        throw new Error('Sesi kedaluwarsa atau tidak valid. Silakan masuk lagi.');
    }
}
