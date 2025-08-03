
'use client';

import { useState, useActionState, ChangeEvent, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Bot, GitBranch, Sparkles, Wand2, Calendar as CalendarIcon, Image as ImageIcon, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { generateContentDraft, contentIdeaGeneration, generateImage } from '@/firebase/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsPro } from '@/hooks/use-is-pro';

export const dynamic = 'force-dynamic';

const initialDraftState = { draft: { title: '', content: '' }, error: '' };
const initialIdeasState = { ideas: [] as string[], error: '' };
const initialImageState = { imageUrl: '', error: '' };

export default function BlogPostPage() {
    const { toast } = useToast();
    const isPro = useIsPro();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [ideaTopic, setIdeaTopic] = useState('');
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [theme, setTheme] = useState('');

    const [draftState, draftFormAction, isDraftLoading] = useActionState(generateContentDraft, initialDraftState);
    const [ideasState, ideasFormAction, isIdeasLoading] = useActionState(contentIdeaGeneration, initialIdeasState);
    const [imageState, imageFormAction, isImageLoading] = useActionState(generateImage, initialImageState);

    useEffect(() => {
        if (draftState.draft.content) {
            setContent(draftState.draft.content);
            setTitle(draftState.draft.title);
            toast({ title: "Draft Generated!", description: "Your AI-powered draft has been added to the editor." });
        } else if (draftState.error) {
            toast({ title: "Error", description: draftState.error, variant: 'destructive' });
        }
    }, [draftState, toast]);

    useEffect(() => {
        if (ideasState.error) {
            toast({ title: "Error", description: ideasState.error, variant: 'destructive' });
        }
        if (ideasState.ideas.length > 0) {
            toast({ title: "Ideas Generated!", description: "New content ideas are ready." });
        }
    }, [ideasState, toast]);

    useEffect(() => {
        if (imageState.imageUrl) {
            setImagePreview(imageState.imageUrl);
            toast({ title: "Image Generated!", description: "Your AI-powered image is ready." });
        } else if (imageState.error) {
            toast({ title: "Image Error", description: imageState.error, variant: 'destructive' });
        }
    }, [imageState, toast]);


    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
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
    
    const handleGenerateImage = (formData: FormData) => {
        if (!title.trim()) {
            toast({
                title: 'Title is required',
                description: 'Please enter a title before generating an image.',
                variant: 'destructive',
            });
            return;
        }
        imageFormAction(formData);
    }
    
    const handleGenerateIdeas = (formData: FormData) => {
        ideasFormAction(formData);
        setIsAlertOpen(false); // Close dialog on submit
    }
    
    const handlePublish = () => {
        // In a real app, this would commit the file to GitHub.
        toast({
            title: "Changes Published!",
            description: "Your post has been successfully committed to GitHub.",
        });
    };

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader className="flex-row items-center justify-between">
                       <div>
                            <CardTitle className="font-headline">Blog Post Editor</CardTitle>
                            <CardDescription>Create and edit your Jekyll blog posts here.</CardDescription>
                       </div>
                        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                            <AlertDialogTrigger asChild>
                                 <Button variant="outline" disabled={!isPro}>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Suggest Ideas
                                    {!isPro && <Badge variant="destructive" className="ml-2 bg-accent text-accent-foreground">PRO</Badge>}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <form action={handleGenerateIdeas}>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Generate Content Ideas</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Enter a topic or theme, and the AI will generate a list of potential blog post ideas for you.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="my-4">
                                        <Label htmlFor="idea-topic" className="mb-2 block">Topic</Label>
                                        <Input
                                            id="idea-topic"
                                            name="topic"
                                            value={ideaTopic}
                                            onChange={(e) => setIdeaTopic(e.target.value)}
                                            placeholder="e.g., 'Latest trends in AI'"
                                            required
                                        />
                                        <input type="hidden" name="schema" value="post" />
                                    </div>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction type="submit" disabled={isIdeasLoading}>
                                            {isIdeasLoading ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                            {isIdeasLoading ? 'Thinking...' : 'Generate Ideas'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </form>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="title">Title</Label>
                                <Input id="title" placeholder="Your post title" value={title} onChange={(e) => setTitle(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="author">Author</Label>
                                <Input id="author" placeholder="Author name" />
                            </div>
                        </div>
                        <div className="grid gap-2">
                           <Label>Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-[280px] justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid gap-4">
                            <Label>Featured Image</Label>
                            <Card>
                                <CardContent className="p-4">
                                    <Tabs defaultValue="upload">
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="upload">Upload Image</TabsTrigger>
                                            <TabsTrigger value="ai" disabled={!isPro}>
                                                Generate with AI
                                                {!isPro && <Badge variant="destructive" className="ml-2 bg-accent text-accent-foreground">PRO</Badge>}
                                            </TabsTrigger>
                                        </TabsList>
                                        <div className="mt-4 flex justify-center items-center bg-secondary/50 rounded-md min-h-[200px]">
                                            {isImageLoading ? (
                                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                    <Sparkles className="h-8 w-8 animate-spin"/>
                                                    <p>Generating your image...</p>
                                                </div>
                                            ) : imagePreview ? (
                                                <Image src={imagePreview} alt="Featured image preview" width={400} height={200} className="rounded-md object-contain max-h-[400px]" />
                                            ) : (
                                                <div className="text-center text-muted-foreground p-4">
                                                    <ImageIcon className="mx-auto h-12 w-12 mb-2" />
                                                    <p>Image preview will appear here</p>
                                                </div>
                                            )}
                                        </div>
                                        <TabsContent value="upload" className="mt-4">
                                             <div className="grid gap-2">
                                                <Label htmlFor="picture">Upload an image (max 1MB)</Label>
                                                <Input id="picture" type="file" accept="image/*" onChange={handleImageUpload} />
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="ai" className="mt-4">
                                            <form action={handleGenerateImage} className="grid gap-3">
                                                <input type="hidden" name="prompt" value={title} />
                                                <p className="text-sm text-muted-foreground">
                                                    The post title will be used as the prompt to generate the image. You can edit the title to refine the result.
                                                </p>
                                                <Button type="submit" disabled={isImageLoading || !isPro}>
                                                    {isImageLoading ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                                    Generate Image
                                                </Button>
                                            </form>
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="content">Content</Label>
                            <Textarea
                                id="content"
                                placeholder="Start writing your masterpiece..."
                                className="min-h-[400px] text-base"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="justify-end gap-2">
                        <Button variant="outline">Save Draft</Button>
                        <Button onClick={handlePublish}>
                            <GitBranch className="mr-2 h-4 w-4" />
                            Publish to GitHub
                        </Button>
                    </CardFooter>
                </Card>
            </div>
            <div className="lg:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center">
                            <Bot className="mr-2" />
                            AI Assistant
                        </CardTitle>
                        <CardDescription>Supercharge your writing with AI.</CardDescription>
                    </CardHeader>
                    <div className="relative">
                        {!isPro && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10 rounded-lg">
                                <Lock className="h-10 w-10 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold font-headline">Unlock AI Features</h3>
                                <p className="text-sm text-muted-foreground mb-4">Upgrade to Pro to use the AI Assistant.</p>
                                <Button asChild>
                                    <Link href="/pricing">Upgrade</Link>
                                </Button>
                            </div>
                        )}
                        <CardContent className="grid gap-6">
                            <form action={draftFormAction} className="grid gap-3">
                                <h3 className="font-semibold flex items-center">
                                    Generate Full Post
                                    <Badge variant="destructive" className="ml-2 bg-accent text-accent-foreground">PRO</Badge>
                                </h3>
                                <input type="hidden" name="contentSchema" value="post" />
                                <div className="grid gap-2">
                                    <Label htmlFor="theme">Topic / Theme</Label>
                                    <Input
                                        id="theme"
                                        name="theme"
                                        placeholder="e.g., 'A guide to serverless functions'"
                                        required
                                        value={theme}
                                        onChange={(e) => setTheme(e.target.value)}
                                        disabled={!isPro}
                                    />
                                </div>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="w-full">
                                                <Button type="submit" disabled={isDraftLoading || !isPro} className="w-full">
                                                    {isDraftLoading ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                                    {isDraftLoading ? 'Generating...' : 'Create Full Post'}
                                                </Button>
                                            </div>
                                        </TooltipTrigger>
                                        {!isPro && (
                                            <TooltipContent>
                                                <p>Upgrade to Pro to use this feature.</p>
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                </TooltipProvider>
                            </form>
                            <div className="grid gap-3">
                                <h3 className="font-semibold flex items-center">
                                    Content Ideas
                                    <Badge variant="destructive" className="ml-2 bg-accent text-accent-foreground">PRO</Badge>
                                </h3>
                                {isIdeasLoading && (
                                    <div className="space-y-2 mt-2">
                                        <Skeleton className="h-8 w-full" />
                                        <Skeleton className="h-8 w-full" />
                                        <Skeleton className="h-8 w-5/6" />
                                    </div>
                                )}
                                {ideasState.ideas.length > 0 && !isIdeasLoading && (
                                    <div className="mt-4 space-y-2">
                                        {ideasState.ideas.map((idea, index) => (
                                            <Card key={index} className="bg-secondary/50 p-3 text-sm cursor-pointer hover:bg-secondary" onClick={() => {
                                                setTitle(idea);
                                                setTheme(idea);
                                                setContent(''); // Clear content to start fresh with the new idea
                                            }}>
                                                {idea}
                                            </Card>
                                        ))}
                                    </div>
                                )}
                                {ideasState.ideas.length === 0 && !isIdeasLoading && (
                                    <p className="text-sm text-muted-foreground">Click "Suggest Ideas" to get a list of topics based on your chosen topic.</p>
                                )}
                            </div>
                        </CardContent>
                    </div>
                </Card>
            </div>
        </div>
    );
}
