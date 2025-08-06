'use client';

import { FileCode, Folder, FolderPlus, Plus, Sparkles, Trash2, Upload, ChevronRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { FileNode } from '@/types';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Button } from '../ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import type { User } from 'firebase/auth';
import { generateImage } from '@/actions/ai';

type CustomUser = User & { role?: string };

type FileExplorerProps = {
  fileStructure: FileNode[];
  activeFile: string;
  onFileSelect: (path: string) => void;
  onNewFile: (path: string) => void;
  onNewFolder: () => void;
  onFileDelete: (path: string) => void;
  onUploadClick: () => void;
  onAiImageGenerated: (data: { filename: string; content: string }) => void;
  user: CustomUser | null;
  expandedFolders: Set<string>;
  onFolderToggle: (path: string) => void;
};

type AIGenerateButtonProps = {
  user: CustomUser | null;
  onImageGenerated: (data: { filename: string; content: string }) => void;
};

function AIGenerateButton({ user, onImageGenerated }: AIGenerateButtonProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = React.useState(false);
  const [prompt, setPrompt] = React.useState('');
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleGenerateClick = () => {
    if (user?.role === 'proUser') {
      setIsOpen(true);
    } else {
      toast({
        title: 'Upgrade to Pro',
        description: 'AI image generation is a Pro feature. Please upgrade your account to use it.',
        variant: 'destructive',
      });
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    toast({ title: 'Generating image...', description: 'This may take a moment.' });
    try {
      const result = await generateImage(prompt);
      if (result.success && result.data) {
        onImageGenerated(result.data);
        setIsOpen(false);
        setPrompt('');
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); handleGenerateClick(); }}
            aria-label="Generate image with AI"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Generate with AI</p>
        </TooltipContent>
      </Tooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Image with AI</DialogTitle>
          <DialogDescription>
            Describe the image you want to create. Be as specific as possible for the best results.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            placeholder="e.g., A futuristic city skyline at sunset, synthwave style"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleGenerate} disabled={isGenerating || !prompt}>
            {isGenerating && <Sparkles className="mr-2 h-4 w-4 animate-pulse" />}
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function FileTree({
  nodes,
  activeFile,
  onFileSelect,
  onNewFile,
  onFileDelete,
  onUploadClick,
  isMobile,
  user,
  onAiImageGenerated,
  expandedFolders,
  onFolderToggle,
  level = 0,
}: {
  nodes: FileNode[];
  activeFile: string;
  onFileSelect: (path: string) => void;
  onNewFile: (path: string) => void;
  onFileDelete: (path: string) => void;
  onUploadClick: () => void;
  isMobile: boolean;
  user: CustomUser | null;
  onAiImageGenerated: (data: { filename: string; content: string }) => void;
  expandedFolders: Set<string>;
  onFolderToggle: (path: string) => void;
  level?: number;
}) {
  const sortedNodes = [...nodes].sort((a, b) => {
    if (a.type === 'folder' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });
  
  return (
    <>
      {sortedNodes.map((node) => {
        const isExpanded = expandedFolders.has(node.path);
        return (
          <div key={node.path}>
            <div
              className={cn(
                'group relative flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted',
                activeFile === node.path
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground',
              )}
              style={{ paddingLeft: `${0.5 + level * 1}rem` }}
              onClick={() => (node.type === 'folder' ? onFolderToggle(node.path) : onFileSelect(node.path))}
            >
              {node.type === 'folder' ? (
                <>
                  <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform duration-200', isExpanded && 'rotate-90')} />
                  <Folder className="h-4 w-4" />
                </>
              ) : (
                <FileCode className="h-4 w-4 ml-5" />
              )}
              <span className={cn("truncate", node.type === 'folder' && 'font-semibold text-foreground')}>{node.name}</span>

              <div className="ml-auto flex items-center">
                 {node.type === 'folder' && (
                   <div className={cn("flex items-center", isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
                      {node.path === 'assets/images' && (
                          <AIGenerateButton user={user} onImageGenerated={onAiImageGenerated} />
                      )}
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (node.path === 'assets/images') {
                                      onUploadClick();
                                    } else {
                                      onNewFile(node.path);
                                    }
                                  }}
                                  aria-label={node.path === 'assets/images' ? `Upload to ${node.name}` :`New file in ${node.name}`}
                              >
                                  {node.path === 'assets/images' ? <Upload className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{node.path === 'assets/images' ? 'Upload Image' : 'New File'}</p>
                          </TooltipContent>
                      </Tooltip>
                   </div>
                  )}
                 {node.type === 'file' && (
                   <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7",
                        isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFileDelete(node.path);
                      }}
                      aria-label={`Delete ${node.name}`}
                   >
                      <Trash2 className="h-4 w-4" />
                   </Button>
                  )}
              </div>
            </div>
            {node.type === 'folder' && node.children && isExpanded && (
              <FileTree
                nodes={node.children}
                activeFile={activeFile}
                onFileSelect={onFileSelect}
                onNewFile={onNewFile}
                onFileDelete={onFileDelete}
                onUploadClick={onUploadClick}
                isMobile={isMobile}
                user={user}
                onAiImageGenerated={onAiImageGenerated}
                expandedFolders={expandedFolders}
                onFolderToggle={onFolderToggle}
                level={level + 1}
              />
            )}
          </div>
        )
      })}
    </>
  );
}

export function FileExplorer({
  fileStructure,
  activeFile,
  onFileSelect,
  onNewFile,
  onFileDelete,
  onUploadClick,
  onAiImageGenerated,
  user,
  expandedFolders,
  onFolderToggle,
}: FileExplorerProps) {
  const isMobile = useIsMobile();
  return (
    <aside className="flex w-full flex-col border-r bg-background/80 backdrop-blur-sm md:w-72">
      <div className="flex h-14 shrink-0 items-center justify-between p-2 px-4">
        <h2 className="font-headline text-lg font-semibold">Workspace</h2>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        <FileTree
          nodes={fileStructure}
          activeFile={activeFile}
          onFileSelect={onFileSelect}
          onNewFile={onNewFile}
          onFileDelete={onFileDelete}
          onUploadClick={onUploadClick}
          onAiImageGenerated={onAiImageGenerated}
          isMobile={isMobile}
          user={user}
          expandedFolders={expandedFolders}
          onFolderToggle={onFolderToggle}
        />
      </nav>
    </aside>
  );
}
