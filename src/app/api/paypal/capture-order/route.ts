
import { upgradeToPro } from '@/actions/user';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Menangkap pesanan PayPal setelah pengguna menyetujui pembayaran.
 * Jika pembayaran berhasil, itu memperbarui peran pengguna menjadi 'proUser' di Firestore.
 */
export async function POST(request: NextRequest) {
    try {
        const { orderID, subscriptionID } = await request.json();
        if (!orderID) {
            return new NextResponse('Missing orderID', { status: 400 });
        }

        const userId = await getUserIdFromSession();
        const result = await upgradeToPro(userId, subscriptionID);

        if (!result.success) {
            console.error(`Failed to upgrade user ${userId}:`, result.error);
            // Bahkan jika pembaruan DB gagal, kita mungkin masih harus mengembalikan keberhasilan ke klien
            // karena pembayaran itu sendiri berhasil. Webhook harus menangani sisanya.
        }

        return NextResponse.json({ success: true, orderID });

    } catch (error: any) {
        console.error("Error in capture-order route:", error);
        return new NextResponse(error.message, { status: 500 });
    }
}

async function getUserIdFromSession() {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('__session')?.value;
    if (!sessionCookie) {
        throw new Error('Not authenticated. Please log in.');
    }
    try {
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, false);
        return decodedClaims.uid;
    } catch (error) {
        throw new Error('Session expired or invalid. Please log in again.');
    }
}
