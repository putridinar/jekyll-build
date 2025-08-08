
// src/app/settings/page.tsx
'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saveSettings, getSettings, disconnectGithub } from '@/actions/content';
import { Github, Loader2, Trash2, ExternalLink, Settings as SettingsIcon, Crown } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppHeader } from '@/components/app/header';
import { AppFooter } from '@/components/app/footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { UpgradeModal } from '@/components/upgrade-modal';


const appName = process.env.NEXT_PUBLIC_GITHUB_APP_NAME || 'your-app-name';
const PAYPAL_MANAGE_SUBSCRIPTION_URL = process.env.NEXT_PUBLIC_PAYPAL_MANAGE_SUBSCRIPTION_URL || 'https://www.paypal.com/myaccount/autopay/';

const GITHUB_APP_URL = `https://github.com/apps/${appName}/installations/new`;

function SettingsPageContent() {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [settings, setSettings] = React.useState<any>({});
    const [repos, setRepos] = React.useState<string[]>([]);
    const [branches, setBranches] = React.useState<string[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isFetchingRepos, setIsFetchingRepos] = React.useState(false);
    const [isFetchingBranches, setIsFetchingBranches] = React.useState(false);
    const [isDisconnecting, setIsDisconnecting] = React.useState(false);
    const [upgradeModalOpen, setUpgradeModalOpen] = React.useState(false);

    // Moved useMemo hook to the top to ensure unconditional hook calls
    const githubPagesUrl = React.useMemo(() => {
        if (settings.githubRepo) {
            const [owner, repoName] = settings.githubRepo.split('/');
            return `https://${owner}.github.io/${repoName}/`;
        }
        return null;
    }, [settings.githubRepo]);

    React.useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    React.useEffect(() => {
        const status = searchParams.get('status');
        const message = searchParams.get('message');
        if (status && message) {
            toast({
                title: status.charAt(0).toUpperCase() + status.slice(1),
                description: message,
                variant: status === 'error' ? 'destructive' : 'default',
            });
            router.replace('/settings');
        }
    }, [searchParams, toast, router]);

    const fetchRepos = async () => {
        setIsFetchingRepos(true);
        try {
            const response = await fetch('/api/github/get-repos');
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch repositories.');
            setRepos(data.repositories || []);
        } catch (error: any) {
            toast({
                title: 'Error Fetching Repos',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setIsFetchingRepos(false);
        }
    };

    const fetchBranches = async (repoFullName: string) => {
        if (!repoFullName) return;
        setIsFetchingBranches(true);
        try {
            const response = await fetch(`/api/github/get-branches?repoFullName=${repoFullName}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch branches');
            setBranches(data.branches || []);
        } catch (error: any) {
            toast({
                title: 'Error Fetching Branches',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setIsFetchingBranches(false);
        }
    };
    
    const fetchInitialData = React.useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const result = await getSettings();
            if (result.success && result.data) {
                const fetchedSettings = result.data || {};
                setSettings(fetchedSettings);
                
                if (fetchedSettings.installationId) {
                    if (!fetchedSettings.githubUsername) {
                        fetch('/api/github/get-account-info');
                    }
                   await fetchRepos();
                }
                if (fetchedSettings.githubRepo) {
                   await fetchBranches(fetchedSettings.githubRepo);
                }
            }
        } catch (error: any) {
            toast({
                title: 'Error Loading Settings',
                description: `Failed to load initial settings: ${error.message}`,
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);


    React.useEffect(() => {
        if (user) {
            fetchInitialData();
        }
    }, [user, fetchInitialData]);

    const handleRepoChange = async (repoFullName: string) => {
        setSettings((prev: any) => ({ ...prev, githubRepo: repoFullName, githubBranch: '' }));
        setBranches([]);
        if (repoFullName) {
           await fetchBranches(repoFullName);
        }
    };

    const handleBranchChange = async (branch: string) => {
        const newSettings = { ...settings, githubRepo: settings.githubRepo, githubBranch: branch };
        setSettings(newSettings);

        if (newSettings.githubRepo && branch) {
            setIsSaving(true);
            try {
                const result = await saveSettings({
                    githubRepo: newSettings.githubRepo,
                    githubBranch: branch
                });
                if (result.success) {
                    toast({
                        title: 'Settings Saved!',
                        description: 'Pengaturan berhasil disimpan!',
                    });
                } else {
                    throw new Error(result.error || 'Gagal menyimpan pengaturan.');
                }
            } catch (error: any) {
                toast({
                    title: 'Save Failed',
                    description: error.message,
                    variant: 'destructive'
                });
            } finally {
                setIsSaving(false);
            }
        }
    };


    const handleReconnect = () => {
        const appName = process.env.NEXT_PUBLIC_GITHUB_APP_NAME;
        if (appName) {
            window.location.href = `https://github.com/apps/${appName}/installations/new`;
        } else {
            toast({
                title: 'Configuration Error',
                description: "Konfigurasi nama aplikasi GitHub tidak ditemukan.",
                variant: 'destructive'
            });
        }
    };
    
    const handleDisconnect = async () => {
        setIsDisconnecting(true);
        try {
            const currentInstallationId = settings.installationId;
            const result = await disconnectGithub();
            if (result.success) {
                toast({
                    title: 'GitHub Disconnected',
                    description: 'Mengarahkan Anda untuk menghapus instalasi aplikasi...',
                });
                setSettings({});
                setRepos([]);
                setBranches([]);
                if (currentInstallationId) {
                    window.location.href = `https://github.com/settings/installations/${currentInstallationId}`;
                }
            } else {
                throw new Error(result.error || 'Gagal memutuskan sambungan.');
            }
        } catch (error: any) {
            toast({
                title: 'Disconnect Failed',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setIsDisconnecting(false);
        }
    };

     if (authLoading || loading || !user) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin" />
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="flex min-h-screen flex-col">
                <AppHeader />
                <main className="flex-1 bg-muted/20 p-4 sm:p-6 md:p-8">
                    <div className="mx-auto grid max-w-6xl items-start gap-6 md:grid-cols-3 lg:grid-cols-3">
                        {/* Profile Card */}
                        <Card className="md:col-span-1">
                            <CardHeader className="flex flex-row justify-between items-center gap-4">
                                <div className='flex flex-col space-y-3'>
                                    <Avatar className="h-14 w-14">
                                        <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
                                        <AvatarFallback>{user.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle className="text-xl font-headline">{user.displayName}</CardTitle>
                                        <CardDescription>{user.email}</CardDescription>
                                    </div>
                                </div>
                                {githubPagesUrl && (
                                    <div>
                                        <Button variant="outline" size="sm" className="mt-1" asChild>
                                            <a href={githubPagesUrl} target="_blank" rel="noopener noreferrer">
                                                View Site <ExternalLink className="ml-2 h-4 w-4" />
                                            </a>
                                        </Button>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-medium">Account Status</h3>
                                    {user.role === 'proUser' ? (
                                        <Badge variant="default" className="mt-1 bg-gradient-to-r from-accent to-primary">
                                            <Crown className="mr-1 h-3 w-3" /> Pro User
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="mt-1">Free User</Badge>
                                    )}
                                </div>
                                 {user.role === 'proUser' && (
                                    <div>
                                        <h3 className="text-sm font-medium">Subscription</h3>
                                        <Button variant="outline" size="sm" className="mt-1" asChild>
                                            <a href={PAYPAL_MANAGE_SUBSCRIPTION_URL} target="_blank" rel="noopener noreferrer">
                                                Manage Subscription <ExternalLink className="ml-2 h-4 w-4" />
                                            </a>
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        {user.role === 'freeUser' && (
                            <CardFooter className="border-t pt-6">
                                    <Button className="w-full" onClick={() => setUpgradeModalOpen(true)}>
                                        <Crown className="mr-2 h-4 w-4" />
                                        Upgrade to Pro
                                    </Button>
                            </CardFooter>
                        )}
                        </Card>

                        {/* GitHub Settings Card */}
                        <Card className="md:col-span-2 flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-center gap-2">
                                    <div className="flex items-center gap-2">
                                    <SettingsIcon className="h-6 w-6" />
                                    <CardTitle className="font-headline text-2xl">GitHub Settings</CardTitle>
                                    </div>
                                    {isSaving && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                                </div>
                                <CardDescription>Pilih repositori dan cabang untuk mempublikasikan situs Jekyll Anda. Pengaturan akan disimpan secara otomatis setelah Anda memilih cabang.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                {!settings.installationId ? (
                                     <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted p-8 text-center h-full">
                                        <p className="mb-4 text-muted-foreground">The first step is to connect the GitHub App.</p>
                                        <Button asChild>
                                            <a href={GITHUB_APP_URL}>
                                                <Github className="mr-2 h-4 w-4" />
                                                Connect with GitHub
                                            </a>
                                        </Button>
                                    </div>
                                ) : (
                                    <form className="space-y-6">
                                        <div>
                                            <Label htmlFor="repo">Repository</Label>
                                            <Select
                                                value={settings.githubRepo || ''}
                                                onValueChange={handleRepoChange}
                                                disabled={isFetchingRepos}
                                            >
                                                <SelectTrigger id="repo" className="mt-1">
                                                    <SelectValue placeholder="Select a repository..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {isFetchingRepos ? (
                                                        <div className="flex items-center justify-center p-2">
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        </div>
                                                    ) : (
                                                        repos.map(repo => <SelectItem key={repo} value={repo}>{repo}</SelectItem>)
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label htmlFor="branch">Branch</Label>
                                            <Select
                                                value={settings.githubBranch || ''}
                                                onValueChange={handleBranchChange}
                                                disabled={!settings.githubRepo || isFetchingBranches}
                                            >
                                                <SelectTrigger id="branch" className="mt-1">
                                                    <SelectValue placeholder="Select a branch..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {isFetchingBranches ? (
                                                        <div className="flex items-center justify-center p-2">
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        </div>
                                                    ) : (
                                                        branches.map(branch => <SelectItem key={branch} value={branch}>{branch}</SelectItem>)
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </form>
                                )}
                            </CardContent>
                            {settings.installationId && (
                                 <CardFooter className="border-t pt-6 mt-auto">
                                        <div className="flex justify-between items-center w-full p-2">
                                            <Button type='button' variant="outline" size="sm" onClick={handleReconnect}>
                                                Change Permissions
                                            </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" className="w-fit" size="sm" disabled={isDisconnecting}>
                                                <Trash2 className="mr-2 h-4 w-4" /> 
                                                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will remove your repository connection. You will be redirected to GitHub to uninstall the app to fully complete the process.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDisconnect} className="bg-destructive hover:bg-destructive/90">
                                                    Yes, Disconnect
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                        </div>
                                </CardFooter>
                            )}
                        </Card>
                    </div>
                </main>
                <AppFooter isPublishing={false} isCreatingPr={false} />
                <UpgradeModal isOpen={upgradeModalOpen} onOpenChange={setUpgradeModalOpen} />
            </div>
        </TooltipProvider>
    );
}

export default function SettingsPage() {
    return (
        <React.Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin" /></div>}>
            <SettingsPageContent />
        </React.Suspense>
    )
}
