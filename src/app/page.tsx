// src/app/page.tsx

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';

// This is a Server Component, good for SEO
export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
  <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg shadow-md">
    <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        <Link href="/" className="flex gap-1 items-center text-2xl font-bold text-indigo-600 tracking-tight">
                <Icons.logo className="h-8 w-8" />Jekyll Buildr</Link> 
            <div className="flex items-center gap-4">
              <Link href="/login" className="btn-shine inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow-md hover:bg-indigo-700 transition">
                Sign In
              </Link> 
            </div>
      </div>
    </nav>
  </header>

  <section className="pt-24 pb-16 lg:pt-32 lg:pb-24 relative h-screen overflow-hidden">
    <div className="fixed top-0 inset-0 bg-gradient-to-bl from-gray-500 via-gray-700 to-transparent"></div>
    <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-5"></div>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
      <div className="hero-flex text-center">
        <h1 className="fade-in text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight ">
          The Modern Way to
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">Build Jekyll Sites</span>
        </h1>
        <p className="fade-in mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-slate-300">
          Create, edit, and manage your Jekyll projects with an intuitive interface, supercharged by AI features and direct integration with GitHub.
        </p>
        <div className="fade-in mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login"
             className="btn-shine w-full sm:w-auto inline-flex justify-center items-center px-8 py-4 bg-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:bg-indigo-700 transition-all transform hover:scale-105">
            Start Building for Free
          </Link> 
          <Link id="demoBtn" href="https://marketplace.visualstudio.com/items?itemName=DaffaDev.jekyll-buildr" target='_blank'
                  className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-4 border border-slate-300 text-slate-800 font-semibold rounded-xl shadow-sm bg-gray-400 hover:bg-slate-50 transition">
            VScode EXT
          </Link>
        </div>
      </div>
    </div>
  </section>

  <section className="py-16 lg:py-24">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12 opacity-90">
        <h2 className="text-3xl lg:text-4xl font-bold">Everything you need to ship faster</h2>
        <p className="mt-4 text-lg text-slate-400 max-w-xl mx-auto">Powered by AI, built for developers.</p>
      </div>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        
        <div className="fade-in bg-gray-800 backdrop-blur-md border border-slate-200 rounded-2xl p-6 shadow-md hover:shadow-lg transition">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold ">AI Content Generator</h3>
          <p className="mt-2 text-slate-400">Let AI draft pages, blog posts, and descriptions based on your prompts and brand tone.</p>
        </div>
        
        <div className="fade-in bg-gray-800 backdrop-blur-md border border-slate-200 rounded-2xl p-6 shadow-md hover:shadow-lg transition">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold ">GitHub Sync</h3>
          <p className="mt-2 text-slate-400">Push commits, open pull-requests, and deploy to GitHub Pages with a single click.</p>
        </div>
        
        <div className="fade-in bg-gray-800 backdrop-blur-md border border-slate-200 rounded-2xl p-6 shadow-md hover:shadow-lg transition">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold ">VS Code Integrated</h3>
          <p className="mt-2 text-slate-400">All AI features are integrated with VS Code editor extension.</p>
        </div>
      </div>
    </div>
  </section>

  <section className="py-16 lg:py-24 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 className="text-3xl lg:text-4xl font-bold opacity-90">Ready to build faster?</h2>
      <p className="mt-4 text-lg opacity-90">Join thousands of developers shipping Jekyll sites in minutes, not hours.</p>
      <Link href="/login"
         className="mt-8 inline-flex items-center px-8 py-4  text-indigo-600 font-semibold rounded-xl shadow-lg bg-white hover:bg-slate-100 opacity-90 transition">
        Get Started for Free
      </Link> 
    </div>
  </section>

  <footer className="py-8">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
      &copy; {new Date().getFullYear()} Jekyll Buildr. All Rights Reserved.
    </div>
  </footer>
    </div>
  );
}
