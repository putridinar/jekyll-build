'use client';

import { auth } from '@/lib/firebase';
import { GithubAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { useState } from 'react';
import { createSessionCookie, initializeUser } from '@/actions/user';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Github } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLoginSuccess = async (user: User) => {
        try {
            // Inisialisasi pengguna di Firestore jika mereka tidak ada
            await initializeUser({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
            });

            // Dapatkan token ID dan buat cookie sesi
            const idToken = await user.getIdToken(true);
            const sessionResult = await createSessionCookie(idToken);

            if (sessionResult.success) {
                // Arahkan ke halaman utama setelah pembuatan sesi berhasil
                router.push('/');
            } else {
                setError(sessionResult.error || 'Gagal membuat sesi.');
                setLoading(false);
            }
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan tak terduga selama pengaturan login.');
            setLoading(false);
        }
    };
    
    const handleGithubSignIn = async () => {
        setLoading(true);
        setError(null);
        const provider = new GithubAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            // Pendengar onAuthStateChanged di AuthProvider akan menangani pengalihan.
            // Tapi kami masih memanggil penangan keberhasilan kami untuk memastikan pengguna diinisialisasi dan sesi dibuat.
            await handleLoginSuccess(result.user);
        } catch (error: any)
{
            // Hindari menampilkan kesalahan generik "pengguna menutup popup"
            if (error.code !== 'auth/popup-closed-by-user') {
                 console.error("Kesalahan Masuk GitHub:", error);
                setError(error.message || 'Gagal masuk dengan GitHub.');
            }
            setLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <Card className="w-full max-w-sm bg-[#3d444d]">
                <CardHeader className="text-center">
                     <div className="flex justify-center mb-4">
                        <Icons.logo className="h-10 w-10"/>
                    </div>
                    <CardTitle className="font-headline text-2xl">Welcome to Jekyll Buildr</CardTitle>
                    <CardDescription>The modern way to build Jekyll sites.</CardDescription>
                </CardHeader>
                <CardContent>
                    {error && <p className="text-destructive text-center text-sm mb-4">{error}</p>}
                    <Button onClick={handleGithubSignIn} className="w-full bg-[#0d1117] hover:bg-[#212830]" disabled={loading}>
                        {loading ? 'Signing in...' : (
                            <>
                                <Github className="mr-2 h-4 w-4" />
                                Sign in with GitHub
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </main>
    );
}
