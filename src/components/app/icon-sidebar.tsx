'use client'

import * as React from 'react'
import { Crown, Files, LogOut, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from './auth-provider'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import type { User } from 'firebase/auth'

type CustomUser = User & { role?: string };

type IconSidebarProps = {
  user: CustomUser | null;
  className?: string;
};

type NavItemProps = {
  href?: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  isActive?: boolean;
  isProFeature?: boolean;
  userRole?: string;
};

function NavItem({ href, icon: Icon, label, onClick, isActive, isProFeature, userRole }: NavItemProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick();
    } else if (href) {
      if (isProFeature && userRole !== 'proUser') {
        e.preventDefault();
        toast({
          title: 'Pro Feature',
          description: 'Please upgrade to access this feature.',
          variant: 'destructive',
        });
        router.push('/upgrade');
      } else {
        router.push(href);
      }
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleClick}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-200',
            isActive
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Icon className="h-5 w-5" />
          <span className="sr-only">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
// Dummy toast hook jika tidak tersedia secara global
const useToast = () => ({ toast: (options: any) => console.log(options.title, options.description) });


export function IconSidebar({ user, className }: IconSidebarProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const [activePath, setActivePath] = React.useState('/');

  React.useEffect(() => {
    // Ini adalah cara sederhana untuk melacak status aktif. Untuk aplikasi nyata, Anda mungkin menggunakan `usePathname`.
    setActivePath(window.location.pathname);
  }, []);


  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <nav className={cn("flex flex-col items-center gap-4 border-r bg-background/80 px-2 py-4", className)}>
       <NavItem
        href="/"
        icon={Files}
        label="Editor"
        isActive={activePath === '/'}
      />
      <NavItem
        href="/settings"
        icon={Settings}
        label="Settings"
        isActive={activePath.startsWith('/settings')}
      />
      {user?.role === 'freeUser' && (
        <NavItem
            href="/upgrade"
            icon={Crown}
            label="Go Pro"
            isActive={activePath.startsWith('/upgrade')}
        />
      )}
      <div className="mt-auto flex flex-col items-center gap-4">
        <NavItem
          onClick={handleLogout}
          icon={LogOut}
          label="Logout"
        />
      </div>
    </nav>
  );
}
