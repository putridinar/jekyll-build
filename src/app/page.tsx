'use client';

import * as React from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { FileNode } from '@/types';
import { AppHeader } from '@/components/app/header';
import { FileExplorer } from '@/components/app/file-explorer';
import { CodeEditor } from '@/components/app/code-editor';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppFooter } from '@/components/app/footer';
import { generateJekyllComponent } from '@/ai/flows/jekyll-generator-flow';
import { useAuth } from '@/components/app/auth-provider';
import { useRouter } from 'next/navigation';
import { generateImage } from '@/actions/ai';
import { IconSidebar } from '@/components/app/icon-sidebar';
import { publishTemplateFiles, getSettings, createPullRequestAction } from '@/actions/content';

const initialFileStructure: FileNode[] = [
  {
    name: '_layouts',
    path: '_layouts',
    type: 'folder',
    children: [
      { name: 'default.html', path: '_layouts/default.html', type: 'file' },
      { name: 'post.html', path: '_layouts/post.html', type: 'file' },
    ],
  },
  {
    name: '_includes',
    path: '_includes',
    type: 'folder',
    children: [
      { name: 'header.html', path: '_includes/header.html', type: 'file' },
      { name: 'footer.html', path: '_includes/footer.html', type: 'file' },
    ],
  },
  {
    name: '_posts',
    path: '_posts',
    type: 'folder',
    children: [
      { name: '2024-01-01-welcome-to-jekyll.md', path: '_posts/2024-01-01-welcome-to-jekyll.md', type: 'file' },
    ],
  },
  {
    name: '_data',
    path: '_data',
    type: 'folder',
    children: [
       { name: 'navigation.yml', path: '_data/navigation.yml', type: 'file' },
    ],
  },
   {
    name: 'assets',
    path: 'assets',
    type: 'folder',
    children: [
      { name: 'css', path: 'assets/css', type: 'folder', children: [
        { name: 'style.css', path: 'assets/css/style.css', type: 'file' }
      ]},
      { name: 'images', path: 'assets/images', type: 'folder', children: [
        { name: '.gitkeep', path: 'assets/images/.gitkeep', type: 'file' }]},
      { name: 'js', path: 'assets/js', type: 'folder', children: [
        { name: 'script.js', path: 'assets/js/script.js', type: 'file' }]},
    ],
  },
  { name: '_config.yml', path: '_config.yml', type: 'file' },
  { name: 'index.html', path: 'index.html', type: 'file' },
  { name: 'Gemfile', path: 'Gemfile', type: 'file' },
];

const initialFileContents: { [key: string]: string } = {
  '_config.yml': `title: My Awesome Jekyll Site
email: your-email@example.com
description: >- # this means to ignore newlines until "baseurl:"
baseurl: "/blank" # subpath situs Anda, mis. /blog
url: "" # nama host & protokol dasar untuk situs Anda, mis. http://example.com
twitter_username: jekyllrb
github_username:  jekyll

permalink: /post/:title

defaults:
- scope:
    type: posts
  values:
    layout: post

- scope:
    type: pages
  values:
    layout: page

# Pengaturan Markdown
markdown: kramdown

# Pengaturan build
plugins:
  - jekyll-feed
  - jekyll-sitemap

# Kecualikan dari pemrosesan.
# Item berikut tidak akan diproses, secara default.
# Setiap item yang tercantum di bawah kunci "exclude:" di sini akan secara otomatis ditambahkan ke
# daftar internal "default_excludes".
#
# Item yang dikecualikan dapat diproses dengan secara eksplisit mencantumkan direktori atau
# path file entri mereka dalam daftar "include:".
#
# exclude:
#   - .sass-cache/
#   - .jekyll-cache/
#   - gemfiles/
#   - Gemfile
#   - Gemfile.lock
#   - node_modules/
#   - vendor/bundle/
#   - vendor/cache/
#   - vendor/gems/
#   - vendor/ruby/
`,
  'index.html': `---
layout: default
title: Welcome to Your New Blog!
permalink: /
---

<h1 class="flex justify-center items-center mb-6 text-3xl font-bold text-center">Hello Broo..!</h1>
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

  {% for post in site.posts %}
    <a href="{{ post.url | relative_url }}" class="group block rounded-lg overflow-hidden bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 dark:bg-slate-800">
      
      {% if post.image %}
        <img src="{{ post.image | relative_url }}" alt="{{ post.title }}" class="w-full h-48 object-cover">
      {% endif %}

      <div class="p-6">
        <h2 class="mb-2 text-xl font-bold tracking-tight text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 transition-colors">
          {{ post.title }}
        </h2>
        
        <p class="font-normal text-slate-600 dark:text-slate-400 mb-4">
          {{ post.excerpt | strip_html | truncatewords: 20 }}
        </p>

        <p class="text-sm text-slate-500 dark:text-slate-500">
          {{ post.date | date: "%b %d, %Y" }}
        </p>
      </div>

    </a>
  {% endfor %}

</div>
`,
  '_layouts/default.html': `<!DOCTYPE html>
<html lang="{{ page.lang | default: site.lang | default: "en" }}" class="h-full">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ page.title | escape }} | {{ site.title | escape }}</title>
    <meta name="description" content="{{ page.excerpt | default: site.description | strip_html | normalize_whitespace | truncate: 160 | escape }}">
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <link rel="stylesheet" href="{{ site.baseurl }}{{ "/assets/css/style.css" | relative_url }}">
    <link rel="canonical" href="{{ page.url | replace:'index.html','' | absolute_url }}">
  </head>
  <body class="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans min-h-screen flex flex-col">
    {% include header.html %}
    
    <main class="page-content flex-grow" aria-label="Content">
      <div class="container mx-auto px-4 py-8">
        {{ content }}
      </div>
    </main>
    
    {% include footer.html %}
  </body>
</html>
`,
  '_layouts/post.html': `---
layout: default
---
<article class="post h-entry px-4 py-8 max-w-3xl mx-auto" itemscope itemtype="http://schema.org/BlogPosting">

  <div class="post-content e-content prose prose-lg dark:prose-invert" itemprop="articleBody">
    {{ content }}
  </div>
  
  <div class="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
    Diposting pada <time class="dt-published" datetime="{{ page.date | date_to_xmlschema }}" itemprop="datePublished">{{ page.date | date: "%b %-d, %Y" }}</time>
    {%- if page.author -%}
      oleh <span itemprop="author" itemscope itemtype="http://schema.org/Person"><span class="p-author h-card" itemprop="name">{{ page.author }}</span></span>
    {%- endif -%}
    {%- if page.tags and page.tags.size > 0 -%}
      <br>
      Kategori:
      {%- for tag in page.tags -%}
        <a href="{{ site.baseurl }}/tags/{{ tag | slugify }}/" class="text-purple-600 dark:text-purple-400 hover:underline">#{{ tag }}</a>{%- unless forloop.last -%},{%- endunless -%}
      {%- endfor -%}
    {%- endif -%}
  </div>

  <a class="u-url" href="{{ site.baseurl }}{{ page.url | relative_url }}" hidden></a>
</article>
`,
  '_includes/header.html': `<header class="bg-white dark:bg-gray-800 shadow-md py-4">
  <div class="container mx-auto px-4 flex justify-between items-center">
    <a class="text-2xl font-bold text-gray-900 dark:text-white" rel="author" href="{{ site.baseurl }}{{ "/" | relative_url }}">{{ site.title | escape }}</a>
    
    <nav class="site-nav">
      <div class="hidden md:block">
        {%- for item in site.data.navigation -%}
          <a class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md font-medium" href="{{ site.baseurl }}{{ item.url | relative_url }}">{{ item.title }}</a>
        {%- endfor -%}
      </div>
      </nav>
  </div>
</header>
`,
 '_includes/footer.html': `<footer class="w-full bg-white border-t border-slate-200 dark:bg-slate-900 dark:border-slate-700">
    <div class="container mx-auto py-5 px-4 text-center text-sm text-slate-500 dark:text-slate-400">
      <p>&copy; {% capture current_year %}{{ 'now' | date: "%Y" }}{% endcapture %}{{ current_year }} {{ site.title }} &bull; Dibuat dengan <a href="https://jekyll-buildr.vercel.app/" target="_blank">Jekyll-Buildr</a> by Daffa</p>
    </div>
  </footer>
`,
 '_posts/2024-01-01-welcome-to-jekyll.md': `---
title:  "Welcome to Jekyll!"
date:   2024-01-01 00:00:00 -0000
categories: jekyll update
---
You’ll find this post in your \`_posts\` directory. Go ahead and edit it and re-build the site to see your changes. You can rebuild the site in many different ways, but the most common way is to run \`bundle exec jekyll serve\`, which launches a web server and auto-regenerates your site when a file is updated.

To add new posts, simply add a file in the \`_posts\` directory that follows the convention \`YYYY-MM-DD-name-of-post.ext\` and includes the necessary front matter. Take a look at the source for this post to get an idea about how it works.
`,
 '_data/navigation.yml': `- title: Home
  url: /
- title: About
  url: /about/
`,
 'assets/css/style.css': `/* Add your Tailwind CSS directives here, or other custom CSS */
`,
'assets/js/script.js': `/* Add your Javascript code here */
`,
 'Gemfile': `source "https://rubygems.org"

gem "jekyll"
gem "jekyll-feed"
gem "jekyll-sitemap"
`,
};

function findAndRenameFile(nodes: FileNode[], oldPath: string, newName: string): FileNode[] {
    return nodes.map(node => {
        if (node.path === oldPath) {
            const newPath = oldPath.substring(0, oldPath.lastIndexOf('/') + 1) + newName;
            return { ...node, name: newName, path: newPath };
        }
        if (node.type === 'folder' && node.children) {
            return { ...node, children: findAndRenameFile(node.children, oldPath, newName) };
        }
        return node;
    });
}

function findAndRemoveFile(nodes: FileNode[], path: string): FileNode[] {
    return nodes.filter(node => node.path !== path).map(node => {
        if (node.type === 'folder' && node.children) {
            return { ...node, children: findAndRemoveFile(node.children, path) };
        }
        return node;
    });
}

function addFileToStructure(nodes: FileNode[], newFile: FileNode): FileNode[] {
    const pathParts = newFile.path.split('/');
    
    function findAndAdd(currentNodes: FileNode[], parts: string[], currentPath: string): FileNode[] {
        if (parts.length === 1) {
            // File masuk ke direktori saat ini, jika belum ada
            if (currentNodes.some(n => n.path === newFile.path)) {
                return currentNodes;
            }
            return [...currentNodes, { ...newFile, name: parts[0] }];
        }

        const folderName = parts[0];
        const remainingParts = parts.slice(1);
        const nextPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        let folderExists = false;

        const updatedNodes = currentNodes.map(node => {
            if (node.type === 'folder' && node.path === nextPath) {
                folderExists = true;
                return {
                    ...node,
                    children: findAndAdd(node.children || [], remainingParts, nextPath),
                };
            }
            return node;
        });
        
        if (!folderExists) {
             return currentNodes;
        }

        return updatedNodes;
    }
    // Mulai rekursi dari root
    return findAndAdd(nodes, pathParts, '');
}


// Pembantu untuk menemukan node berdasarkan path
function findNode(nodes: FileNode[], path: string): FileNode | undefined {
    for (const node of nodes) {
        if (node.path === path) return node;
        if (node.type === 'folder' && node.children) {
            const found = findNode(node.children, path);
            if (found) return found;
        }
    }
    return undefined;
}


function HomePageContent() {
  const { toast } = useToast();
  const [fileStructure, setFileStructure] =
    React.useState(initialFileStructure);
  const [activeFile, setActiveFile] = React.useState<string>('index.html');
  const [content, setContent] = React.useState('');
  const [isMounted, setIsMounted] = React.useState(false);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const uploadInputRef = React.useRef<HTMLInputElement>(null);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(
    new Set(['_layouts', '_includes', '_posts', '_data', 'assets', 'assets/css', 'assets/images', 'assets/js'])
  );
    const [isPublishing, setIsPublishing] = React.useState(false);
    const [isCreatingPr, setIsCreatingPr] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);


  React.useEffect(() => {
    if (isMounted) {
      try {
        const savedContent = localStorage.getItem(activeFile);
        setContent(savedContent ?? initialFileContents[activeFile] ?? '');
      } catch (error) {
        console.error('Failed to read from localStorage', error);
        setContent(initialFileContents[activeFile] ?? '');
      }
    }
  }, [activeFile, isMounted]);

  React.useEffect(() => {
    if (isMounted && content) {
      try {
        localStorage.setItem(activeFile, content);
      } catch (error) {
        console.error('Failed to write to localStorage', error);
      }
    }
  }, [content, activeFile, isMounted]);

  const handleFileSelect = (path: string) => {
    setActiveFile(path);
    if (isMobile) {
      setIsSheetOpen(false);
    }
  };

  const handleFolderToggle = (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleNewFile = (folderPath: string = '') => {
    let newFileName = 'untitled.html';
    let newFilePath = folderPath ? `${folderPath}/${newFileName}` : newFileName;
    let counter = 1;

    const allPaths = new Set<string>();
    const collectPaths = (nodes: FileNode[]) => {
      nodes.forEach(node => {
        allPaths.add(node.path);
        if (node.children) {
          collectPaths(node.children);
        }
      });
    };
    collectPaths(fileStructure);

    while (allPaths.has(newFilePath)) {
      newFileName = `untitled-${counter}.html`;
      newFilePath = folderPath ? `${folderPath}/${newFileName}` : newFileName;
      counter++;
    }

    const newFileNode: FileNode = {
      name: newFileName,
      path: newFilePath,
      type: 'file',
    };

    setFileStructure(prev => addFileToStructure(prev, newFileNode));
    if (folderPath) {
      setExpandedFolders(prev => new Set(prev).add(folderPath));
    }
    setActiveFile(newFilePath);
    setContent('');
     if (isMobile) {
      setIsSheetOpen(false);
    }
  };

  const handleNewFolder = (folderPath: string = '') => {
    let newFolderName = 'New Folder';
    let newFolderPath = folderPath ? `${folderPath}/${newFolderName}` : newFolderName;
    let counter = 1;

    const allPaths = new Set<string>();
    const collectPaths = (nodes: FileNode[]) => {
        nodes.forEach(node => {
            allPaths.add(node.path);
            if (node.children) {
                collectPaths(node.children);
            }
        });
    };
    collectPaths(fileStructure);

    while (allPaths.has(newFolderPath)) {
        newFolderName = `New Folder ${counter}`;
        newFolderPath = folderPath ? `${folderPath}/${newFolderName}` : newFolderName;
        counter++;
    }

    const newFolderNode: FileNode = {
        name: newFolderName,
        path: newFolderPath,
        type: 'folder',
        children: [],
    };

    if (folderPath) {
        setFileStructure(prev => addFileToStructure(prev, newFolderNode));
        setExpandedFolders(prev => new Set(prev).add(folderPath));
    } else {
        setFileStructure(prev => [...prev, newFolderNode]);
    }
    setExpandedFolders(prev => new Set(prev).add(newFolderPath));

    if (isMobile) {
        setIsSheetOpen(false);
    }
  };
  
  const handleFileRename = (newName: string) => {
    const oldPath = activeFile;
    const directory = oldPath.substring(0, oldPath.lastIndexOf('/') + 1);
    const newPath = directory + newName;

    if (oldPath === newPath) return;

     const allPaths = new Set();
    const collectPaths = (nodes: FileNode[]) => {
      nodes.forEach(node => {
        allPaths.add(node.path);
        if (node.children) {
          collectPaths(node.children);
        }
      });
    };
    collectPaths(fileStructure);

    if (allPaths.has(newPath)) {
      toast({
        title: "Rename Failed",
        description: `A file named "${newName}" already exists in this folder.`,
        variant: 'destructive',
      });
      return;
    }

    setFileStructure(prev => findAndRenameFile(prev, oldPath, newName));

    // Perbarui peta konten file
    if (isMounted) {
      try {
        const currentContent = localStorage.getItem(oldPath) ?? content;
        localStorage.setItem(newPath, currentContent);
        localStorage.removeItem(oldPath);
      } catch (error) {
        console.error('Failed to update localStorage on rename', error);
      }
    }

    setActiveFile(newPath);
  };

  const handleFileDelete = (path: string) => {
    setFileStructure(prev => findAndRemoveFile(prev, path));

    if (isMounted) {
      try {
        localStorage.removeItem(path);
      } catch (error) {
        console.error('Failed to remove from localStorage on delete', error);
      }
    }

    if (activeFile === path) {
      setActiveFile('index.html');
    }
     if (isMobile) {
      setIsSheetOpen(false);
    }
  };

  const handleGenerateComponent = async (prompt: string) => {
    try {
      const result = await generateJekyllComponent(prompt);
      const { filename, content: newContent } = result;
      
      const newFile: FileNode = {
        name: filename.split('/').pop() || filename,
        path: filename,
        type: 'file',
      };

      setFileStructure((prev) => addFileToStructure(prev, newFile));
      
      // Perluas folder induk jika file baru ada di dalam folder
      const parentFolder = filename.substring(0, filename.lastIndexOf('/'));
      if (parentFolder) {
        setExpandedFolders(prev => new Set(prev).add(parentFolder));
      }
      
      setActiveFile(filename);
      setContent(newContent);
      
      if (isMounted) {
        localStorage.setItem(filename, newContent);
      }
      
      toast({
        title: "Component Generated",
        description: `${filename} has been created and opened.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Generation Failed",
        description: 'Something went wrong while generating the component.',
        variant: 'destructive',
      });
    }
  };
  
  const handleAiImageGenerated = (imageData: { filename: string, content: string }) => {
    const { filename, content: newContent } = imageData;
    const imagePath = `assets/images/${filename}`;

    const newFile: FileNode = {
      name: filename,
      path: imagePath,
      type: 'file',
    };
    
    if (isMounted) {
        try {
            localStorage.setItem(imagePath, newContent);
            setFileStructure((prev) => addFileToStructure(prev, newFile));
            setExpandedFolders(prev => new Set(prev).add('assets/images'));
            toast({
                title: "Image Generated",
                description: `${filename} has been added to assets/images.`,
            });
        } catch (error) {
            console.error("Failed to save image to localStorage", error);
            toast({
                title: "Save Failed",
                description: "Could not save the generated image.",
                variant: "destructive",
            });
        }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) { // Batas 1MB
      toast({
        title: "Unggah Gagal",
        description: "Ukuran file tidak boleh melebihi 1MB.",
        variant: "destructive",
      });
      return;
    }

    const imagePath = `assets/images/${file.name}`;

    const newFile: FileNode = {
      name: file.name,
      path: imagePath,
      type: 'file',
    };

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (isMounted) {
        try {
          localStorage.setItem(imagePath, dataUrl);
          setFileStructure((prev) => addFileToStructure(prev, newFile));
          setExpandedFolders(prev => new Set(prev).add('assets/images'));
          toast({
            title: "Image Uploaded",
            description: `${file.name} has been added to assets/images.`,
          });
        } catch (error) {
          console.error("Failed to save image to localStorage", error);
          toast({
            title: "Upload Failed",
            description: "Could not save the image.",
            variant: "destructive",
          });
        }
      }
    };
    reader.readAsDataURL(file);

    // Atur ulang input file
    e.target.value = '';
  };

  const collectFilesToCommit = () => {
    const filesToCommit: { path: string; name: string; content: string, type: 'file' }[] = [];
    const collectFiles = (nodes: FileNode[]) => {
        for (const node of nodes) {
            if (node.type === 'file') {
                const fileContent = localStorage.getItem(node.path) ?? initialFileContents[node.path];
                if (fileContent !== null && fileContent !== undefined) {
                    filesToCommit.push({
                        path: node.path,
                        name: node.name,
                        content: fileContent,
                        type: 'file'
                    });
                }
            } else if (node.type === 'folder' && node.children) {
                if (node.children.length === 0) {
                     filesToCommit.push({
                        path: `${node.path}/.gitkeep`,
                        name: '.gitkeep',
                        content: '',
                        type: 'file'
                    });
                } else {
                  collectFiles(node.children);
                }
            }
        }
    };
    
    collectFiles(fileStructure);
    return filesToCommit;
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    toast({
        title: "Publishing to GitHub...",
        description: "Please wait while we commit your files.",
    });

    try {
        const settingsResult = await getSettings();
        if (!settingsResult.success || !settingsResult.data?.githubRepo || !settingsResult.data?.githubBranch) {
            throw new Error('GitHub repository details are incomplete. Please check your settings.');
        }

        const filesToCommit = collectFilesToCommit();
            if (filesToCommit.length === 0) {
                 toast({
                    title: "Nothing to Publish",
                    description: "No file changes were found to publish.",
                });
                setIsPublishing(false);
                return;
            }

            const result = await publishTemplateFiles(filesToCommit);

            if (result.success) {
                toast({
                    title: "Publish Successful!",
                    description: "Your changes have been pushed to your GitHub repository.",
                });
            } else {
                throw new Error(result.error || 'An unknown error occurred.');
            }
        } catch (error: any) {
            console.error("Publishing error:", error);
            toast({
                title: "Publishing Failed",
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsPublishing(false);
        }
    };

  const handlePullRequest = async (details: { title: string, body: string }) => {
    setIsCreatingPr(true);
    toast({
        title: "Creating Pull Request...",
        description: "Creating a new branch and committing files.",
    });

    try {
        const settingsResult = await getSettings();
        if (!settingsResult.success || !settingsResult.data?.githubRepo || !settingsResult.data?.githubBranch) {
            throw new Error('GitHub repository details are incomplete. Please check your settings.');
        }
        
        const filesToCommit = collectFilesToCommit();
        if (filesToCommit.length === 0) {
            toast({
                title: "Nothing to Commit",
                description: "No file changes were found to create a pull request.",
            });
            setIsCreatingPr(false);
            return;
        }
        
        const result = await createPullRequestAction(filesToCommit, details);

        if (result.success && result.prUrl) {
            toast({
                title: "Pull Request Created!",
                description: (
                    <a href={result.prUrl} target="_blank" rel="noopener noreferrer" className="underline">
                        Click here to view the pull request on GitHub.
                    </a>
                ),
                duration: 10000,
            });
        } else {
            throw new Error(result.error || 'An unknown error occurred while creating the pull request.');
        }
    } catch (error: any) {
        console.error("PR Creation error:", error);
        toast({
            title: "PR Creation Failed",
            description: error.message,
            variant: 'destructive',
        });
    } finally {
        setIsCreatingPr(false);
    }
};

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  const fileExplorerComponent = (
      <FileExplorer
        fileStructure={fileStructure}
        activeFile={activeFile}
        onFileSelect={handleFileSelect}
        onNewFile={handleNewFile}
        onNewFolder={handleNewFolder}
        onFileDelete={handleFileDelete}
        onUploadClick={() => uploadInputRef.current?.click()}
        onAiImageGenerated={handleAiImageGenerated}
        user={user}
        expandedFolders={expandedFolders}
        onFolderToggle={handleFolderToggle}
      />
  );

  return (
    <TooltipProvider>
      <div className="flex h-screen w-full flex-col">
        <AppHeader>
         {isMobile && (
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80">
                 <SheetHeader className="p-4">
                   <SheetTitle className="sr-only">Workspace</SheetTitle>
                </SheetHeader>
                {fileExplorerComponent}
              </SheetContent>
            </Sheet>
          )}
        </AppHeader>
        <main className="flex flex-1 overflow-hidden">
          {!isMobile && <IconSidebar user={user} />}
          {!isMobile && fileExplorerComponent}
           <input
            type="file"
            ref={uploadInputRef}
            onChange={handleImageUpload}
            className="hidden"
            accept="image/png, image/jpeg, image/gif, image/svg+xml"
          />
          <CodeEditor
            activeFile={activeFile}
            onRename={handleFileRename}
            content={content}
            setContent={setContent}
            onNewFile={() => handleNewFile()}
            onGenerate={handleGenerateComponent} onNewFolder={() => handleNewFolder()}          />
        </main>
      <AppFooter onPublish={handlePublish} isPublishing={isPublishing} onPullRequest={handlePullRequest} isCreatingPr={isCreatingPr} />
      </div>
    </TooltipProvider>
  );
}


export default function HomePage() {
  return (
      <HomePageContent />
  )
}
