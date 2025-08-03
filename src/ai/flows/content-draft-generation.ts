
'use server';

/**
 * @fileOverview Generates an initial content draft based on a content schema and theme.
 *
 * - generateContentDraft - A function that generates the content draft.
 * - ContentDraftInput - The input type for the generateContentDraft function.
 * - ContentDraftOutput - The return type for the generateContentDraft function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ContentDraftInputSchema = z.object({
  contentSchema: z
    .string()
    .describe('The content schema to base the draft on (e.g., post, author).'),
  theme: z.string().describe('The theme or topic to use for the content draft.'),
});
export type ContentDraftInput = z.infer<typeof ContentDraftInputSchema>;

const ContentDraftOutputSchema = z.object({
  title: z.string().describe('The generated title for the content.'),
  content: z.string().describe('The generated content draft in Markdown format.'),
});
export type ContentDraftOutput = z.infer<typeof ContentDraftOutputSchema>;

export async function generateContentDraft(input: ContentDraftInput): Promise<ContentDraftOutput> {
  return contentDraftFlow(input);
}

const prompt = ai.definePrompt({
  name: 'contentDraftPrompt',
  input: {schema: ContentDraftInputSchema},
  output: {schema: ContentDraftOutputSchema},
  prompt: `You are an AI assistant designed to generate a full blog post for a Jekyll blog, including a title and content.

  Based on the provided content schema and theme, create a complete, engaging, and well-structured Markdown draft that can be further edited by the user.

  Content Schema: {{{contentSchema}}}
  Theme/Topic: {{{theme}}}

  The output should be valid Markdown.
  Focus on creating a compelling title and high-quality content, not just filler.
  
  Return an object with two fields: 'title' for the post title and 'content' for the full Markdown content.
  `,
});

const contentDraftFlow = ai.defineFlow(
  {
    name: 'contentDraftFlow',
    inputSchema: ContentDraftInputSchema,
    outputSchema: ContentDraftOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
