import { z } from 'zod'

export const socialProviderSchema = z.enum(['linkedin', 'x', 'instagram', 'facebook'])

export const zernioCallbackSchema = z.object({
  connected: z.union([
    z.boolean(),
    z.string().trim().min(1, 'Zernio connection status is required'),
  ]),
  profileId: z.string().trim().min(1, 'Zernio profileId is required'),
  accountId: z.string().trim().min(1, 'Zernio accountId is required'),
  username: z.string().trim().min(1, 'Zernio username is required'),
  connect_token: z.string().trim().min(1, 'Zernio connect token is required'),
  state: z.string().trim().min(1).optional(),
})

export const publishSocialPostSchema = z.object({
  platform: z.enum(['Instagram', 'LinkedIn', 'X (Twitter)', 'Facebook']),
  title: z.string().trim().min(1).max(120).optional(),
  caption: z.string().trim().min(1, 'Caption is required').max(5000),
  media: z.array(z.object({
    url: z.string().url('Media URL must be valid'),
    type: z.string().trim().optional(),
    name: z.string().trim().optional(),
  })).max(4).default([]),
  scheduledAt: z.string().datetime().optional().or(z.literal('')).optional(),
  timezone: z.string().trim().max(80).optional().or(z.literal('')).optional(),
  hashtags: z.array(z.string().trim().min(1)).max(20).optional(),
})

export type SocialProvider = z.infer<typeof socialProviderSchema>
export type ZernioCallbackInput = z.infer<typeof zernioCallbackSchema>
export type PublishSocialPostPayload = z.infer<typeof publishSocialPostSchema>
