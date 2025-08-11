'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getWorkspaces, setActiveWorkspace, createDefaultWorkspaceIfNeeded } from '@/actions/content'; // Kita akan membuat fungsi baru
import { LoadingScreen } from '@/components/app/LoadingScreen';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight } from 'lucide-react';

// Tipe data untuk workspace
type Workspace = {
  id: string;
  name: string;
  githubRepo?: string;
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    if (user) {
      const fetchWorkspaces = async () => {
        setIsLoading(true);
        // const userWorkspaces = await getWorkspaces(); // Panggil server action Anda
        // setWorkspaces(userWorkspaces);
        setIsLoading(false);
      };
      fetchWorkspaces();
    }
  }, [user, authLoading, router]);

  const handleWorkspaceClick = async (workspaceId: string) => {
    // await setActiveWorkspace(workspaceId);
    router.push('/workspace'); // Arahkan ke editor
  };
  
  const handleNewWorkspaceClick = () => {
      router.push('/settings'); // Arahkan ke pengaturan untuk membuat workspace baru
  };
  
  if (authLoading || isLoading) {
    return <LoadingScreen message="Loading your dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="container px-6 mx-auto max-w-5xl py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold font-headline">Welcome, {user?.displayName}!</h1>
          <p className="text-muted-foreground">Select a project to start working on or create a new one.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Tampilan untuk Pengguna Pro */}
          {user?.role === 'proUser' && (
            <>
              {workspaces.map(ws => (
                <Card key={ws.id} className="cursor-pointer p-4 hover:border-primary transition-all" onClick={() => handleWorkspaceClick(ws.id)}>
                  <CardHeader>
                    <CardTitle>{ws.name}</CardTitle>
                    <CardDescription>{ws.githubRepo || 'Local Project'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Click to open editor</p>
                  </CardContent>
                </Card>
              ))}
               <Card className="flex p-4 flex-col items-center justify-center border-2 border-dashed hover:border-primary transition-all cursor-pointer" onClick={handleNewWorkspaceClick}>
                  <PlusCircle className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="font-semibold">Create New Workspace</p>
               </Card>
            </>
          )}

          {/* Tampilan untuk Pengguna Gratis */}
          {user?.role !== 'proUser' && (
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
        </div>
      </div>
    </div>
  );
}