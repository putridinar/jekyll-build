
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { PenSquare, ChevronDown, FileText, UserCircle, FolderKanban } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from './icons';
import { cn } from '@/lib/utils';
import { mainNavItems } from '@/config/nav';


export const editorSubNav = [
    { href: '/editor/blog-post', label: 'Blog Post', icon: FileText },
    { href: '/editor/author', label: 'Author', icon: UserCircle },
    { href: '/editor/project-assets', label: 'Project Assets', icon: FolderKanban },
]

export function AppSidebar() {
    const pathname = usePathname();
    const [isEditorOpen, setIsEditorOpen] = useState(pathname.startsWith('/editor'));

    return (
        <div className="hidden border-r bg-muted/40 md:fixed md:inset-y-0 md:flex md:w-[220px] lg:w-[280px] md:flex-col">
            <div className="flex h-full max-h-screen flex-col gap-2">
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <Link href="/" className="flex items-center gap-2 font-semibold font-headline">
                        <Logo className="h-6 w-6 text-primary" />
                        <span className="">JekyllFlow</span>
                    </Link>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                        {mainNavItems.map((item) => {
                            if (item.href === '/editor') {
                                return (
                                    <Collapsible key="editor-nav" open={isEditorOpen} onOpenChange={setIsEditorOpen} className="grid gap-1">
                                        <CollapsibleTrigger asChild>
                                             <Button variant="ghost" className={cn(
                                                'w-full justify-start',
                                                pathname.startsWith('/editor') && 'bg-muted'
                                             )}>
                                                <div className="flex items-center gap-3">
                                                    <item.icon className="h-4 w-4" />
                                                    {item.label}
                                                </div>
                                                <ChevronDown className={cn("h-4 w-4 ml-auto transition-transform", isEditorOpen && "rotate-180")} />
                                            </Button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="py-1 pl-7">
                                            <nav className="grid gap-1">
                                                {editorSubNav.map(subItem => (
                                                    <Link
                                                        key={subItem.href}
                                                        href={subItem.href}
                                                        className={cn(
                                                            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-sm',
                                                            pathname === subItem.href && 'bg-muted text-primary'
                                                        )}
                                                    >
                                                        <subItem.icon className="h-4 w-4" />
                                                        {subItem.label}
                                                    </Link>
                                                ))}
                                            </nav>
                                        </CollapsibleContent>
                                    </Collapsible>
                                )
                            }
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                                        pathname === item.href && 'bg-muted text-primary'
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            )
                        })}
                    </nav>
                </div>
                <div className="mt-auto p-4">
                    <Card>
                        <CardHeader className="p-4">
                            <CardTitle className="text-base font-headline">Upgrade to Pro</CardTitle>
                            <CardDescription className="text-xs">
                            Unlock all features and get unlimited access to our AI tools.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <Button size="sm" className="w-full" asChild>
                                <Link href="/pricing">
                                    Upgrade
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
