
'use client';

import * as React from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-ruby';
import { Card, CardContent } from '../ui/card';
import { Save } from 'lucide-react';
import { cn } from '@/lib/utils';

type CodeEditorProps = {
  activeFile: string;
  content: string;
  setContent: (content: string) => void;
  isSaving: boolean;
};

function getLanguage(filename: string) {
  if (!filename) return 'markup';
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
  content,
  setContent,
  isSaving,
}: CodeEditorProps) {

  const language = getLanguage(activeFile);

  return (
      <div className="relative flex-1 overflow-hidden p-1">
        <Card className="h-full w-full rounded-lg border-0 shadow-none">
          <CardContent className="h-full overflow-y-auto p-0">
            {isSaving && (
              <div className="absolute top-2 right-4 z-10 text-muted-foreground">
                <div className='flex items-center gap-1'>
                  <Save className="h-5 w-5 animate-pulse" />
                  <span className="text-xs text-orange-600">AutoSave...</span>
                </div>
              </div>
            )}
             <Editor
              value={content}
              onValueChange={setContent}
              highlight={(code) => {
                try {
                  const lang = Prism.languages[language] ? language : 'markup';
                  return Prism.highlight(code, Prism.languages[lang], lang);
                } catch (e) {
                  // Fallback for any error during highlighting
                  return code;
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
  );
}
