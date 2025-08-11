'use client';

import * as React from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
// ... (impor prismjs lainnya tetap sama)
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-ruby';
import { Card, CardContent } from '../ui/card';
import { Save } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import type { User } from 'firebase/auth';
import { generateCodeCompletion } from '@/ai/flows/code-completion-flow';

type CustomUser = User & { role?: string };

type CodeEditorProps = {
  activeFile: string;
  content: string;
  setContent: (content: string) => void;
  isSaving: boolean;
  user: CustomUser | null;
};

function getLanguage(filename: string) {
    if (!filename) return 'markup';
    const extension = filename.split('.').pop() || '';
    switch (extension) {
        case 'html': case 'liquid': return 'markup';
        case 'css': return 'css';
        case 'js': return 'javascript';
        case 'yml': case 'yaml': return 'yaml';
        case 'md': case 'markdown': return 'markdown';
        case 'rb': return 'ruby';
        default: return 'markup';
    }
}

export function CodeEditor({
  activeFile,
  content,
  setContent,
  isSaving,
  user,
}: CodeEditorProps) {
  const [suggestion, setSuggestion] = React.useState('');
  const language = getLanguage(activeFile);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const editorRef = React.useRef<any>(null);

  // Fungsi untuk menangani ref dari komponen Editor
  // dan mengambil textarea internalnya
  const setEditorRefs = (editorInstance: any) => {
    if (editorInstance?._input) {
      textareaRef.current = editorInstance._input;
    }
  };
  // === PERBAIKAN DI SINI ===
  const fetchSuggestion = useDebouncedCallback(async () => {
    if (user?.role !== 'proUser') {
      return;
    }
    const editorInput = editorRef.current?._input;
    if (!editorInput) return;

    const cursorPosition = editorInput.selectionStart;
    const textBeforeCursor = editorInput.value.substring(0, cursorPosition);
    
    // Hanya panggil AI jika ada cukup teks sebelum kursor
    if (textBeforeCursor && textBeforeCursor.trim().length > 3 && !suggestion) {
     // console.log('✅ [DEBUG] Pemicu AI aktif! Mengirim konteks:', { context: textBeforeCursor });
      
      const completion = await generateCodeCompletion(textBeforeCursor, language);
      
     // console.log('✅ [DEBUG] AI merespons dengan:', `"${completion}"`);

      // Cek lagi apakah kursor masih di posisi yang sama
      if (editorRef.current?._input.selectionStart === cursorPosition) {
        setSuggestion(completion);
      } else {
        // console.log('⚠️ [DEBUG] Kursor bergerak, saran dibatalkan.');
      }
    }
  }, 700);

  const handleValueChange = (newCode: string) => {
    setSuggestion('');
    setContent(newCode);
    // Kita tidak lagi meneruskan `newCode` ke fetchSuggestion
    // karena ia akan membaca langsung dari editor ref
    fetchSuggestion();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement | HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && suggestion) {
      e.preventDefault();
      const editorInput = editorRef.current?._input;
      if (!editorInput) return;
      
      const cursorPosition = editorInput.selectionStart;
      const textBefore = editorInput.value.substring(0, cursorPosition);
      const textAfter = editorInput.value.substring(cursorPosition);
      
      const newContent = textBefore + suggestion + textAfter;
      setContent(newContent);
      setSuggestion('');
      
      // Pindahkan kursor ke akhir teks yang disisipkan
      setTimeout(() => {
        if (editorRef.current?._input) {
          const newCursorPos = cursorPosition + suggestion.length;
          editorRef.current._input.selectionStart = newCursorPos;
          editorRef.current._input.selectionEnd = newCursorPos;
        }
      }, 0);
    } else if (suggestion && e.key !== 'Tab') {
      // Hapus saran jika pengguna mengetik tombol lain
      setSuggestion('');
    }
  };
  
  const highlightedCode = React.useCallback((codeToHighlight: string) => {
      try {
          const lang = Prism.languages[language] ? language : 'markup';
          return Prism.highlight(codeToHighlight, Prism.languages[lang], lang);
      } catch (e) {
          return codeToHighlight;
      }
  }, [language]);
  
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
              ref={editorRef}
              value={content}
              onValueChange={handleValueChange}
              onKeyDown={handleKeyDown}
              highlight={(code) => {
                  const suggestionHtml = `<span class="opacity-40 select-none">${suggestion}</span>`;
                  return highlightedCode(code) + suggestionHtml;
              }}
              padding={16}
              className="min-h-full w-full resize-none border-0 bg-transparent font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              aria-label={`Mengedit file ${activeFile}`}
              textareaClassName="focus:outline-none caret-white"
            />
          </CardContent>
        </Card>
      </div>
  );
}