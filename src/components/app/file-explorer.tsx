
'use client';

import { FileCode, Folder, FolderPlus, Sparkles, Upload, ChevronRight, Plus, Trash2, Pencil } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { FileNode } from '@/types';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import type { User } from 'firebase/auth';
import { generateImage } from '@/actions/ai';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';

type CustomUser = User & { role?: string };

type FileExplorerProps = {
  fileStructure: FileNode[];
  activeFile: string;
  onFileSelect: (path: string) => void;
  onUploadClick: () => void;
  onAiImageGenerated: (data: { filename: string; content: string }) => void;
  user: CustomUser | null;
  expandedFolders: Set<string>;
  onFolderToggle: (path: string) => void;
  onNewFile: (parentPath: string | null) => void;
  onNewFolder: (parentPath: string | null) => void;
  onFileDelete: (path: string) => void;
  renamingPath: string | null;
  onRename: (path: string, newName: string) => void;
  setRenamingPath: (path: string | null) => void;
};

type AIGenerateButtonProps = {
  user: CustomUser | null;
  onImageGenerated: (data: { filename: string; content: string }) => void;
};

function AIGenerateButton({ user, onImageGenerated }: AIGenerateButtonProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [prompt, setPrompt] = React.useState('');
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleGenerateClick = () => {
    if (user?.role === 'proUser') {
      setIsOpen(true);
    } else {
      toast({
        title: 'Upgrade to Pro',
        description: (
            <div className="flex flex-col gap-4">
                <p>AI image generation is a Pro feature.</p>
                <Button onClick={() => router.push('/upgrade')}>Upgrade Now</Button>
            </div>
        ),
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
  onUploadClick,
  user,
  onAiImageGenerated,
  expandedFolders,
  onFolderToggle,
  onNewFile,
  onNewFolder,
  onFileDelete,
  renamingPath,
  onRename,
  setRenamingPath,
  level = 0,
}: Omit<FileExplorerProps, 'fileStructure'> & { level?: number; }) {
    const isMobile = useIsMobile();
    const sortedNodes = [...nodes].sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
    });

    const handleRenameSubmit = (e: React.FormEvent<HTMLFormElement>, path: string) => {
        e.preventDefault();
        const newName = (e.target as any).name.value;
        onRename(path, newName);
    };

    return (
        <>
            {sortedNodes.map((node) => {
                const isExpanded = expandedFolders.has(node.path);
                const isRenaming = renamingPath === node.path;
                
                const itemContent = (
                    <>
                         {node.type === 'folder' ? (
                            <>
                                <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform duration-200', isExpanded && 'rotate-90')} />
                                <Folder className="h-4 w-4" />
                            </>
                        ) : (
                            <FileCode className="h-4 w-4 ml-5" />
                        )}
                        {isRenaming ? (
                           <form onSubmit={(e) => handleRenameSubmit(e, node.path)} className="flex-1">
                                <Input
                                    type="text"
                                    name="name"
                                    defaultValue={node.name}
                                    className="h-6 px-1 text-sm w-full"
                                    autoFocus
                                    onBlur={() => setRenamingPath(null)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                           </form>
                        ) : (
                            <span 
                                className={cn("truncate", node.type === 'folder' ? 'font-semibold text-foreground' : 'font-medium')}
                                onDoubleClick={() => !isRenaming && setRenamingPath(node.path)}
                            >
                                {node.name}
                            </span>
                        )}
                    </>
                );

                const item = (
                    <div
                        className={cn(
                            'group relative flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm',
                            'hover:bg-muted',
                            (activeFile === node.path ? 'bg-muted text-foreground' : 'text-muted-foreground'),
                        )}
                        style={{ paddingLeft: `${0.5 + level * 1}rem` }}
                        onClick={() => {
                            if (isRenaming) return;
                            if (node.type === 'folder') {
                                onFolderToggle(node.path)
                            } else {
                                onFileSelect(node.path)
                            }
                        }}
                    >
                       {itemContent}

                        <div className={cn(
                            "ml-auto flex items-center", 
                            isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}>
                             {node.type === 'folder' && node.path !== 'assets/images' && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onNewFile(node.path); }}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>New File</p></TooltipContent>
                                </Tooltip>
                             )}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setRenamingPath(node.path); }}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Rename</p></TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onFileDelete(node.path); }}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Delete</p></TooltipContent>
                            </Tooltip>

                            {node.path === 'assets/images' && (
                                <>
                                    <AIGenerateButton user={user} onImageGenerated={onAiImageGenerated} />
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onUploadClick();
                                                }}
                                                aria-label={`Upload to ${node.name}`}
                                            >
                                                <Upload className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Upload</p></TooltipContent>
                                    </Tooltip>
                                </>
                            )}
                        </div>
                    </div>
                );

                return (
                    <div key={node.path}>
                        {item}
                        {node.type === 'folder' && node.children && isExpanded && (
                            <FileTree
                                nodes={node.children}
                                activeFile={activeFile}
                                onFileSelect={onFileSelect}
                                onUploadClick={onUploadClick}
                                user={user}
                                onAiImageGenerated={onAiImageGenerated}
                                expandedFolders={expandedFolders}
                                onFolderToggle={onFolderToggle}
                                onNewFile={onNewFile}
                                onNewFolder={onNewFolder}
                                onFileDelete={onFileDelete}
                                renamingPath={renamingPath}
                                onRename={onRename}
                                setRenamingPath={setRenamingPath}
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
  onUploadClick,
  onAiImageGenerated,
  user,
  expandedFolders,
  onFolderToggle,
  onNewFile,
  onNewFolder,
  onFileDelete,
  renamingPath,
  onRename,
  setRenamingPath
}: FileExplorerProps) {
  return (
    <aside className="z-10 flex w-full flex-col border-r bg-background md:w-72">
      <div className="flex h-14 shrink-0 items-center justify-between p-2 px-4">
        <h2 className="font-headline text-lg font-semibold">Workspace</h2>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 overflow-y-auto p-2 min-h-0">
        <FileTree
          nodes={fileStructure}
          activeFile={activeFile}
          onFileSelect={onFileSelect}
          onUploadClick={onUploadClick}
          onAiImageGenerated={onAiImageGenerated}
          user={user}
          expandedFolders={expandedFolders}
          onFolderToggle={onFolderToggle}
          onNewFile={onNewFile}
          onNewFolder={onNewFolder}
          onFileDelete={onFileDelete}
          renamingPath={renamingPath}
          onRename={onRename}
          setRenamingPath={setRenamingPath}
        />
      </nav>
    </aside>
  );
}
