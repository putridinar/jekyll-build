
'use client';

import * as React from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2, Sparkles, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { publishContent } from '@/actions/content';
import { generateImage } from '@/actions/ai';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { generatePostContent } from '@/ai/flows/post-generator-flow';
import { checkAndRecordPostGeneration, checkAndRecordImageGeneration } from '@/actions/user';

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  author: z.string().optional(),
  categories: z.string().optional(),
  mainImage: z.string().optional(),
  content: z.string().min(10, 'Content must be at least 10 characters.'),
});

type PostFormValues = z.infer<typeof formSchema>;


function AiImageGenerateButton({ form }: { form: UseFormReturn<PostFormValues> }) {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = React.useState(false);
  
    const handleGenerate = async () => {
      const title = form.getValues('title');
      if (!title) {
          toast({
              variant: 'destructive',
              title: 'Title is required',
              description: 'Please enter a title before generating an image.',
          });
          return;
      }
      const prompt = title;

      setIsGenerating(true);
      toast({ title: 'Generating image...', description: 'This may take a moment.' });
      
      try {
        const checkResult = await checkAndRecordImageGeneration();
        if (!checkResult.success) {
            toast({
                title: 'Limit Reached',
                description: checkResult.error,
                variant: 'destructive',
            });
            return;
        }

        const result = await generateImage(prompt);
        if (result.success && result.data) {
          form.setValue('mainImage', result.data.content, { shouldValidate: true });
          toast({ title: 'Image Generated!', description: 'The new image has been set as the main image.' });
        } else {
          throw new Error(result.error || 'Failed to generate image.');
        }
      } catch (error: any) {
        toast({
          title: 'Generation Failed',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setIsGenerating(false);
      }
    };
  
    return (
        <Button size="sm" variant="outline" type="button" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {isGenerating ? 'Generating...' : 'Generate with AI'}
        </Button>
    );
}

function ImageUpload({ field, form }: { field: any, form: UseFormReturn<PostFormValues> }) {
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Image size cannot exceed 800KB.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        field.onChange(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-2">
      <FormLabel>Image</FormLabel>
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 rounded-md border border-dashed flex items-center justify-center bg-muted/50">
          {field.value ? (
            <Image
              src={field.value}
              alt="Image preview"
              width={96}
              height={96}
              className="object-cover rounded-md"
            />
          ) : (
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-2">
            <Input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileChange}
              className="flex-1"
            />
            <AiImageGenerateButton form={form} />
        </div>
      </div>
       <FormMessage />
    </div>
  );
}

export function PostEditor({
  open,
  onOpenChange,
  onPostPublished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostPublished: (data: { filename: string; content: string }) => void;
}) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const form = useForm<PostFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      author: user?.displayName || '',
      categories: '',
      mainImage: '',
      content: '',
    },
  });
  
  React.useEffect(() => {
    if (user?.displayName) {
      form.setValue('author', user.displayName);
    }
    // Reset form when the sheet is closed
    if (!open) {
        form.reset({
            title: '',
            author: user?.displayName || '',
            categories: '',
            mainImage: '',
            content: '',
        });
    }
  }, [user, open, form]);


  const onSubmit = async (values: PostFormValues) => {
    setIsSubmitting(true);
    toast({ title: 'Publishing post...', description: 'Please wait.' });

    try {
        const slug = values.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
        const postData = { ...values, slug };
        
        const result = await publishContent('posts', postData);

        if (result.success && 'savedData' in result && result.savedData) {
            toast({
                title: 'Post Published!',
                description: 'Your post has been successfully published to GitHub.',
            });
            onPostPublished(result.savedData);
            form.reset();
            onOpenChange(false);
        } else {
          if ('error' in result) {
            toast({
              variant: 'destructive',
              title: 'Publishing Failed',
              description: result.error,
            });
          }
        }

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Publishing Failed',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerate = async () => {
    const title = form.getValues('title');
    if (!title) {
        toast({
            variant: 'destructive',
            title: 'Title is required',
            description: 'Please enter a title to generate content.',
        });
        return;
    }

    setIsGenerating(true);
    toast({ title: 'Generating AI Content...', description: 'Please wait, this can take a moment.'});

    try {
        // Step 1: Check generation permission
        const checkResult = await checkAndRecordPostGeneration();
        if (!checkResult.success) {
            toast({
                variant: 'destructive',
                title: 'Limit Reached',
                description: checkResult.error,
            });
            setIsGenerating(false);
            return;
        }

        // Step 2: Proceed with content generation
        const result = await generatePostContent(title);
        form.setValue('categories', result.categories);
        form.setValue('content', result.content);
        toast({
            title: 'Content Generated!',
            description: 'The AI has filled in the categories and content for you.',
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'AI Generation Failed',
            description: error.message,
        });
    } finally {
        setIsGenerating(false);
    }
  }

  const sheetSide = isMobile ? 'bottom' : 'right';
  const contentClass = isMobile ? 'h-full' : 'w-full max-w-2xl';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={sheetSide}
        className={cn('flex flex-col gap-0 p-0', contentClass)}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader className="p-6">
          <SheetTitle>Create New Post</SheetTitle>
          <SheetDescription>
            Fill out the details below. Click publish when you're ready.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6">
            <Form {...form}>
            <form id="post-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Post Title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mainImage"
                render={({ field }) => <ImageUpload field={field} form={form} />}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Author</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Jane Doe" {...field} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categories</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., tech, travel" {...field} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Write your post content here. Markdown is supported."
                        className="min-h-[200px] md:min-h-[350px]"
                        {...field}
                      />
                    </FormControl>
                     <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <SheetFooter className="px-2 py-3 flex justify-between items-center bg-background border-t">
          <Button size="sm" variant="outline" onClick={handleGenerate} disabled={isSubmitting || isGenerating}>
            {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate Content
          </Button>
          <Button type="submit" size="sm" form="post-form" disabled={isSubmitting || isGenerating}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publish Post
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
