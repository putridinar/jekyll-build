// src/app/pricing/page.tsx
'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CheckCircle, Crown, Loader2, Star } from 'lucide-react';
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import type { OnApproveData, CreateSubscriptionActions } from "@paypal/paypal-js";
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Icons } from '@/components/icons';

const isSandbox = process.env.NEXT_PUBLIC_PAYPAL_SANDBOX_ENABLED === 'true';
const PAYPAL_PLAN_ID = isSandbox
  ? process.env.NEXT_PUBLIC_PAYPAL_SANDBOX_PLAN_ID
  : process.env.NEXT_PUBLIC_PAYPAL_LIVE_PLAN_ID;
const PAYPAL_CLIENT_ID = isSandbox
    ? process.env.NEXT_PUBLIC_PAYPAL_SANDBOX_CLIENT_ID
    : process.env.NEXT_PUBLIC_PAYPAL_LIVE_CLIENT_ID;

const freeFeatures = [
    '1 Workspace',
    'Edit and Manage Files',
    'Direct GitHub Push',
    'Limited AI Generations (5 per day)',
];

const proFeatures = [
    'Unlimited Workspaces',
    'AI Code Completion (Mini-Copilot)',
    'AI Code Fixer',
    'Unlimited AI Component Generation',
    'Unlimited AI Image Generation',
    'Unlimited AI Post Generation',
    'Priority Support',
];

export default function PricingPage() {
    const { user, loading, refreshUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const createSubscription = (data: Record<string, unknown>, actions: CreateSubscriptionActions) => {
        if (!user) {
            toast({ title: "Authentication Error", description: "You must be logged in to subscribe.", variant: "destructive" });
            router.push('/login');
            return Promise.reject(new Error("User not logged in"));
        }
        if (!PAYPAL_PLAN_ID) {
            toast({ title: "Configuration Error", description: "Subscription plan not configured.", variant: "destructive" });
            return Promise.reject(new Error("Plan not configured"));
        }
        setError(null);
        return actions.subscription.create({
            plan_id: PAYPAL_PLAN_ID,
            custom_id: user.uid
        });
    };

    const onApprove = async (data: OnApproveData) => {
        setIsProcessing(true);
        toast({
            title: "Payment Successful!",
            description: "Activating your Pro subscription, please wait...",
        });

        try {
            await fetch('/api/paypal/capture-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderID: data.orderID,
                    subscriptionID: data.subscriptionID,
                    payerID: data.payerID,
                }),
            });
            await refreshUser();
            toast({
                title: "Upgrade Complete!",
                description: "Welcome to the Pro plan! Redirecting you to the dashboard.",
            });
            router.push('/dashboard');
        } catch (e: any) {
            toast({
                title: "Sync Error",
                description: "Could not sync your new role. Please refresh.",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const onError = (err: any) => {
        const message = err.message || "An unknown error occurred with PayPal.";
        setError(message);
        toast({ title: "Payment Error", description: message, variant: "destructive" });
        setIsProcessing(false);
    };

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg shadow-md">
                <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link href="/" className="flex gap-1 items-center text-2xl font-bold text-indigo-600 tracking-tight">
                        <Icons.logo className="h-8 w-8" />Jekyll Buildr
                    </Link> 
                    <div>
                        {loading ? null : user ? (
                            <Button variant="outline" onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
                        ) : (
                            <Button onClick={() => router.push('/login')}>Sign In</Button>
                        )}
                    </div>
                </div>
                </nav>
            </header>

    <div className="fixed top-0 inset-0 bg-gradient-to-bl from-gray-500 via-gray-700 to-transparent"></div>
            <main className="flex-1 pt-24 pb-16">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight font-headline opacity-90">
                        Choose Your Plan
                    </h1>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground opacity-90">
                        Start for free, and unlock powerful AI features when you're ready to level up.
                    </p>

                    <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* Free Plan Card */}
                        <Card className="text-left h-[570px] flex flex-grow flex-col opacity-90">
                            <CardHeader>
                                <CardTitle className="text-2xl font-bold">Free</CardTitle>
                                <CardDescription>Perfect for getting started and personal projects.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-4xl font-bold">$0<span className="text-lg font-normal text-muted-foreground">/month</span></p>
                                <ul className="space-y-2">
                                    {freeFeatures.map(feature => (
                                        <li key={feature} className="flex items-center gap-2">
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                            <span className="text-muted-foreground">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter className='flex-grow items-end'>
                                <Button className="w-full" variant="outline" onClick={() => router.push('/login')}>
                                    Get Started
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Pro Plan Card */}
                        <Card className="text-left h-[570px] flex flex-grow flex-col border-2 border-primary shadow-lg shadow-primary/20 opacity-90">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-2xl font-bold">Pro</CardTitle>
                                    <div className="flex items-center gap-2 text-sm font-bold text-primary">
                                        <Star className="h-5 w-5" /> Most Popular
                                    </div>
                                </div>
                                <CardDescription>For professionals who need the best tools and unlimited AI.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-4xl font-bold">$9.99<span className="text-lg font-normal text-muted-foreground">/month</span></p>
                                <ul className="space-y-2">
                                    {proFeatures.map(feature => (
                                        <li key={feature} className="flex items-center gap-2">
                                            <CheckCircle className="h-5 w-5 text-primary" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                {user?.role === 'proUser' ? (
                                     <Button className="w-full" disabled>You are already a Pro</Button>
                                ) : (
                                    <div className="w-full">
                                        {isProcessing ? (
                                            <Button className="w-full" disabled>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Processing...
                                            </Button>
                                        ) : (
                                            <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID!, components: 'buttons', intent: 'subscription', vault: true }}>
                                                <PayPalButtons
                                                    style={{ layout: "vertical", color: 'white', shape: "rect", label: "subscribe" }}
                                                    createSubscription={createSubscription}
                                                    onApprove={onApprove}
                                                    onError={onError}
                                                    disabled={isProcessing || !user || !PAYPAL_PLAN_ID}
                                                />
                                            </PayPalScriptProvider>
                                        )}
                                        {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
                                    </div>
                                )}
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}