
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Suspense } from 'react';
import { GitBranch, Github, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/firebase/client-actions';
import type { User } from 'firebase/auth';

function GitHubProfileCard({ user }: { user: User }) {
    const router = useRouter();
    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    return (
        <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center gap-4">
                <Github className="h-8 w-8" />
                <CardTitle className="font-headline text-2xl">GitHub Connected</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="flex items-center gap-4 p-4 border rounded-lg bg-secondary/50">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={user.photoURL!} alt={`@${user.displayName}`} />
                        <AvatarFallback>{user.displayName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h3 className="text-lg font-bold">{user.displayName}</h3>
                        <p className="text-muted-foreground">{user.email}</p>
                    </div>
                </div>
                 <div className="text-sm text-muted-foreground">
                    <p>You have successfully connected your GitHub account via Firebase. You can now publish content directly to your repositories.</p>
                </div>
                <Separator />
                <div className="flex justify-end">
                    <Button variant="destructive" onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Disconnect
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}


function DashboardComponent() {
    const { user } = useAuth(); // User is guaranteed to be non-null here by the layout
    
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl lg:text-3xl font-bold font-headline">Dashboard</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="flex flex-col justify-between shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold font-headline">Welcome to JekyllFlow!</CardTitle>
                        <CardDescription className="text-lg text-muted-foreground mt-2">
                            You're all set to start creating amazing content.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>
                            Head over to the editor to create a new post or page. Need some inspiration? Our AI assistant can help you generate ideas and draft content.
                        </p>
                    </CardContent>
                     <CardFooter>
                        <Button asChild size="lg">
                            <Link href="/editor/blog-post">Go to Editor</Link>
                        </Button>
                    </CardFooter>
                </Card>

                {user && <GitHubProfileCard user={user} />}
            </div>
        </div>
    );
}

export default function Dashboard() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DashboardComponent />
        </Suspense>
    )
}
