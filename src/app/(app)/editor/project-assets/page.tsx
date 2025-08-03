
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Folder, File, Upload, GitBranch, ChevronRight, Plus, FolderPlus, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsPro } from '@/hooks/use-is-pro';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type FileItem = {
    name: string;
    type: 'file';
    content: string;
    path: string;
};

type FolderItem = {
    name: string;
    type: 'folder';
    path: string;
    children: (FileItem | FolderItem)[];
};

type FileSystemItem = FileItem | FolderItem;

const initialFiles: FolderItem[] = [
    {
        name: '_layouts',
        type: 'folder',
        path: '_layouts',
        children: [
            { name: 'default.html', type: 'file', path: '_layouts/default.html', content: `<!DOCTYPE html>
<html>
<head>
    <title>{{ page.title }}</title>
</head>
<body>
    <header>
        {% include header.html %}
    </header>
    <main>
        {{ content }}
    </main>
    <footer>
        {% include footer.html %}
    </footer>
</body>
</html>` },
            { name: 'post.html', type: 'file', path: '_layouts/post.html', content: `---
layout: default
---
<h1>{{ page.title }}</h1>
<p>{{ page.date | date_to_string }} - Written by {{ page.author }}</p>
{{ content }}` },
        ],
    },
    {
        name: '_includes',
        type: 'folder',
        path: '_includes',
        children: [
            { name: 'header.html', type: 'file', path: '_includes/header.html', content: `<header><h1>My Awesome Blog</h1></header>` },
            { name: 'footer.html', type: 'file', path: '_includes/footer.html', content: `<footer><p>&copy; 2024 My Blog</p></footer>` },
        ],
    },
    {
        name: 'assets',
        type: 'folder',
        path: 'assets',
        children: [
            { name: 'css', type: 'folder', path: 'assets/css', children: [
                { name: 'style.css', type: 'file', path: 'assets/css/style.css', content: '/* Add your styles here */' }
            ] },
            { name: 'js', type: 'folder', path: 'assets/js', children: [
                 { name: 'main.js', type: 'file', path: 'assets/js/main.js', content: '// Add your scripts here' }
            ] },
            { name: 'images', type: 'folder', path: 'assets/images', children: [] },
            { name: 'main.scss', type: 'file', path: 'assets/main.scss', content: `body { font-family: sans-serif; }` },
        ]
    }
];

const FreeUpgradeDialog = () => (
     <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
                <Crown className="mr-2 h-5 w-5 text-yellow-500" />
                Upgrade to Pro to Create Files & Folders
            </AlertDialogTitle>
            <AlertDialogDescription>
                Creating new files and folders directly within the editor is a Pro feature. Upgrade your plan to unlock this and other powerful AI tools.
            </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
                <Link href="/pricing">Upgrade to Pro</Link>
            </AlertDialogAction>
        </AlertDialogFooter>
    </AlertDialogContent>
);


function FileTree({ items, onFileSelect, activeFile, openFolders, onToggleFolder, onAddFile, onAddImage }: {
    items: FileSystemItem[];
    onFileSelect: (file: FileItem) => void;
    activeFile: FileItem | null;
    openFolders: Set<string>;
    onToggleFolder: (path: string) => void;
    onAddFile: (folderPath: string, fileName: string) => void;
    onAddImage: (fileName: string, content: string) => void;
}) {
    const [newFileName, setNewFileName] = useState("");
    const isPro = useIsPro();
    const { toast } = useToast();

    const handleCreateFile = (folderPath: string) => {
        if (newFileName.trim()) {
            onAddFile(folderPath, newFileName);
            setNewFileName(""); // Reset input
        }
    };
    
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                toast({ title: "File too large", description: "Please upload an image smaller than 2MB.", variant: "destructive" });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                onAddImage(file.name, reader.result as string);
                toast({ title: "Image Uploaded", description: `Successfully added ${file.name} to assets/images.` });
            };
            reader.readAsDataURL(file);
        }
    };

    const ProAddNewFileDialog = ({ itemPath, itemName }: { itemPath: string, itemName: string }) => (
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Create a new file in '{itemName}'</AlertDialogTitle>
                <AlertDialogDescription>
                    Enter a name for the new file. Include the file extension (e.g., 'new-page.html').
                </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
                placeholder="e.g., filename.html"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateFile(itemPath);
                        const actionButton = (e.target as HTMLElement).closest('div[role="alertdialog"]')?.querySelector<HTMLButtonElement>('[data-alert-action="true"]');
                        actionButton?.click();
                    }
                }}
            />
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction data-alert-action="true" onClick={() => handleCreateFile(itemPath)}>Create</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    );

    return (
        <div className="space-y-1">
            {items.map((item) => {
                if (item.type === 'folder') {
                    const isOpen = openFolders.has(item.path);
                    return (
                        <div key={item.path}>
                            <div className="flex items-center group">
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start h-8"
                                    onClick={() => onToggleFolder(item.path)}
                                >
                                    <ChevronRight className={cn('h-4 w-4 mr-2 transition-transform', isOpen && 'rotate-90')} />
                                    <Folder className="h-4 w-4 mr-2 text-sky-500" />
                                    {item.name}
                                </Button>
                                {item.path !== 'assets/images' ? (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        {isPro ? <ProAddNewFileDialog itemPath={item.path} itemName={item.name} /> : <FreeUpgradeDialog />}
                                    </AlertDialog>
                                ) : (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                 <label htmlFor="image-upload" className="cursor-pointer">
                                                    <Button variant="ghost" size="icon" asChild className="h-6 w-6 opacity-0 group-hover:opacity-100">
                                                        <span>
                                                            <Upload className="h-4 w-4" />
                                                            <Input id="image-upload" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                                        </span>
                                                    </Button>
                                                </label>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Upload files to this folder</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                            {isOpen && (
                                <div className="pl-6 border-l border-dashed ml-2">
                                    <FileTree
                                        items={item.children}
                                        onFileSelect={onFileSelect}
                                        activeFile={activeFile}
                                        openFolders={openFolders}
                                        onToggleFolder={onToggleFolder}
                                        onAddFile={onAddFile}
                                        onAddImage={onAddImage}
                                    />
                                </div>
                            )}
                        </div>
                    );
                } else {
                    return (
                        <Button
                            key={item.path}
                            variant="ghost"
                            className={cn(
                                "w-full justify-start h-8",
                                activeFile?.path === item.path && "bg-muted font-semibold"
                            )}
                            onClick={() => onFileSelect(item)}
                        >
                            <File className="h-4 w-4 mr-2 text-gray-500" />
                            {item.name}
                        </Button>
                    );
                }
            })}
        </div>
    );
}

export default function ProjectPage() {
    const [files, setFiles] = useState<FileSystemItem[]>(initialFiles);
    const [activeFile, setActiveFile] = useState<FileItem | null>(null);
    const [editorContent, setEditorContent] = useState<string>('');
    const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(['_layouts', '_includes', 'assets']));
    const [newFolderName, setNewFolderName] = useState("");
    const { toast } = useToast();
    const isPro = useIsPro();


    const handleFileSelect = (file: FileItem) => {
        setActiveFile(file);
        setEditorContent(file.content || '');
    }
    
    const handleToggleFolder = (path: string) => {
        setOpenFolders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(path)) {
                newSet.delete(path);
            } else {
                newSet.add(path);
            }
            return newSet;
        });
    };
    
    const updateFileTree = (items: FileSystemItem[], updateFn: (item: FileSystemItem) => FileSystemItem): FileSystemItem[] => {
         return items.map(item => {
            const updatedItem = updateFn(item);
            if (updatedItem.type === 'folder' && updatedItem.children) {
                return { ...updatedItem, children: updateFileTree(updatedItem.children, updateFn) };
            }
            return updatedItem;
        });
    }

    const handleAddImage = (fileName: string, content: string) => {
        const newImageFile: FileItem = {
            name: fileName,
            type: 'file',
            path: `assets/images/${fileName}`,
            content: content,
        };

        const newFiles = [...files];
        const assetsFolder = newFiles.find(f => f.path === 'assets') as FolderItem | undefined;
        if (assetsFolder) {
            const imagesFolder = assetsFolder.children.find(f => f.path === 'assets/images') as FolderItem | undefined;
            if (imagesFolder) {
                 if (imagesFolder.children.some(child => child.name === fileName)) {
                    toast({ title: "File Exists", description: `An image named "${fileName}" already exists.`, variant: "destructive" });
                    return;
                }
                imagesFolder.children.push(newImageFile);
                setFiles(newFiles);
            }
        }
    };


    const handleAddFile = (folderPath: string, fileName: string) => {
        if (!fileName.trim()) {
            toast({ title: "Invalid Name", description: "File name cannot be empty.", variant: "destructive" });
            return;
        }

        const newFilePath = `${folderPath}/${fileName}`;
        
        const addFileToTree = (items: FileSystemItem[]): FileSystemItem[] => {
            return items.map(item => {
                if (item.path === newFilePath && item.type === 'file') {
                    // This is a placeholder for error handling, though it's unlikely to happen with unique paths.
                    return item; 
                }
                if (item.type === 'folder') {
                    // Check for duplicate file name in the target folder
                    if (item.path === folderPath) {
                        if (item.children.some(child => child.name === fileName)) {
                           toast({ title: "File Exists", description: `A file named "${fileName}" already exists in this folder.`, variant: "destructive" });
                           throw new Error("File exists"); // Throw to stop the process
                        }
                        const newFile: FileItem = { name: fileName, type: 'file', path: newFilePath, content: '' };
                        return { ...item, children: [...item.children, newFile] };
                    }
                    // Recurse into subfolders
                    return { ...item, children: addFileToTree(item.children) };
                }
                return item;
            });
        };

        try {
            const newFiles = addFileToTree(files);
            setFiles(newFiles);
            toast({ title: "File Created!", description: `Successfully created ${newFilePath}`});
        } catch (error) {
            // Error toast is handled inside the recursive function
        }
    };
    
    const handleAddFolder = () => {
        if (!newFolderName.trim()) {
            toast({ title: "Invalid Name", description: "Folder name cannot be empty.", variant: "destructive" });
            return;
        }

        const newFolder: FolderItem = {
            name: newFolderName,
            type: 'folder',
            path: newFolderName, // This assumes root level for simplicity. A real implementation would need a target path.
            children: [],
        };
        
        // Check for duplicates at the root level
        if (files.some(item => item.name === newFolderName)) {
            toast({ title: "Folder Exists", description: `A folder named "${newFolderName}" already exists at the root.`, variant: "destructive" });
            return;
        }

        setFiles(prevFiles => [...prevFiles, newFolder]);
        setOpenFolders(prev => new Set(prev).add(newFolder.path));
        setNewFolderName(""); // Reset input
        toast({ title: "Folder Created!", description: `Successfully created folder "${newFolderName}"` });
    };

    const ProAddFolderDialog = () => (
         <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Create a new folder</AlertDialogTitle>
                <AlertDialogDescription>
                    Enter a name for the new folder at the root of your project.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
                placeholder="e.g., _data"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFolder();
                         const actionButton = (e.target as HTMLElement).closest('div[role="alertdialog"]')?.querySelector<HTMLButtonElement>('[data-alert-action="true"]');
                        actionButton?.click();
                    }
                }}
            />
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction data-alert-action="true" onClick={handleAddFolder}>Create Folder</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    );

    const handlePublish = () => {
        // In a real app, this would commit the file to GitHub.
        toast({
            title: "Changes Published!",
            description: "Your file changes have been successfully committed to GitHub.",
        });
    };

    return (
        <div className="grid gap-6 md:grid-cols-[300px_1fr]">
            <div>
                <Card>
                    <CardHeader>
                        <CardTitle>Project Files</CardTitle>
                        <CardDescription>Browse and select a file to edit.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FileTree
                           items={files}
                           onFileSelect={handleFileSelect}
                           activeFile={activeFile}
                           openFolders={openFolders}
                           onToggleFolder={handleToggleFolder}
                           onAddFile={handleAddFile}
                           onAddImage={handleAddImage}
                        />
                    </CardContent>
                </Card>
            </div>
            <div>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>File Editor</CardTitle>
                            {activeFile ? (
                                <CardDescription>Editing: <span className="font-mono bg-muted px-1 py-0.5 rounded">{activeFile.path}</span></CardDescription>
                            ) : (
                                <CardDescription>Select a file to start editing.</CardDescription>
                            )}
                        </div>
                        <div className="flex gap-2">
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                     <Button variant="outline" size="sm">
                                        <FolderPlus className="mr-2 h-4 w-4" />
                                        Add Folder
                                    </Button>
                                </AlertDialogTrigger>
                                {isPro ? <ProAddFolderDialog /> : <FreeUpgradeDialog />}
                            </AlertDialog>
                            <Button variant="outline" size="sm" asChild>
                                <label htmlFor="file-upload-main" className="cursor-pointer">
                                 <Upload className="mr-2 h-4 w-4" />
                                    Upload File
                                <Input id="file-upload-main" type="file" className="hidden" />
                                </label>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            placeholder="File content will be displayed here..."
                            className="min-h-[500px] text-sm font-mono"
                            value={editorContent}
                            onChange={(e) => setEditorContent(e.target.value)}
                            disabled={!activeFile}
                        />
                    </CardContent>
                    <CardFooter className="justify-end">
                        <Button disabled={!activeFile} onClick={handlePublish}>
                            <GitBranch className="mr-2 h-4 w-4" />
                            Commit Changes
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
