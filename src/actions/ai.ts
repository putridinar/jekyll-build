
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import sharp from 'sharp';

const ImageGenerationOutputSchema = z.object({
  filename: z.string().describe("The suggested filename for the generated image, ending in .webp, e.g., 'surreal-cat-123.webp'."),
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

    if (!media || !media.url) {
      console.error("No media found in the generated message.");
      throw new Error("Image generation failed: No image was returned.");
    }
    
    // Konversi dari data URI ke buffer
    const base64Data = media.url.split(',')[1];
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Proses dengan sharp: ubah ukuran ke 512x512 dan kompres ke WebP
    const processedImageBuffer = await sharp(imageBuffer)
        .resize(512, 512)
        .webp({ quality: 80 }) // Kualitas 80 adalah keseimbangan yang baik
        .toBuffer();

    // Buat nama file baru dengan ekstensi .webp
    const filename = `${prompt.toLowerCase().replace(/\s+/g, '-').slice(0, 50)}-${Date.now()}.webp`;
    
    // Konversi buffer yang diproses kembali ke data URI
    const processedDataUri = `data:image/webp;base64,${processedImageBuffer.toString('base64')}`;

    return {
      filename,
      content: processedDataUri,
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
