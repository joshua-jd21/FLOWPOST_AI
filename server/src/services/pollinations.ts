import { config } from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';

export interface GenerateImageInput {
  prompt: string;
}

export async function generateImage(input: GenerateImageInput): Promise<string> {
  const { prompt } = input;

  if (!prompt || prompt.trim().length === 0) {
    throw new AppError('Prompt is required', 400);
  }

  // Pollinations AI is a public API — no key needed
  // Returns a direct image URL
  const encodedPrompt = encodeURIComponent(prompt.trim());
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}`;

  // Verify the image URL is accessible (quick HEAD request)
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    if (!response.ok) {
      throw new AppError('Failed to generate image', 502);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Image generation service unavailable', 502);
  }

  return imageUrl;
}
