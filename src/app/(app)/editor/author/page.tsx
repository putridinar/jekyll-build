
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { GitBranch, User } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

export const dynamic = 'force-dynamic';

export default function AuthorPage() {
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [title, setTitle] = useState('');
    const [email, setEmail] = useState('');
    const [bio, setBio] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>("https://placehold.co/100x100");

    const handlePublish = () => {
        // In a real app, this would commit the file to GitHub.
        console.log({ name, title, email, bio });
        toast({
            title: "Changes Published!",
            description: "Your author profile has been successfully committed to GitHub.",
        });
    };
    
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 1024 * 1024) {
                toast({ title: "File too large", description: "Please upload an image smaller than 1MB.", variant: "destructive" });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="grid gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl lg:text-3xl font-bold font-headline">Author Editor</h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Edit Author Profile</CardTitle>
                    <CardDescription>Manage author details for your site.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" placeholder="e.g., Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title / Role</Label>
                            <Input id="title" placeholder="e.g., Staff Writer" value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" placeholder="e.g., jane.doe@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="bio">Biography</Label>
                        <Textarea id="bio" placeholder="Write a short bio for the author..." className="min-h-[120px]" value={bio} onChange={(e) => setBio(e.target.value)} />
                    </div>
                     <div className="grid gap-4">
                        <Label>Author Image</Label>
                        <div className="flex items-center gap-4">
                            {imagePreview && (
                                <Image
                                    src={imagePreview}
                                    alt="Author avatar"
                                    width={100}
                                    height={100}
                                    className="rounded-full object-cover h-[100px] w-[100px]"
                                    data-ai-hint="person avatar"
                                />
                            )}
                            <Input id="picture" type="file" className="max-w-xs" onChange={handleImageUpload} accept="image/*" />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="justify-end gap-2">
                    <Button variant="outline">Save Draft</Button>
                    <Button onClick={handlePublish}>
                        <GitBranch />
                        Publish to GitHub
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
