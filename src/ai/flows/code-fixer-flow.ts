'use server';
/**
 * @fileOverview A Jekyll component generator AI Buildr.
 *
 * - generateJekyllComponent - A function that handles the Jekyll component generation process.
 * - JekyllComponentOutput - The return type for the generateJekyllComponent function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { checkCodeCompletionPermission } from '@/actions/user'; // Kita bisa pakai ulang izin Pro User

const CodeFixerOutputSchema = z.object({
  fixedCode: z.string().describe('Versi kode yang sudah diperbaiki secara penuh.'),
});

const CodeFixerInputSchema = z.object({
  codeToFix: z.string(),
  language: z.string().describe('Bahasa dari kode yang akan diperbaiki, misal: "html", "liquid", "markdown", "css".'),
  fileName: z.string().describe('Nama file untuk memberikan konteks tambahan pada AI.'),
});

// Server action yang akan dipanggil dari klien
export async function fixJekyllCode(
  code: string,
  language: string,
  fileName: string
): Promise<string> {
  try {
    const result = await codeFixerFlow({ codeToFix: code, language, fileName });
    return result.fixedCode;
  } catch (error) {
    console.error("Code fixer flow failed:", error);
    // Jika gagal, kembalikan kode asli agar tidak ada yang hilang
    return code; 
  }
}

const codeFixerFlow = ai.defineFlow(
  {
    name: 'codeFixerFlow',
    inputSchema: CodeFixerInputSchema,
    outputSchema: CodeFixerOutputSchema,
  },
  async (input) => {
    // Opsional: Batasi fitur ini hanya untuk proUser
    const permission = await checkCodeCompletionPermission();
    if (!permission.success) {
      throw new Error(permission.error || 'Permission denied.');
    }

    const { output } = await ai.generate({
        prompt: `
**Peran:**
Anda adalah seorang Senior Web Developer dan ahli Jekyll. Anda sangat teliti dan jago dalam melakukan code review untuk menemukan dan memperbaiki kesalahan.

**Tugas:**
Analisis kode dari file bernama \`${input.fileName}\` berikut ini. Temukan semua potensi masalah dan kembalikan versi kode yang sudah diperbaiki secara penuh.

**Jenis Masalah yang Harus Dicari:**
1.  **Error Sintaks:** Kesalahan HTML yang tidak valid (tag tidak ditutup), error Liquid, atau kesalahan ketik pada CSS.
2.  **Best Practices:** Perbaiki struktur kode agar lebih mudah dibaca. Gunakan kelas Tailwind CSS secara efisien.
3.  **Logika Rusak:** Cari potensi masalah pada logika Liquid (misalnya, perulangan yang salah).
4.  **Konsistensi:** Pastikan gaya penulisan kode konsisten.

**Instruksi Penting:**
- **KEMBALIKAN KODE LENGKAP:** Jawaban Anda harus berisi **seluruh isi file** yang sudah diperbaiki, dari baris pertama hingga terakhir.
- **JANGAN** memberikan penjelasan, komentar, atau blok kode Markdown. Kembalikan hanya kode mentahnya.

**Kode yang Perlu Diperbaiki (Bahasa: ${input.language}):**
---
${input.codeToFix}
---
`,
        output: {
            schema: CodeFixerOutputSchema,
        },
        config: {
            temperature: 0.1, // Kita ingin AI sangat presisi, bukan kreatif
        }
    });
    return output!;
  }
);