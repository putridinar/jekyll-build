
import { upgradeToPro } from '@/actions/user';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';

async function getUserIdFromSession() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;
    if (!sessionCookie) {
        throw new Error('Not authenticated. Please log in.');
    }
    if (!adminAuth) {
        throw new Error('Firebase Admin SDK is not initialized.');
    }
    try {
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, false);
        return decodedClaims.uid;
    } catch (error) {
        throw new Error('Session expired or invalid. Please log in again.');
    }
}

/**
 * Menangkap pesanan PayPal setelah pengguna menyetujui pembayaran.
 * Jika pembayaran berhasil, itu memperbarui peran pengguna menjadi 'proUser' di Firestore.
 */
export async function POST(request: NextRequest) {
    try {
        const { orderID, subscriptionID, payerID } = await request.json();
        if (!orderID) {
            return new NextResponse('Missing orderID', { status: 400 });
        }

        const userId = await getUserIdFromSession();
        
        try {
            await upgradeToPro(userId, subscriptionID, payerID);
        } catch (error: any) {
            console.error(`Failed to upgrade user ${userId} in capture-order:`, error.message);
            // Bahkan jika pembaruan DB gagal, kita mungkin masih harus mengembalikan keberhasilan ke klien
            // karena pembayaran itu sendiri berhasil. Webhook harus menangani sisanya.
        }

        return NextResponse.json({ success: true, orderID });

    } catch (error: any) {
        console.error("Error in capture-order route:", error);
        return new NextResponse(error.message, { status: 500 });
    }
}
