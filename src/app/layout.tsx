import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/app/auth-provider";
import { AlertProvider } from "@/contexts/AlertContext";
import { GlobalAlert } from "@/components/app/global-alert";

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
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <link rel="icon" href="/favicon.ico" />
        <meta property="twitter:image" content="/og-image.png"/>
        <meta property="twitter:card" content="summary_large_image"></meta>
        <meta property="twitter:title" content="Jekyll Buildr"></meta>
        <meta property="twitter:description" content="Create and publish Jekyll templates with ease."></meta>
        <meta property="og:image" content="/og-image.png"></meta>
        <meta property="og:site_name" content="Jekyll Buildr"></meta>
        <meta property="og:title" content="Jekyll Buildr"></meta>
        <meta property="og:description" content="Create and publish Jekyll templates with ease."></meta>
        <meta property="og:url" content="https://jekyll-buildr.vercel.app"></meta>
        <meta name="description" content="Create and publish Jekyll templates with ease." />
        <meta name="keywords" content="Jekyll, templates, build, publish, web development" />
        <meta name="author" content="Jekyll Buildr Team" />
        <meta name="robots" content="index, follow" />
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
          <AlertProvider>
            <GlobalAlert />
            {children}
            <Toaster />
          </AlertProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
