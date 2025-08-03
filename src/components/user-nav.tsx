
'use client';

import Link from 'next/link';
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Crown, Github, LogOut, Settings, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { signInWithGithub, signOut } from '@/firebase/client-actions';
import { upsertUserInFirestore } from '@/firebase/actions';
import { useRouter } from 'next/navigation';

export function UserNav() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const handleSignIn = async () => {
        const result = await signInWithGithub();
        if (result.success && result.user) {
            // Now call the server action to save user data to Firestore
            await upsertUserInFirestore(result.user);
            router.push('/dashboard');
        } else {
            // Handle error, maybe show a toast
            console.error("Sign in failed", result.error);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    if (loading) {
        return <Loader2 className="h-6 w-6 animate-spin" />;
    }
    
    if (!user) {
        return (
            <Button onClick={handleSignIn}>
                <Github className="mr-2 h-4 w-4" />
                Login with GitHub
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.photoURL!} alt={user.displayName || 'User'} />
                        <AvatarFallback>{user.displayName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                     <DropdownMenuItem asChild>
                        <Link href="/dashboard">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/settings">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/pricing">
                            <Crown className="mr-2 h-4 w-4" />
                            <span>Upgrade to Pro</span>
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
