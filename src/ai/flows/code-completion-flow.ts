'use server';
/**
 * @fileOverview A Jekyll code completion AI Buildr.
 *
 * - generateCodeCompletion - A function that handles the Jekyll code completion process.
 * - CodeCompletionOutput - The return type for the generateCodeCompletion function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { checkCodeCompletionPermission } from '@/actions/user';

const CodeCompletionOutputSchema = z.object({
  completion: z.string().describe('Potongan kode yang disarankan untuk melengkapi input.'),
});

const CodeCompletionInputSchema = z.object({
  context: z.string(),
  language: z.string().describe('Bahasa pemrograman dari file yang sedang diedit.'),
});

export async function generateCodeCompletion(
  context: string,
  language: string
): Promise<string> {
  try {
    const result = await codeCompletionFlow({ context, language });
    return result.completion;
  } catch (error) {
    console.error("Code completion flow failed:", error);
    return "";
  }
}

const codeCompletionFlow = ai.defineFlow(
  {
    name: 'codeCompletionFlow',
    inputSchema: CodeCompletionInputSchema,
    outputSchema: CodeCompletionOutputSchema,
  },
  async (input) => {
    // Periksa izin pengguna AI
    const permission = await checkCodeCompletionPermission();
    if (!permission.success) {
      console.warn(`User tried to use Code Completion without permission: ${permission.error}`);
      // Kembalikan output kosong jika tidak diizinkan
      return { completion: "" };
    }
    const { output } = await ai.generate({
        prompt: `
Anda adalah asisten pelengkap kode AI.
Tugas Anda adalah melanjutkan penulisan kode berdasarkan konteks yang diberikan.
Kembalikan HANYA kode tambahannya. Jangan ulangi konteks. Jangan gunakan Markdown.

BAHASA: ${input.language}
KODE:
${input.context}`,
        output: {
            schema: CodeCompletionOutputSchema,
        },
        // === PERBAIKAN DI SINI ===
        config: {
            temperature: 0.2,
            // Hapus total 'stop' untuk debugging. Biarkan AI lebih bebas.
            maxOutputTokens: 48, // Tingkatkan untuk kode yang lebih lengkap
        }
    });
    return output!;
  }
);