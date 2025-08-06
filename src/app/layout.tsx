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
