import { z } from 'zod'

const mediaSchema = z.object({
  url: z.string().min(1, 'Media URL is required'),
  type: z.string().trim().optional(),
  name: z.string().trim().optional(),
  size: z.number().nonnegative().optional(),
})

export const postPayloadSchema = z.object({
  title: z.string().trim().min(2, 'Post title must be at least 2 characters'),
  caption: z.string().trim().min(2, 'Caption must be at least 2 characters'),
  platform: z.enum(['Instagram', 'LinkedIn', 'X (Twitter)', 'Facebook']),
  media: z.array(mediaSchema).max(4, 'You can attach up to 4 media items').default([]),
  scheduledAt: z.string().datetime().optional().or(z.literal('')),
  status: z.enum(['draft', 'scheduled', 'published']).default('draft'),
})

export const postQuerySchema = z.object({
  status: z.enum(['draft', 'scheduled', 'published']).optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
  upcoming: z.coerce.boolean().optional(),
})

export type PostPayload = z.infer<typeof postPayloadSchema>
export type PostQuery = z.infer<typeof postQuerySchema>
