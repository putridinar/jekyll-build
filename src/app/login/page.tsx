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
            // Initialize user in Firestore if they don't exist
            await initializeUser({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
            });

            // Get ID token and create session cookie
            const idToken = await user.getIdToken(true);
            const sessionResult = await createSessionCookie(idToken);

            if (sessionResult.success) {
                // Redirect to the main page after successful session creation
                router.push('/dashboard');
            } else {
                setError(sessionResult.error || 'Failed to create session.');
                setLoading(false);
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred during login setup.');
            setLoading(false);
        }
    };
    
    const handleGithubSignIn = async () => {
        setLoading(true);
        setError(null);
        const provider = new GithubAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            // The onAuthStateChanged listener in AuthProvider will handle the redirect.
            // But we still call our success handler to ensure the user is initialized and a session is created.
            await handleLoginSuccess(result.user);
        } catch (error: any)
{
            // Avoid showing the generic "user closed popup" error
            if (error.code !== 'auth/popup-closed-by-user') {
                 console.error("GitHub Sign-In Error:", error);
                setError(error.message || 'Failed to sign in with GitHub.');
            }
            setLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
    <div className="fixed top-0 inset-0 bg-gradient-to-bl from-gray-500 via-gray-700 to-transparent"></div>
            <Card className="w-full max-w-sm dark:bg-[#3d444d] opacity-90">
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
