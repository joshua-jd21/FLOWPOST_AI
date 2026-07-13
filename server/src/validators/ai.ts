import { z } from 'zod';

export const generateImageSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(500, 'Prompt too long'),
});

export const generateCaptionSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(500, 'Topic too long'),
  tone: z.string().optional(),
  platform: z.string().optional(),
});

export const uploadSchema = z.object({
  // File validation is done by multer middleware
});

export type GenerateImageInput = z.infer<typeof generateImageSchema>;
export type GenerateCaptionInput = z.infer<typeof generateCaptionSchema>;
