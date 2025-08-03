import { Home, PenSquare, Crown, Settings } from 'lucide-react';
import type { ElementType } from 'react';

export const mainNavItems: { href: string; icon: ElementType; label: string; }[] = [
    { href: '/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/editor', icon: PenSquare, label: 'Editor' },
    { href: '/pricing', icon: Crown, label: 'Pricing' },
    { href: '/settings', icon: Settings, label: 'Settings' },
];
