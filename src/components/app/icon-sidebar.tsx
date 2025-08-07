
'use client'

import * as React from 'react'
import { Crown, Files, LogOut, Settings, PlusCircle } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import type { User } from 'firebase/auth'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { UpgradeModal } from '../upgrade-modal'

type CustomUser = User & { role?: string };

type IconSidebarProps = {
  user: CustomUser | null;
  className?: string;
};

export function IconSidebar({ user, className }: IconSidebarProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const activePath = usePathname();
  const [upgradeModalOpen, setUpgradeModalOpen] = React.useState(false);

  const handleLogout = React.useCallback(async () => {
    await logout();
    router.push('/login');
  }, [logout, router]);

  const navItems = React.useMemo(() => [
    {
      href: '/',
      icon: Files,
      label: 'Editor',
      isActive: activePath === '/',
      action: () => router.push('/'),
    },
    {
      href: '/settings',
      icon: Settings,
      label: 'Settings',
      isActive: activePath.startsWith('/settings'),
      action: () => router.push('/settings'),
    },
    ...(user?.role === 'freeUser' ? [{
      href: '#',
      icon: Crown,
      label: 'Go Pro',
      isActive: false,
      action: () => setUpgradeModalOpen(true),
    }] : []),
  ], [activePath, user?.role, router]);

  return (
    <>
    <nav className={cn("flex flex-col items-center gap-4 border-r bg-background/80 px-2 py-4", className)}>
      
      {navItems.map((item) => (
         <Tooltip key={item.label}>
          <TooltipTrigger asChild>
            <button
              onClick={item.action}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-200',
                item.isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              aria-label={item.label}
            >
              <item.icon className="h-5 w-5" />
              <span className="sr-only">{item.label}</span>
            </button>
           </TooltipTrigger>
           <TooltipContent side="right">
            <p>{item.label}</p>
           </TooltipContent>
         </Tooltip>
      ))}

      <div className="mt-auto flex flex-col items-center gap-4">
         <Tooltip>
          <TooltipTrigger asChild>
            <button
                onClick={handleLogout}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-200',
                  'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                aria-label="Logout"
              >
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Logout</span>
            </button>
           </TooltipTrigger>
           <TooltipContent side="right">
            <p>Logout</p>
           </TooltipContent>
         </Tooltip>
      </div>
    </nav>
    <UpgradeModal isOpen={upgradeModalOpen} onOpenChange={setUpgradeModalOpen} />
    </>
  );
}
