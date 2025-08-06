'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ImageGenerationOutputSchema = z.object({
  filename: z.string().describe("The suggested filename for the generated image, ending in .png, e.g., 'surreal-cat-123.png', ensuring the FILE SIZE DO NOT EXCEED 800 KILOBITES."),
  content: z.string().describe("The generated image as a base64 encoded data URI."),
});
type ImageGenerationOutput = z.infer<typeof ImageGenerationOutputSchema>;

const imageGenerationFlow = ai.defineFlow(
  {
    name: 'imageGenerationFlow',
    inputSchema: z.string(),
    outputSchema: ImageGenerationOutputSchema,
  },
  async (prompt) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media) {
      console.error("No media found in the generated message.");
      throw new Error("Image generation failed: No image was returned.");
    }

    const filename = `${prompt.toLowerCase().replace(/\s+/g, '-').slice(0, 50)}-${Date.now()}.png`;

    if (!media) {
      throw new Error("No media found to process.");
    }
    
    return {
      filename,
      content: media.url || 'data:image/png;base64,',
    };    
  }
);


export async function generateImage(prompt: string): Promise<{ success: boolean; data?: ImageGenerationOutput; error?: string }> {
    try {
        const result = await imageGenerationFlow(prompt);
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Error generating image:", error);
        return { success: false, error: error.message };
    }
}
