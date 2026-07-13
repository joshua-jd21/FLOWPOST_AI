import { config } from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';

export interface GenerateCaptionInput {
  topic: string;
  tone?: string;
  platform?: string;
}

export interface GenerateCaptionResult {
  caption: string;
}

export async function generateCaption(
  input: GenerateCaptionInput
): Promise<GenerateCaptionResult> {
  const { topic, tone = 'professional', platform = 'general' } = input;

  if (!topic || topic.trim().length === 0) {
    throw new AppError('Topic is required', 400);
  }

  if (!config.gemini.apiKey) {
    throw new AppError('Gemini API is not configured', 500);
  }

  const prompt = `Write a ${tone} social media caption for ${platform} about: ${topic}. 
Keep it under 300 characters. Make it engaging and include relevant hashtags.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.gemini.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 200,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new AppError(
        `Gemini API error: ${response.status} - ${errorText}`,
        502
      );
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };
    const caption = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!caption) {
      throw new AppError('No caption generated', 502);
    }

    return { caption: caption.trim() };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Caption generation service unavailable', 502);
  }
}
