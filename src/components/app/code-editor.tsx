'use client';

import * as React from 'react';
import { FolderPlus, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-ruby';
// Tambahkan bahasa lain sesuai kebutuhan

type CodeEditorProps = {
  activeFile: string;
  onRename: (newName: string) => void;
  content: string;
  setContent: (content: string) => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onGenerate: (prompt: string) => Promise<void>;
};

function getLanguage(filename: string) {
  const extension = filename.split('.').pop() || '';
  switch (extension) {
    case 'html':
    case 'liquid':
      return 'markup';
    case 'css':
      return 'css';
    case 'js':
      return 'javascript';
    case 'yml':
    case 'yaml':
      return 'yaml';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'rb':
       return 'ruby';
    default:
      return 'markup'; // default ke markup untuk jenis file yang tidak dikenal
  }
}

export function CodeEditor({
  activeFile,
  onRename,
  content,
  setContent,
  onNewFile,
  onNewFolder,
  onGenerate,
}: CodeEditorProps) {
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [fileName, setFileName] = React.useState(activeFile);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = React.useState(false);
  const [prompt, setPrompt] = React.useState('');
  const [isGenerating, setIsGenerating] = React.useState(false);

  React.useEffect(() => {
    setFileName(activeFile);
  }, [activeFile]);

  React.useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRename = () => {
    if (fileName !== activeFile && fileName.trim() !== '') {
      onRename(fileName.trim());
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setFileName(activeFile);
      setIsRenaming(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    await onGenerate(prompt);
    setIsGenerating(false);
    setGenerateDialogOpen(false);
    setPrompt('');
  };

  const language = getLanguage(activeFile);

  return (
    <section className="flex flex-1 flex-col bg-background">
      <div className="flex h-14 shrink-0 items-center justify-between border-b bg-muted/30 px-4">
        {isRenaming ? (
          <Input
            ref={inputRef}
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            className="h-8 w-auto border-accent bg-transparent font-mono text-sm"
          />
        ) : (
          <span
            className="cursor-pointer font-mono text-sm"
            onClick={() => setIsRenaming(true)}
          >
            {activeFile}
          </span>
        )}
        <div className="flex items-center gap-2">
          <Dialog
            open={generateDialogOpen}
            onOpenChange={setGenerateDialogOpen}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Generate with AI</p>
              </TooltipContent>
            </Tooltip>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="font-headline">
                  Generate Jekyll Component
                </DialogTitle>
                <DialogDescription>
                  Describe the component you want to create. For example, "a
                  responsive navigation header with a logo and three links".
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Textarea
                  placeholder="e.g., a blog post layout with a title, date, and content area"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt}
                >
                  {isGenerating && (
                    <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                  )}
                  {isGenerating ? 'Generating...' : 'Generate'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

         <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => onNewFolder()}>
              <FolderPlus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>New Folder</p>
          </TooltipContent>
        </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onNewFile}>
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>New File</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-1">
        <Card className="h-full w-full rounded-lg border-0 shadow-none">
          <CardContent className="h-full overflow-y-auto p-0">
             <Editor
              value={content}
              onValueChange={setContent}
              highlight={(code) => {
                try {
                  return Prism.highlight(code, Prism.languages[language], language);
                } catch (e) {
                  // Fallback untuk bahasa yang tidak didukung
                  return Prism.highlight(code, Prism.languages.markup, 'markup');
                }
              }}
              padding={16}
              className="min-h-full w-full resize-none border-0 bg-transparent font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              aria-label={`Mengedit file ${activeFile}`}
              textareaClassName="focus:outline-none"
            />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
