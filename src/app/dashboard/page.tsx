'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getWorkspaces, setActiveWorkspace, createDefaultWorkspaceIfNeeded, deleteWorkspace, createWorkspace, getSettings } from '@/actions/content'; // Kita akan membuat fungsi baru
import { LoadingScreen } from '@/components/app/LoadingScreen';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight, Loader2, Trash2, Lock, Terminal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Github } from 'lucide-react';

const appName = process.env.NEXT_PUBLIC_GITHUB_APP_NAME || 'your-app-name';
const GITHUB_APP_URL = `https://github.com/apps/${appName}/installations/new`;

// Tipe data untuk workspace
type Workspace = {
  id: string;
  name: string;
  githubRepo?: string;
  githubBranch?: string;
};

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

  // State for Create New Workspace dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [repos, setRepos] = useState<string[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [isFetchingRepos, setIsFetchingRepos] = useState(false);
  const [isFetchingBranches, setIsFetchingBranches] = useState(false);

  // Function to fetch repositories
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

  // Function to fetch branches for a given repository
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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    if (user) {
      const fetchInitialData = async () => {
        setIsLoading(true);
        setIsSettingsLoading(true);
        const userWorkspaces = await getWorkspaces(); // Panggil server action Anda
        setWorkspaces(userWorkspaces);
        await fetchRepos(); // Fetch repos when dashboard loads

        try {
          const userSettings = await getSettings();
          if (userSettings.success && userSettings.data) {
            setSettings(userSettings.data);
          }
        } catch (error) {
          toast({
            title: 'Error Loading Settings',
            description: 'Failed to load user settings.',
            variant: 'destructive'
          });
        } finally {
          setIsSettingsLoading(false);
        }
        setIsLoading(false);
      };
      fetchInitialData();
    }
  }, [user, authLoading, router]);

  const handleWorkspaceClick = async (workspaceId: string) => {
    await setActiveWorkspace(workspaceId);
    router.push('/workspace'); // Arahkan ke editor
  };
  
  // Fungsi untuk mengambil branch saat repo dipilih di dalam dialog
  const onRepoSelectInDialog = async (repoFullName: string) => {
      setSelectedRepo(repoFullName);
      setSelectedBranch(''); // Reset pilihan branch
      await fetchBranches(repoFullName);
  };

  const handleCreateWorkspace = async () => {
      if (!selectedRepo || !selectedBranch) {
          toast({ title: 'Error', description: 'Please select a repository and branch.', variant: 'destructive' });
          return;
      }
      setIsCreating(true);
      toast({ title: 'Creating Workspace...', description: 'Cloning repository, this might take a while.' });

      const result = await createWorkspace(selectedRepo, selectedBranch);

      if (result.success) {
          toast({ title: 'Workspace Created!', description: 'You will be redirected to the editor.' });
          setDialogOpen(false);
          router.push('/workspace');
      } else {
          toast({ title: 'Error Workspace', description: 'Failed to Create Workspace', variant: 'destructive' });
      }
      setIsCreating(false);
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    setIsDeleting(true);
    try {
      const result = await deleteWorkspace(workspaceId);
      if (result.success) {
        toast({
          title: 'Workspace Deleted',
          description: 'The workspace has been successfully removed.',
        });
        setWorkspaces(prev => prev.filter(ws => ws.id !== workspaceId));
      } else {
        throw new Error(result.error || 'Failed to delete workspace.');
      }
    } catch (error: any) {
      toast({
        title: 'Error Deleting Workspace',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  if (authLoading || isLoading) {
    return <LoadingScreen message="Load your dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-muted/20">
    <div className="fixed top-0 inset-0 bg-gradient-to-bl from-gray-500 via-gray-700 to-transparent"></div>
      <div className="container px-6 mx-auto max-w-5xl py-12 opacity-90">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold font-headline">Welcome, {user?.displayName}!</h1>
            <p className="text-muted-foreground">Select a project to start working on or create a new one.</p>
          </div>
          <Button onClick={() => { logout(); router.push('/login'); }} variant="outline">
            Logout
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Tampilan untuk Pengguna Pro */}
          {user?.role === 'proUser' && !settings.installationId && (
            <Card className="flex p-4 flex-col items-center justify-center border-2 border-dashed hover:border-primary transition-all cursor-pointer">
              <div className="flex flex-col items-center justify-center h-full w-full text-center">
                <p className="mb-4 text-muted-foreground">Connect your GitHub account to create new workspaces from your repositories.</p>
                <Button asChild>
                  <a href={GITHUB_APP_URL}>
                    <Github className="mr-2 h-4 w-4" />
                    Connect with GitHub
                  </a>
                </Button>
              </div>
            </Card>
          )}
          {user?.role === 'proUser' && (
            <>
              {workspaces.map(ws => (
                <Card key={ws.id} className="relative cursor-pointer p-4 hover:border-primary transition-all">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>{ws.name}</CardTitle>
                      <CardDescription>Repo: {ws.githubRepo || 'Local Project'}</CardDescription>
                      <CardDescription>Branch: {ws.githubBranch || 'none'}</CardDescription>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className='absolute top-0 right-2' variant="ghost" size="icon" onClick={(e) => e.stopPropagation()} disabled={isDeleting}>
                          <Trash2 className="h-8 w-8 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your workspace 
                            <span className="font-bold">{ws.name}</span> and remove its data from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteWorkspace(ws.id)} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardHeader>
                  <CardContent className='flex justify-between items-center' onClick={() => handleWorkspaceClick(ws.id)}>
                    <p className="text-sm text-muted-foreground">Click to open editor</p>
                    <Terminal className="h-6 w-6" />
                  </CardContent>
                </Card>
              ))}
               <Card className="relative flex p-4 flex-col items-center justify-center border-2 border-dashed hover:border-primary hover:text-primary transition-all cursor-pointer overflow-hidden">
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                          <Button variant="ghost" className="relative text-lg flex flex-col items-center justify-center hover:text-primary h-full w-full">
                              <PlusCircle className="relative cursor-auto h-12 w-12 text-muted-foreground mb-2" />
                              <p className="font-semibold">Create New Workspace</p>
                          </Button>
                      </DialogTrigger>
                      <DialogContent>
                          <DialogHeader>
                              <DialogTitle>Create New Workspace</DialogTitle>
                              <DialogDescription>
                                  Select a GitHub repository to import as a new workspace.
                              </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                              <div>
                                  <Label htmlFor="repo-select">Repository</Label>
                                  <Select onValueChange={onRepoSelectInDialog} value={selectedRepo}>
                                      <SelectTrigger id="repo-select">
                                          <SelectValue placeholder="Select a repository..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                          {repos.map(repo => <SelectItem key={repo} value={repo}>{repo}</SelectItem>)}
                                      </SelectContent>
                                  </Select>
                              </div>
                              <div>
                                  <Label htmlFor="branch-select">Branch</Label>
                                  <Select onValueChange={setSelectedBranch} value={selectedBranch} disabled={!selectedRepo || isFetchingBranches}>
                                      <SelectTrigger id="branch-select">
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
                          </div>
                          <DialogFooter>
                              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                              <Button onClick={handleCreateWorkspace} disabled={isCreating || !selectedRepo || !selectedBranch}>
                                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  {isCreating ? 'Creating...' : 'Create Workspace'}
                              </Button>
                          </DialogFooter>
                      </DialogContent>
                  </Dialog>
               </Card>
            </>
          )}

          {/* Tampilan untuk Pengguna Gratis */}
          {user?.role !== 'proUser' && (
            <>
              {settings.githubRepo ? (
                // Display GitHub workspace
                <Card key={settings.activeWorkspaceId || 'github-workspace'} className="relative cursor-pointer p-4 hover:border-primary hover:text-primary transition-all" onClick={() => handleWorkspaceClick(settings.activeWorkspaceId || 'default')}>
                  <CardHeader>
                    <CardTitle>{settings.githubRepo.split('/')[1]}</CardTitle> {/* Display repo name */}
                    <CardDescription>Repo: {settings.githubRepo}</CardDescription>
                    <CardDescription>Branch: {settings.githubBranch}</CardDescription>
                  </CardHeader>
                  <CardContent className='flex justify-between items-center'>
                    <p className="text-sm text-muted-foreground">Click to open editor</p>
                    <Terminal className="h-6 w-6" />
                  </CardContent>
                </Card>
              ) : (
                // Display Default Project
                <Card className="cursor-pointer p-4 hover:border-primary transition-all" onClick={() => handleWorkspaceClick('default')}>
                  <CardHeader>
                    <CardTitle>Default Project</CardTitle>
                    <CardDescription>Start working with our base template.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Open Editor</p>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Display "Create GitHub Workspace" (with dialog) if connected but no workspace */}
              {!settings.githubRepo && settings.installationId && (
                <Card className="flex p-4 flex-col items-center justify-center border-2 border-dashed hover:border-primary transition-all cursor-pointer">
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" className="flex flex-col items-center justify-center h-full w-full">
                        <PlusCircle className="h-12 w-12 text-muted-foreground mb-2" />
                        <p className="font-semibold">Create GitHub Workspace</p>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create GitHub Workspace</DialogTitle>
                        <DialogDescription>
                          Select a GitHub repository to import as your workspace.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="repo-select">Repository</Label>
                          <Select onValueChange={onRepoSelectInDialog} value={selectedRepo}>
                            <SelectTrigger id="repo-select">
                              <SelectValue placeholder="Select a repository..." />
                            </SelectTrigger>
                            <SelectContent>
                              {repos.map(repo => <SelectItem key={repo} value={repo}>{repo}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="branch-select">Branch</Label>
                          <Select onValueChange={setSelectedBranch} value={selectedBranch} disabled={!selectedRepo || isFetchingBranches}>
                            <SelectTrigger id="branch-select">
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
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateWorkspace} disabled={isCreating || !selectedRepo || !selectedBranch}>
                          {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {isCreating ? 'Creating...' : 'Create Workspace'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </Card>
              )}

              {/* If GitHub App not connected, show connect button */}
              {!settings.githubRepo && !settings.installationId && (
                <Card className="flex p-4 flex-col items-center justify-center border-2 border-dashed hover:border-primary transition-all cursor-pointer">
                  <div className="flex flex-col items-center justify-center h-full w-full text-center">
                    <p className="mb-4 text-muted-foreground">Connect your GitHub account to import your own repositories.</p>
                    <Button asChild>
                      <a href={GITHUB_APP_URL}>
                        <Github className="mr-2 h-4 w-4" />
                        Connect with GitHub
                      </a>
                    </Button>
                  </div>
                </Card>
              )}

              {/* Always display the locked "New Workspace" card for free users */}
              <Card
                className="relative flex p-4 flex-col items-center justify-center border-2 border-dashed hover:border-primary hover:text-primary transition-all cursor-pointer overflow-hidden"
                onClick={() => toast({ title: 'New workspace for proUser only', description: 'Upgrade to Pro to create new workspaces from your GitHub repositories.' })}
              >
                <div className="absolute inset-0 bg-white/1 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                  <Lock className="h-16 w-16 text-muted-foreground" />
                </div>
                <div className="relative z-0 flex flex-col items-center justify-center h-full w-full opacity-50">
                  <PlusCircle className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="font-semibold">Create New Workspace</p>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}