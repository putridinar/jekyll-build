
'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { PayPalButtons } from "@paypal/react-paypal-js";
import type { OnApproveData, CreateSubscriptionActions } from "@paypal/paypal-js";
import { string } from "zod";

type UpgradeModalProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
};

const ProFeatures = [
    'Unlimited file creation',
    'AI-powered component generation',
    'AI-powered image generation',
    'Publish to private repositories',
    'Priority support',
];

const PAYPAL_PLAN_ID = process.env.PAYPAL_SANDBOX_ENABLED === 'true'
  ? process.env.PAYPAL_SANDBOX_PLAN_ID
  : process.env.PAYPAL_LIVE_PLAN_ID;


export function UpgradeModal({ isOpen, onOpenChange }: UpgradeModalProps) {
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const createSubscription = (data: Record<string, unknown>, actions: CreateSubscriptionActions) => {
    if (!user) {
        const authError = "You must be logged in to subscribe.";
        setError(authError);
        toast({ title: "Authentication Error", description: authError, variant: "destructive" });
        return Promise.reject(new Error(authError));
    }
     if (!PAYPAL_PLAN_ID) {
        const planError = "PayPal subscription plan is not configured. Please contact support.";
        setError(planError);
        toast({ title: "Configuration Error", description: planError, variant: "destructive" });
        return Promise.reject(new Error(planError));
    }
    setError(null);
    return actions.subscription.create({
        plan_id: PAYPAL_PLAN_ID,
        custom_id: user.uid 
    });
  };

  const onApprove = async (data: OnApproveData) => {
    setIsProcessing(true);
    setError(null);
    toast({
        title: "Payment Successful!",
        description: "Your subscription is being activated. Please wait...",
    });

    setTimeout(async () => {
        try {
            await refreshUser(); 
            toast({
                title: "Upgrade Complete!",
                description: "Welcome to the Pro plan. Your new features are now unlocked.",
                duration: 5000,
            });
        } catch (e) {
             toast({
                title: "Sync Error",
                description: "Could not immediately sync your new role. Please try refreshing the page.",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
            onOpenChange(false);
        }
    }, 8000); 
  };

  const onError = (err: any) => {
    const message = err.message || "An unknown error occurred with PayPal.";
    setError(message);
    toast({
        title: "Payment Error",
        description: message,
        variant: "destructive"
    });
    setIsProcessing(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md rounded-md w-96 md:w-full h-[90%]">
            <DialogHeader className="text-center">
                <div className="mx-auto w-fit rounded-full bg-yellow-400/20 p-2 mb-2 text-yellow-500">
                    <Star className="h-6 w-6" />
                </div>
            <DialogTitle className="text-2xl text-center font-bold font-headline">Upgrade to Pro</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground text-center">
                Unlock all features and take your content creation to the next level.
            </DialogDescription>
            </DialogHeader>
            <div className="py-2">
                <ul className="space-y-2">
                    {ProFeatures.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                            <span className="text-muted-foreground">{feature}</span>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="text-center my-2">
                <p className="text-3xl font-bold">$9.99<span className="text-xs font-thin text-muted-foreground">/month</span></p>
                <Badge variant="outline" className="bg-yellow-400 text-xs text-black">Billed Monthly</Badge>
            </div>
            <DialogFooter className="flex-col items-center">
                {error && <p className="text-red-500 text-sm text-center mb-2">{error}</p>}
                <div className="min-h-[80px] w-full flex items-center justify-center">
                    {isProcessing ? (
                        <div className="flex flex-col justify-center items-center gap-2 text-center h-full">
                            <Loader2 className="animate-spin h-8 w-8 text-primary" />
                            <p className="text-muted-foreground">Finalizing your upgrade... <br/> Please wait, this window will close automatically.</p>
                        </div>
                    ) : (
                        <PayPalButtons
                            style={{ layout: "vertical", color: 'white', shape: "rect", label: "subscribe" }}
                            createSubscription={createSubscription}
                            onApprove={onApprove}
                            onError={onError}
                            disabled={isProcessing || !user || !PAYPAL_PLAN_ID}
                        />
                    )}
                </div>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}