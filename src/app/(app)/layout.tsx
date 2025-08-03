
'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
// import { useAuth } from '@/hooks/useAuth';
// import { useRouter } from 'next/navigation';
// import { useEffect } from 'react';
// import { Loader2 } from 'lucide-react';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
    // const { user, loading } = useAuth();
    // const router = useRouter();

    // useEffect(() => {
    //     if (!loading && !user) {
    //         router.push('/');
    //     }
    // }, [user, loading, router]);
    
    // if (loading) {
    //     return (
    //         <div className="flex items-center justify-center min-h-screen">
    //             <Loader2 className="h-12 w-12 animate-spin" />
    //         </div>
    //     );
    // }
    
    // if (!user) {
    //     return null; // or a redirect component
    // }

    return (
        <div>
            <AppSidebar />
            <div className="flex flex-col md:pl-[220px] lg:pl-[280px]">
                <AppHeader />
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-secondary/20 min-h-screen">
                    {children}
                </main>
            </div>
        </div>
    );
}


export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AppLayoutContent>{children}</AppLayoutContent>;
}
