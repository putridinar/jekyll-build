// layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import AppWrapper from "@/components/app/AppWrapper";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { PayPalProvider } from "@/components/paypal-provider";

export const metadata: Metadata = {
  title: "Jekyll Buildr",
  description: "Create and publish Jekyll templates with ease.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1"></meta>
        <meta name="theme-color" content="#000000"></meta>        
        <meta name="description" content="Jekyll Buildr is a powerful webapp tool that helps you create stunning Jekyll pages with ease."></meta>
        <meta name="keywords" content="AI, artificial intelligence, image generation, video generation, deep learning, neural networks, machine learning, Jekyll, Buildr"></meta>
        <meta name="author" content="DaffaDev"></meta>
        <meta name="publisher" content="DaffaDev"></meta>
        <meta property="licenseId" content="SmVreWxsIEJ1aWxkciBieSBEYWZmYQ=="/>
        <meta property="twitter:card" content="summary_large_image"></meta>
        <meta property="twitter:site" content="@jekyllBuildr"></meta>
        <meta property="twitter:creator" content="@jekyllBuildr"></meta>
        <meta property="twitter:title" content="jekyllBuildr"></meta>
        <meta property="twitter:description" content="jekyllBuildr is a powerful webapp tool that helps you create stunning Jekyll pages with ease."></meta>
        <meta property="twitter:image" content="https://jekyll-buildr.vercel.app/og-image.png"></meta>

        <meta property="og:title" content="Jekyll Buildr"></meta>
        <meta property="og:description" content="Jekyll Buildr is a powerful webapp tool that helps you create stunning Jekyll pages with ease."></meta>
        <meta property="og:image" content="https://jekyll-buildr.vercel.app/og-image.png"></meta>
        <meta property="og:url" content="https://jekyll-buildr.vercel.app"></meta>
        <meta property="og:type" content="website"></meta>
        
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Space+Grotesk:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/prism-theme.css" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <PayPalProvider>
            <AppWrapper>
              {children}
            </AppWrapper>
          </PayPalProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
