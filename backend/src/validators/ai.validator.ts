import { z } from 'zod'

export const generateCaptionSchema = z.object({
  platform: z.string().trim().min(1, 'Please choose a platform'),
  contentType: z.string().trim().min(1, 'Please choose a content type'),
  tone: z.string().trim().min(1, 'Please choose a tone'),
  audience: z.string().trim().min(1, 'Please share the target audience'),
  prompt: z.string().trim().min(10, 'Please describe the context for your content'),
  generateImage: z.boolean().optional().default(false),
})

export const downloadImageSchema = z.object({
  imageUrl: z.string().url('A valid generated image URL is required'),
})
