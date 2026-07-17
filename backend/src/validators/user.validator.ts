import { z } from 'zod'

export const settingsPayloadSchema = z.object({
  theme: z.enum(['system', 'dark', 'dim']).default('dark'),
  emailNotifications: z.boolean().default(true),
  weeklyDigest: z.boolean().default(true),
  productUpdates: z.boolean().default(false),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmNewPassword: z.string().min(6, 'Please confirm your new password'),
}).refine((input) => input.newPassword === input.confirmNewPassword, {
  message: 'New passwords do not match',
  path: ['confirmNewPassword'],
})

export type SettingsPayload = z.infer<typeof settingsPayloadSchema>
export type ChangePasswordPayload = z.infer<typeof changePasswordSchema>
