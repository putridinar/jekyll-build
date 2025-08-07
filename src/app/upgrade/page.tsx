'use client';

import * as React from 'react';
import { AppHeader } from '@/components/app/header';
import { AppFooter } from '@/components/app/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { useAuth } from '@/components/app/auth-provider';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const proFeatures = [
    'Unlimited file creation',
    'AI-powered component generation',
    'AI-powered image generation',
    'Publish to private repositories',
    'Priority support',
];

export default function UpgradePage() {
    const { user, loading, refreshUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = React.useState(false);

    React.useEffect(() => {
        if (!loading && user?.role === 'proUser') {
            router.push('/');
        }
    }, [user, loading, router]);
    
    const handleSubscription = async () => {
        setIsProcessing(true);
        toast({ title: "Menginisialisasi pembayaran aman..." });
        
        try {
            // Langkah 1: Buat langganan baru di server Anda
            const subResponse = await fetch('/api/paypal/create-subscription', { method: 'POST' });
            if (!subResponse.ok) {
                const errorData = await subResponse.json();
                throw new Error(errorData.error || 'Gagal membuat langganan.');
            }
            const subData = await subResponse.json();

            // Langkah 2: Arahkan ke URL persetujuan PayPal
            // Temukan tautan persetujuan dari respons
            const approvalLink = subData.links.find((link: any) => link.rel === 'approve');
            if (approvalLink) {
                 window.location.href = approvalLink.href;
            } else {
                 throw new Error('Tidak dapat menemukan URL persetujuan PayPal.');
            }

        } catch (error: any) {
            console.error("Kesalahan Langganan:", error);
            toast({
                title: 'Langganan Gagal',
                description: error.message,
                variant: 'destructive',
            });
            setIsProcessing(false);
        }
    };


    if (loading || !user) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin" />
            </div>
        );
    }
    
    if (user.role === 'proUser') {
        return null; // Pengalihan ditangani oleh useEffect
    }

    return (
        <>
        <div className="flex min-h-screen flex-col">
            <AppHeader />
            <main className="flex-1 px-3 bg-muted/20">
                <div className="container mx-auto max-w-3xl py-12">
                    <div className="text-center mb-4">
                        <p className="mt-2 text-lg text-muted-foreground">Unlock powerful features and take your creativity to the next level.</p>
                    </div>

                    <div className="flex justify-center">
                        <Card className="w-full max-w-md shadow-lg">
                            <CardHeader className="text-center bg-background/50 p-4">
                                <CardTitle className="text-3xl font-headline">Pro Plan</CardTitle>
                                <CardDescription className="text-xl text-muted-foreground">$9.99 / month</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8">
                                <ul className="space-y-4">
                                    {proFeatures.map((feature) => (
                                        <li key={feature} className="flex items-center">
                                            <Check className="h-5 w-5 text-accent mr-3 flex-shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" size="lg" onClick={handleSubscription} disabled={isProcessing}>
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : 'Upgrade Now'}
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </main>
            <AppFooter isPublishing={false} isCreatingPr={false} />
        </div>
        </>
    );
}
