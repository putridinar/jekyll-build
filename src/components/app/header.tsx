'use client';

import { Crown, LogOut, PlusCircle, Settings } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Icons } from '@/components/icons';
import { useAuth } from './auth-provider';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

type AppHeaderProps = {
  children?: React.ReactNode;
  onNewPost?: () => void;
};

export function AppHeader({ children, onNewPost }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 lg:px-6">
      <div className="flex items-center gap-4">
        {children}
        <Icons.logo className="h-6 w-6" />
        <h1 className="font-headline text-xl font-bold">Jekyll Buildr</h1>
      </div>
      <div className="flex items-center gap-2">
         {onNewPost && (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={onNewPost}>
                        <PlusCircle className="h-5 w-5" />
                        <span className="sr-only">New Post</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>New Post</p>
                </TooltipContent>
            </Tooltip>
        )}
        <ThemeToggle />
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? ''} />
                  <AvatarFallback>
                    {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                {user.role === 'freeUser' && (
                   <DropdownMenuItem onClick={() => router.push('/upgrade')}>
                    <Crown className="mr-2 h-4 w-4" />
                    <span>Upgrade to Pro</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                 <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
