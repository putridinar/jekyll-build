import admin from 'firebase-admin';

// Periksa apakah variabel lingkungan yang diperlukan sudah diatur.
const hasAdminConfig = 
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY;

// Cara yang kuat untuk menginisialisasi Firebase Admin SDK, terutama untuk lingkungan Next.js dengan hot-reloading.
if (hasAdminConfig && !admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
    console.log('Firebase Admin SDK berhasil diinisialisasi.');
  } catch (error: any) {
    console.error('Kesalahan inisialisasi Firebase Admin:', error.stack);
  }
}

// Ini sekarang dijamin tersedia jika inisialisasi berhasil.
const adminDb = admin.apps.length ? admin.firestore() : null;
const adminAuth = admin.apps.length ? admin.auth() : null;

// Tambahkan pemeriksaan untuk memperingatkan jika DB tidak diinisialisasi, yang merupakan akar penyebab semua masalah.
if (!adminDb) {
  console.warn(
    'Firebase Admin DB tidak diinisialisasi. Semua operasi Firestore akan gagal. ' +
    'Silakan periksa file .env.local Anda dan mulai ulang server.'
  );
}

export { adminDb, adminAuth };
