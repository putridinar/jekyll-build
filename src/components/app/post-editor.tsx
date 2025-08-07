
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
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
import { Loader2, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { publishContent } from '@/actions/content';
import Image from 'next/image';
import { useAuth } from './auth-provider';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  author: z.string().optional(),
  categories: z.string().optional(),
  mainImage: z.string().optional(),
  content: z.string().min(10, 'Content must be at least 10 characters.'),
});

type PostFormValues = z.infer<typeof formSchema>;

function ImageUpload({ field }: { field: any }) {
  const [preview, setPreview] = React.useState<string | null>(field.value);
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
        setPreview(dataUrl);
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
          {preview ? (
            <Image
              src={preview}
              alt="Image preview"
              width={96}
              height={96}
              className="object-cover rounded-md"
            />
          ) : (
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <Input
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleFileChange}
          className="flex-1"
        />
      </div>
       <FormMessage />
    </div>
  );
}

export function PostEditor({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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
  }, [user, form]);


  const onSubmit = async (values: PostFormValues) => {
    setIsSubmitting(true);
    toast({ title: 'Publishing post...', description: 'Please wait.' });

    try {
        const slug = values.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
        const postData = { ...values, slug };
        
        const result = await publishContent('posts', postData);

        if (result.success) {
            toast({
                title: 'Post Published!',
                description: 'Your post has been successfully published to GitHub.',
            });
            form.reset();
            onOpenChange(false);
        } else {
          if ('error' in result) {
            console.error(result.error);
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
                render={({ field }) => <ImageUpload field={field} />}
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
                        className="min-h-[250px] md:min-h-[400px]"
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
        <SheetFooter className="p-6 bg-background border-t">
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <Button type="submit" form="post-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publish Post
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

    