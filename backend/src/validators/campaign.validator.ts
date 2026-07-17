import { z } from 'zod'

export const campaignPlatformSchema = z.enum(['Instagram', 'LinkedIn', 'X (Twitter)'])

export const campaignGenerateSchema = z.object({
  title: z.string().trim().min(2, 'Campaign title is required').max(90),
  objective: z.string().trim().min(10, 'Describe the campaign objective').max(500),
  audience: z.string().trim().min(3, 'Audience is required').max(160),
  durationDays: z.union([z.literal(7), z.literal(15), z.literal(30)]),
  platforms: z.array(campaignPlatformSchema).min(1, 'Choose at least one platform').default(['Instagram', 'LinkedIn', 'X (Twitter)']),
  startDate: z.string().datetime().optional().or(z.literal('')),
  brandVoice: z.string().trim().max(140).optional().default('premium, helpful, creator-focused'),
})

export const campaignIdSchema = z.object({
  id: z.string().min(1, 'Campaign id is required'),
})

export const convertIdeaSchema = z.object({
  id: z.string().min(1, 'Campaign id is required'),
  ideaId: z.string().min(1, 'Idea id is required'),
})

export type CampaignGeneratePayload = z.infer<typeof campaignGenerateSchema>
