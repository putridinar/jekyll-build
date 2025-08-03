
'use client';

import { useActionState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, CreditCard, Loader2 } from 'lucide-react';
import { createPaypalSubscription } from '@/firebase/actions';
import { useToast } from '@/hooks/use-toast';

const freeFeatures = [
    'Web-based Content Editor',
    'Jekyll-compatible Conversion',
    'Manual GitHub Commits',
    'Community Support',
];

const proFeatures = [
    'All features in Free',
    'AI-Powered Draft Generation',
    'AI Content Idea Suggestions',
    'Direct GitHub Integration',
    'Priority Support',
];

const initialPaypalState = { error: '', link: '' };

export default function PricingPage() {
    return (
        <div className="flex flex-col items-center">
            <div className="text-center mb-12 max-w-2xl">
                <h1 className="text-4xl lg:text-5xl font-extrabold font-headline tracking-tight">
                    Find the perfect plan
                </h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    Start for free and scale up as you grow. Our Pro plan unlocks powerful AI features to boost your productivity.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                <PricingCard
                    title="Free"
                    price="$0"
                    period="/ month"
                    description="For individuals and hobbyists starting out with Jekyll."
                    features={freeFeatures}
                    buttonText="Continue with Free"
                    buttonVariant="outline"
                />
                <PricingCard
                    title="Pro"
                    price="$19"
                    period="/ month"
                    description="For professionals and teams who want to create content faster."
                    features={proFeatures}
                    buttonText="Subscribe with PayPal"
                    buttonVariant="default"
                    isFeatured={true}
                    planId={process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID || 'YOUR_PRO_PLAN_ID'}
                />
            </div>
        </div>
    );
}

function PricingCard({ title, price, period, description, features, buttonText, buttonVariant, isFeatured, planId }: {
    title: string;
    price: string;
    period: string;
    description: string;
    features: string[];
    buttonText: string;
    buttonVariant: 'default' | 'outline';
    isFeatured?: boolean;
    planId?: string;
}) {
    const { toast } = useToast();
    const [state, formAction, isPending] = useActionState(createPaypalSubscription, initialPaypalState);
    
    useEffect(() => {
        if (state.error) {
            toast({
                title: 'Subscription Error',
                description: state.error,
                variant: 'destructive'
            });
        }
    }, [state, toast]);

    return (
        <Card className={isFeatured ? 'border-primary shadow-2xl relative' : 'shadow-lg'}>
            {isFeatured && <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center"><div className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-1 rounded-full">Most Popular</div></div>}
            <CardHeader className="text-center">
                <CardTitle className="text-2xl font-headline">{title}</CardTitle>
                <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extrabold tracking-tight">{price}</span>
                    <span className="text-muted-foreground">{period}</span>
                </div>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
                <ul className="space-y-3">
                    {features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                            <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter>
                 {planId ? (
                    <form action={formAction} className="w-full">
                        <input type="hidden" name="planId" value={planId} />
                         <Button type="submit" className="w-full" variant={buttonVariant} disabled={isPending}>
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Redirecting to PayPal...
                                </>
                            ): (
                                <>
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    {buttonText}
                                </>
                            )}
                        </Button>
                    </form>
                ) : (
                    <Button className="w-full" variant={buttonVariant}>
                        {buttonText}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}

    