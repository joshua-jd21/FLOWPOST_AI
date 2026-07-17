import { z } from 'zod'

const colorSchema = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Use hex colors like #7C3AED')

export const brandKitSchema = z.object({
  brandName: z.string().trim().min(2, 'Brand name is required').max(80),
  description: z.string().trim().min(10, 'Brand description is required').max(800),
  industry: z.string().trim().min(2, 'Industry is required').max(120),
  website: z.string().trim().url('Enter a valid website URL').optional().or(z.literal('')),
  targetAudience: z.string().trim().min(3, 'Target audience is required').max(240),
  colors: z.array(colorSchema).min(1, 'Add at least one brand color').max(6, 'Use up to 6 colors'),
  toneOfVoice: z.string().trim().min(3, 'Tone of voice is required').max(260),
  logoUrl: z.string().optional().or(z.literal('')),
})

export type BrandKitPayload = z.infer<typeof brandKitSchema>
