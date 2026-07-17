import { z } from 'zod'

export const copilotMessageSchema = z.object({
  message: z.string().trim().min(2, 'Message must be at least 2 characters').max(2500),
  sessionId: z.string().trim().optional(),
})

export const copilotSessionIdSchema = z.object({
  id: z.string().trim().min(1, 'Session id is required'),
})

export type CopilotMessagePayload = z.infer<typeof copilotMessageSchema>
