
'use client';

import Link from 'next/link';
import { ChevronDown, Menu } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { UserNav } from './user-nav';
import { ThemeToggle } from './theme-toggle';
import { Logo } from './icons';
import { mainNavItems } from '@/config/nav';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { cn } from '@/lib/utils';
import { editorSubNav } from './app-sidebar';

export function AppHeader() {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const closeSheet = () => setIsSheetOpen(false);

    return (
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 md:hidden"
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col">
                    <SheetHeader>
                        <SheetTitle>
                            <Link
                                href="/"
                                className="flex items-center gap-2 text-lg font-semibold"
                                onClick={closeSheet}
                            >
                                <Logo className="h-6 w-6 text-primary" />
                                <span className="font-headline">JekyllFlow</span>
                            </Link>
                        </SheetTitle>
                        <SheetDescription>
                            Navigation menu for JekyllFlow.
                        </SheetDescription>
                    </SheetHeader>
                    <nav className="grid gap-2 text-lg font-medium mt-4">
                        {mainNavItems.map((item) => {
                             if (item.href === '/editor') {
                                return (
                                    <Collapsible key="editor-nav-mobile" open={isEditorOpen} onOpenChange={setIsEditorOpen} className="grid gap-1">
                                        <CollapsibleTrigger asChild>
                                             <Button variant="ghost" className="w-full justify-start px-3 py-2 h-auto text-lg text-muted-foreground hover:text-foreground">
                                                <div className="flex items-center gap-4">
                                                    <item.icon className="h-5 w-5" />
                                                    {item.label}
                                                </div>
                                                <ChevronDown className={cn("h-5 w-5 ml-auto transition-transform", isEditorOpen && "rotate-180")} />
                                            </Button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="py-1 pl-12">
                                            <nav className="grid gap-2">
                                                {editorSubNav.map(subItem => (
                                                    <Link
                                                        key={subItem.href}
                                                        href={subItem.href}
                                                        onClick={closeSheet}
                                                        className='flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground text-base'
                                                    >
                                                        <subItem.icon className="h-5 w-5" />
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
                                    className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                                    onClick={closeSheet}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.label}
                                </Link>
                            )
                        })}
                    </nav>
                </SheetContent>
            </Sheet>

            <div className="w-full flex-1">
                {/* Can be used for breadcrumbs or search in the future */}
            </div>
            <ThemeToggle />
            <UserNav />
        </header>
    );
}
