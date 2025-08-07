'use server';
/**
 * @fileOverview A blog post generator AI flow.
 *
 * - generatePostContent - A function that handles the post generation process.
 * - PostContentOutput - The return type for the generatePostContent function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const PostContentOutputSchema = z.object({
  categories: z.string().describe("A comma-separated string of relevant blog post categories, e.g., 'tech, javascript, webdev'."),
  content: z.string().describe('The generated blog post content in Markdown format. It should be well-structured with headings, paragraphs, and lists where appropriate.'),
});
export type PostContentOutput = z.infer<typeof PostContentOutputSchema>;

const PostGeneratorInputSchema = z.object({
  title: z.string(),
});

export async function generatePostContent(
  title: string
): Promise<PostContentOutput> {
  return postGeneratorFlow({ title });
}

const postGeneratorFlow = ai.defineFlow(
  {
    name: 'postGeneratorFlow',
    inputSchema: PostGeneratorInputSchema,
    outputSchema: PostContentOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
        prompt: `You are an expert blog writer. Based on the following title, generate a set of relevant categories and a full blog post in Markdown format.

**Instructions:**
1.  **Categories:** Provide a comma-separated string of 3-5 relevant categories.
2.  **Content:** Write a high-quality, engaging blog post. Use Markdown for formatting (e.g., # for headings, * for lists, etc.). The content should be at least 300 words.

**Post Title:**
${input.title}
`,
        output: {
            schema: PostContentOutputSchema,
        },
    });
    return output!;
  }
);
