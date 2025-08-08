
'use client';

import { FileCode, Folder, FolderPlus, Upload, ChevronRight, Plus, Trash2, Pencil } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { FileNode } from '@/types';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import type { User } from 'firebase/auth';
import { useIsMobile } from '@/hooks/use-mobile';

type CustomUser = User & { role?: string };

type FileExplorerProps = {
  fileStructure: FileNode[];
  activeFile: string;
  onFileSelect: (path: string) => void;
  onUploadClick: () => void;
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

type FileTreeProps = Omit<FileExplorerProps, 'fileStructure' | 'user'> & {
    nodes: FileNode[];
    level?: number;
};


function FileTree({
  nodes,
  activeFile,
  onFileSelect,
  onUploadClick,
  expandedFolders,
  onFolderToggle,
  onNewFile,
  onNewFolder,
  onFileDelete,
  renamingPath,
  onRename,
  setRenamingPath,
  level = 0,
}: FileTreeProps) {
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
                             {node.type === 'folder' && (
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
