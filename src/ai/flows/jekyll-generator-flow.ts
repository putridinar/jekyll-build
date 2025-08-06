'use server';
/**
 * @fileOverview A Jekyll component generator AI flow.
 *
 * - generateJekyllComponent - A function that handles the Jekyll component generation process.
 * - JekyllComponentOutput - The return type for the generateJekyllComponent function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const JekyllComponentOutputSchema = z.object({
  filename: z.string().describe("The suggested filename for the generated component, e.g., '_includes/navigation.html' or '_layouts/post.html'."),
  content: z.string().describe('The generated HTML/Liquid code for the component.'),
});
export type JekyllComponentOutput = z.infer<typeof JekyllComponentOutputSchema>;

const JekyllGeneratorInputSchema = z.object({
  prompt: z.string(),
});

export async function generateJekyllComponent(
  promptText: string
): Promise<JekyllComponentOutput> {
  return jekyllGeneratorFlow({ prompt: promptText });
}

const jekyllGeneratorFlow = ai.defineFlow(
  {
    name: 'jekyllGeneratorFlow',
    inputSchema: JekyllGeneratorInputSchema,
    outputSchema: JekyllComponentOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
        prompt: `You are an expert web developer specializing in Jekyll and Tailwind CSS.
Your task is to generate a single file for a Jekyll component or layout based on the user's request.

**Instructions:**
1.  **Analyze the Request:** Understand what the user wants to create (e.g., a header, a post layout, a footer, an include).
2.  **Determine File Path:** Based on Jekyll conventions, decide the appropriate folder and filename.
    *   Layouts go in \`_layouts/\`, e.g., \`_layouts/post.html\`.
    *   Reusable components go in \`_includes/\`, e.g., \`_includes/navigation.html\`.
    *   CSS should be linked as if it's in \`/assets/css/style.css\`. Assume Tailwind CSS is set up and processed into this file.
3.  **Generate Code:**
    *   Write clean, semantic HTML.
    *   Use Tailwind CSS classes for styling. Do not use inline styles or \`<style>\` blocks.
    *   Use Liquid templating tags (\`{{ ... }}\`, \`{% ... %}\`) where appropriate for dynamic content (e.g., \`{{ site.title }}\`, \`{{ page.content }}\`).
    *   If the user asks for JavaScript, include it within a \`<script>\` tag in the same file. Keep it minimal and vanilla JS unless specified otherwise.
4.  **Format Output:** Return a single JSON object with two keys: "filename" and "content".

**User Request:**
${input.prompt}
`,
        output: {
            schema: JekyllComponentOutputSchema,
        },
    });
    return output!;
  }
);
