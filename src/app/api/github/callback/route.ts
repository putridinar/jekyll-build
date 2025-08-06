
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

// Fungsi pembantu untuk mendapatkan UID pengguna saat ini dari cookie sesi
async function getUserId() {
    if (!adminAuth) throw new Error('Firebase Admin not initialized');
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;
    if (!sessionCookie) {
        throw new Error('Not authenticated. Please log in.');
    }
    try {
        // Kami tidak memeriksa pencabutan di sini, hanya bahwa sesi itu valid.
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, false);
        return decodedClaims.uid;
    } catch (error) {
        console.error("Kesalahan memverifikasi cookie sesi di callback:", error);
        throw new Error('Sesi kedaluwarsa atau tidak valid. Harap masuk lagi.');
    }
}

/**
 * Menangani callback dari GitHub setelah pengguna menginstal Aplikasi GitHub.
 * Ini mengharapkan `installation_id` di parameter kueri.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get('installation_id');

  const redirectUrl = new URL('/settings', request.url);

  // Jika tidak ada ID instalasi, kemungkinan itu adalah pembatalan atau tindakan yang tidak relevan.
  // Alih-alih menampilkan kesalahan, kami hanya mengarahkan kembali ke halaman pengaturan.
  if (!installationId) {
    redirectUrl.searchParams.set('status', 'info');
    redirectUrl.searchParams.set('message', 'Penyiapan GitHub tidak selesai.');
    return NextResponse.redirect(redirectUrl);
  }

  // Jika kami memiliki ID instalasi, kami melanjutkan dengan menyimpannya.
  try {
    const userId = await getUserId();
    if (!adminDb) throw new Error('Firebase Admin tidak diinisialisasi');

    const settingsRef = adminDb.collection('users').doc(userId).collection('settings').doc('github');
    
    await settingsRef.set({ 
      installationId: installationId,
    }, { merge: true });

    console.log(`ID instalasi Aplikasi GitHub ${installationId} disimpan untuk pengguna ${userId}.`);

    // Arahkan pengguna kembali ke halaman pengaturan dengan pesan sukses.
    redirectUrl.searchParams.set('status', 'success');
    redirectUrl.searchParams.set('message', 'Aplikasi GitHub berhasil terhubung!');
    return NextResponse.redirect(redirectUrl);

  } catch (error: any) {
    console.error("Kesalahan memproses callback instalasi GitHub: ", error);
    redirectUrl.searchParams.set('status', 'error');
    redirectUrl.searchParams.set('message', error.message || 'Terjadi kesalahan tidak dikenal selama penyiapan.');
    return NextResponse.redirect(redirectUrl);
  }
}
