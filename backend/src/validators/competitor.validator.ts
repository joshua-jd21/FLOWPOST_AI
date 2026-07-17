import { z } from 'zod'

export const competitorPlatformSchema = z.enum(['Instagram', 'LinkedIn', 'X (Twitter)'])

export const competitorPayloadSchema = z.object({
  name: z.string().trim().min(2, 'Competitor name is required').max(100),
  website: z.string().trim().url('Enter a valid website URL').optional().or(z.literal('')),
  industry: z.string().trim().min(2, 'Industry is required').max(120),
  platforms: z.array(competitorPlatformSchema).min(1, 'Choose at least one platform').default(['Instagram']),
  positioning: z.string().trim().min(8, 'Positioning is required').max(500),
  strengths: z.array(z.string().trim().min(2).max(80)).max(8).default([]),
  notes: z.string().trim().max(800).optional().or(z.literal('')),
})

export const competitorIdSchema = z.object({
  id: z.string().min(1, 'Competitor id is required'),
})

export type CompetitorPayload = z.infer<typeof competitorPayloadSchema>
