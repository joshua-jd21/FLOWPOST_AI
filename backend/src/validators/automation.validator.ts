import { z } from 'zod'

const automationActionSchema = z.object({
  type: z.enum(['generate', 'schedule', 'publish', 'notify']),
  config: z.record(z.string(), z.unknown()).default({}),
})

export const automationWorkflowPayloadSchema = z.object({
  name: z.string().trim().min(2, 'Workflow name is required').max(120),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  status: z.enum(['active', 'paused']).default('active'),
  trigger: z.object({
    type: z.literal('scheduled').default('scheduled'),
    runAt: z.string().datetime('Choose a valid trigger date and time'),
    timezone: z.string().trim().max(80).optional().or(z.literal('')),
  }),
  actions: z.array(automationActionSchema).min(1, 'Add at least one automation action').max(4),
})

export const automationWorkflowUpdateSchema = automationWorkflowPayloadSchema.partial({
  name: true,
  description: true,
  status: true,
  trigger: true,
  actions: true,
})

export const automationWorkflowIdSchema = z.object({
  id: z.string().trim().min(1, 'Workflow id is required'),
})

export type AutomationWorkflowPayload = z.infer<typeof automationWorkflowPayloadSchema>
export type AutomationWorkflowUpdatePayload = z.infer<typeof automationWorkflowUpdateSchema>
