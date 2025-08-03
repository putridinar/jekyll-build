'use server';

/**
 * @fileOverview A content idea generation AI agent.
 *
 * - contentIdeaGeneration - A function that handles the content idea generation process.
 * - ContentIdeaGenerationInput - The input type for the contentIdeaGeneration function.
 * - ContentIdeaGenerationOutput - The return type for the contentIdeaGeneration function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ContentIdeaGenerationInputSchema = z.object({
  topic: z.string().describe('The general topic or theme to generate ideas for.'),
  contentSchema: z.string().describe('The schema of the content, such as \"blog post\" or \"author profile\".'),
});
export type ContentIdeaGenerationInput = z.infer<typeof ContentIdeaGenerationInputSchema>;

const ContentIdeaGenerationOutputSchema = z.object({
  ideas: z.array(z.string()).describe('An array of content ideas related to the topic.'),
});
export type ContentIdeaGenerationOutput = z.infer<typeof ContentIdeaGenerationOutputSchema>;

export async function contentIdeaGeneration(input: ContentIdeaGenerationInput): Promise<ContentIdeaGenerationOutput> {
  return contentIdeaGenerationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'contentIdeaGenerationPrompt',
  input: {schema: ContentIdeaGenerationInputSchema},
  output: {schema: ContentIdeaGenerationOutputSchema},
  prompt: `You are a creative content strategist. Your task is to generate content ideas based on a given topic and content schema.

Topic: {{{topic}}}
Content Schema: {{{contentSchema}}}

Suggest five engaging and relevant content ideas based on the provided topic. The ideas should be suitable for the specified content schema.
Return the suggestions as a JSON array of strings.`,
});

const contentIdeaGenerationFlow = ai.defineFlow(
  {
    name: 'contentIdeaGenerationFlow',
    inputSchema: ContentIdeaGenerationInputSchema,
    outputSchema: ContentIdeaGenerationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
