// src/app/page.tsx

import Link from 'next/link';
import { Button } from '@/components/ui/button';

// This is a Server Component, good for SEO
export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="container mx-auto p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold font-headline">Jekyll Buildr</h1>
        <nav className="flex gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/login">Get Started</Link>
          </Button>
        </nav>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center text-center p-4">
        <h2 className="text-5xl md:text-6xl font-bold font-headline mb-4">
          The Modern Way to Build Jekyll Sites.
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mb-8">
          Create, edit, and manage your Jekyll projects with an intuitive interface, supercharged by AI features and direct integration with GitHub.
        </p>
        <Button size="lg" asChild>
          <Link href="/login">Start Building for Free</Link>
        </Button>
      </main>

      <footer className="py-6 text-center text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Jekyll Buildr. All Rights Reserved.</p>
      </footer>
    </div>
  );
}