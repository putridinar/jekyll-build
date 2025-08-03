
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, Bot, GitBranch, ShieldCheck, Github } from 'lucide-react';
import { Logo } from '@/components/icons';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { UserNav } from '@/components/user-nav';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
      if (user) {
          router.push('/dashboard');
      }
  }, [user, router]);
  
  if (loading || user) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <Rocket className="h-12 w-12 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold font-headline">JekyllFlow</span>
        </Link>
        <nav className="flex items-center gap-4">
          <UserNav />
        </nav>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 text-center py-20 md:py-32">
          <h1 className="text-4xl md:text-6xl font-extrabold font-headline tracking-tighter mb-4">
            Effortless Jekyll Content Creation
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-8">
            JekyllFlow streamlines your workflow with an intuitive editor, AI-powered assistance, and direct GitHub integration. Focus on your content, not the process.
          </p>
          <div className="flex justify-center">
            <UserNav />
          </div>
        </section>

        <section id="features" className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 bg-secondary/50 rounded-t-xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-headline">Powerful Features, Simplified</h2>
            <p className="max-w-xl mx-auto text-muted-foreground mt-2">
              Everything you need to write, manage, and publish your Jekyll site.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Rocket className="h-8 w-8" />}
              title="Intuitive Editor"
              description="A clean, web-based interface for creating and editing content based on your Jekyll schemas."
            />
            <FeatureCard
              icon={<Bot className="h-8 w-8" />}
              title="AI Content Assistant"
              description="Generate content drafts, get new ideas, and overcome writer's block with our Pro AI tools."
            />
            <FeatureCard
              icon={<GitBranch className="h-8 w-8" />}
              title="Direct GitHub Sync"
              description="Automatically convert and commit your content to any GitHub Pages repository."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-8 w-8" />}
              title="Pro Subscriptions"
              description="Unlock powerful AI features and more by upgrading to a Pro plan at any time."
            />
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} JekyllFlow. All Rights Reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="text-center bg-card shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="mx-auto bg-primary/10 text-primary rounded-full p-4 w-fit">
          {icon}
        </div>
        <CardTitle className="font-headline mt-4">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
