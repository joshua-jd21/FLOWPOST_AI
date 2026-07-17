import mongoose from 'mongoose'
import { memoryAutomationWorkflows } from '../config/db.js'
import { AutomationWorkflow } from '../models/automation-workflow.model.js'
import { AppError } from '../utils/errors.js'
import { generateCaptionContent } from './ai.service.js'
import { createPost, publishPost } from './post.service.js'
import { publishSocialPost } from './social.service.js'
import type { AutomationWorkflowPayload, AutomationWorkflowUpdatePayload } from '../validators/automation.validator.js'

type AutomationActionType = 'generate' | 'schedule' | 'publish' | 'notify'
type AutomationWorkflowStatus = 'active' | 'paused'

type AutomationAction = {
  type: AutomationActionType
  config: Record<string, unknown>
}

type StoredAutomationWorkflow = {
  id: string
  createdBy: string
  name: string
  description?: string
  status: AutomationWorkflowStatus
  trigger: {
    type: 'scheduled'
    runAt: Date
    timezone?: string
  }
  actions: AutomationAction[]
  lastRunAt?: Date
  nextRunAt?: Date
  runCount: number
  lastRunStatus?: 'success' | 'failed'
  lastRunMessage?: string
  createdAt: Date
  updatedAt: Date
}

type GeneratedContent = {
  caption?: string
  hashtags?: string[]
  ctaSuggestions?: string[]
  imageUrl?: string
  imageError?: string
}

const isMongoAvailable = () => mongoose.connection.readyState === 1

const normalizePayload = (input: AutomationWorkflowPayload | AutomationWorkflowUpdatePayload) => ({
  ...input,
  description: input.description || undefined,
  trigger: input.trigger
    ? {
        type: 'scheduled' as const,
        runAt: new Date(input.trigger.runAt),
        timezone: input.trigger.timezone || undefined,
      }
    : undefined,
  nextRunAt: input.trigger ? new Date(input.trigger.runAt) : undefined,
})

const serializeWorkflow = (workflow: any) => ({
  id: workflow.id || workflow._id?.toString(),
  createdBy: workflow.createdBy?.toString?.() ?? workflow.createdBy,
  name: workflow.name,
  description: workflow.description,
  status: workflow.status,
  trigger: workflow.trigger,
  actions: workflow.actions ?? [],
  lastRunAt: workflow.lastRunAt,
  nextRunAt: workflow.nextRunAt,
  runCount: workflow.runCount ?? 0,
  lastRunStatus: workflow.lastRunStatus,
  lastRunMessage: workflow.lastRunMessage,
  createdAt: workflow.createdAt,
  updatedAt: workflow.updatedAt,
})

const stringFromConfig = (config: Record<string, unknown>, key: string, fallback: string) => {
  const value = config[key]
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

const boolFromConfig = (config: Record<string, unknown>, key: string, fallback = false) => {
  const value = config[key]
  return typeof value === 'boolean' ? value : fallback
}

const buildCaptionWithHashtags = (content: GeneratedContent) => {
  const hashtags = content.hashtags?.length ? `\n\n${content.hashtags.join(' ')}` : ''
  const ctas = content.ctaSuggestions?.length ? `\n\n${content.ctaSuggestions[0]}` : ''
  return `${content.caption || 'AI-generated content'}${hashtags}${ctas}`
}

const getWorkflowById = async (userId: string, workflowId: string) => {
  if (!isMongoAvailable()) {
    return memoryAutomationWorkflows.find((workflow) => workflow.id === workflowId && workflow.createdBy === userId) ?? null
  }

  if (!mongoose.isValidObjectId(workflowId)) {
    return null
  }

  return AutomationWorkflow.findOne({ _id: workflowId, createdBy: userId })
}

const markWorkflowRun = async (workflow: any, status: 'success' | 'failed', message: string) => {
  const now = new Date()

  workflow.lastRunAt = now
  workflow.lastRunStatus = status
  workflow.lastRunMessage = message
  workflow.runCount = (workflow.runCount ?? 0) + 1
  workflow.nextRunAt = undefined
  workflow.status = workflow.status === 'active' ? 'paused' : workflow.status
  workflow.updatedAt = now

  if (isMongoAvailable() && typeof workflow.save === 'function') {
    await workflow.save()
  }
}

export const listAutomationWorkflows = async (userId: string) => {
  if (!isMongoAvailable()) {
    return memoryAutomationWorkflows
      .filter((workflow) => workflow.createdBy === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map(serializeWorkflow)
  }

  const workflows = await AutomationWorkflow.find({ createdBy: userId }).sort({ updatedAt: -1 }).limit(50)
  return workflows.map(serializeWorkflow)
}

export const createAutomationWorkflow = async (userId: string, input: AutomationWorkflowPayload) => {
  const payload = normalizePayload(input)
  const now = new Date()

  if (!isMongoAvailable()) {
    const workflow: StoredAutomationWorkflow = {
      id: `${memoryAutomationWorkflows.length + 1}`,
      createdBy: userId,
      name: input.name,
      description: input.description || undefined,
      status: input.status,
      trigger: payload.trigger as StoredAutomationWorkflow['trigger'],
      actions: input.actions as AutomationAction[],
      nextRunAt: payload.nextRunAt,
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    }
    memoryAutomationWorkflows.unshift(workflow)
    return serializeWorkflow(workflow)
  }

  const created = await AutomationWorkflow.create({
    name: input.name,
    description: input.description || undefined,
    status: input.status,
    trigger: payload.trigger,
    actions: input.actions,
    nextRunAt: payload.nextRunAt,
    createdBy: userId,
  })
  return serializeWorkflow(created)
}

export const updateAutomationWorkflow = async (userId: string, workflowId: string, input: AutomationWorkflowUpdatePayload) => {
  const workflow = await getWorkflowById(userId, workflowId)

  if (!workflow) {
    throw new AppError('Automation workflow not found', 404)
  }

  const payload = normalizePayload(input)
  const workflowRecord = workflow as any

  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) {
      workflowRecord[key] = value
    }
  }

  workflowRecord.updatedAt = new Date()

  if (isMongoAvailable() && typeof workflowRecord.save === 'function') {
    await workflowRecord.save()
  }

  return serializeWorkflow(workflowRecord)
}

export const deleteAutomationWorkflow = async (userId: string, workflowId: string) => {
  if (!isMongoAvailable()) {
    const index = memoryAutomationWorkflows.findIndex((workflow) => workflow.id === workflowId && workflow.createdBy === userId)

    if (index < 0) {
      throw new AppError('Automation workflow not found', 404)
    }

    memoryAutomationWorkflows.splice(index, 1)
    return
  }

  const deleted = await AutomationWorkflow.findOneAndDelete({ _id: workflowId, createdBy: userId })

  if (!deleted) {
    throw new AppError('Automation workflow not found', 404)
  }
}

export const runAutomationWorkflow = async (userId: string, workflowId: string) => {
  const workflow = await getWorkflowById(userId, workflowId)

  if (!workflow) {
    throw new AppError('Automation workflow not found', 404)
  }

  let generated: GeneratedContent | null = null
  let post: { id: string } | null = null
  const completed: string[] = []

  try {
    for (const action of workflow.actions as AutomationAction[]) {
      if (action.type === 'generate') {
        generated = await generateCaptionContent(userId, {
          platform: stringFromConfig(action.config, 'platform', 'Instagram'),
          contentType: stringFromConfig(action.config, 'contentType', 'Educational'),
          tone: stringFromConfig(action.config, 'tone', 'Professional'),
          audience: stringFromConfig(action.config, 'audience', 'Creators and small teams'),
          prompt: stringFromConfig(action.config, 'prompt', workflow.description || workflow.name),
          generateImage: boolFromConfig(action.config, 'generateImage', true),
        })
        completed.push('generated AI content')
      }

      if (action.type === 'schedule') {
        const scheduleAt = stringFromConfig(action.config, 'scheduledAt', workflow.trigger.runAt.toISOString())
        const schedulePlatform = stringFromConfig(action.config, 'platform', stringFromConfig(workflow.actions.find((item: AutomationAction) => item.type === 'generate')?.config ?? {}, 'platform', 'Instagram'))
        post = await createPost(userId, {
          title: stringFromConfig(action.config, 'title', workflow.name),
          caption: buildCaptionWithHashtags(generated ?? {}),
          platform: schedulePlatform as 'Instagram' | 'LinkedIn' | 'X (Twitter)' | 'Facebook',
          media: generated?.imageUrl ? [{ url: generated.imageUrl, type: 'image/jpeg', name: 'AI automation thumbnail' }] : [],
          scheduledAt: scheduleAt,
          status: 'scheduled',
        })
        completed.push('scheduled a post')
      }

      if (action.type === 'publish') {
        if (post?.id) {
          await publishPost(userId, post.id)
        } else {
          await publishSocialPost(userId, {
            platform: stringFromConfig(action.config, 'platform', 'Instagram') as 'Instagram' | 'LinkedIn' | 'X (Twitter)' | 'Facebook',
            caption: buildCaptionWithHashtags(generated ?? {}),
            media: generated?.imageUrl ? [{ url: generated.imageUrl, type: 'image/jpeg', name: 'AI automation thumbnail' }] : [],
          })
        }
        completed.push('published through Zernio')
      }

      if (action.type === 'notify') {
        completed.push(`prepared notification: ${stringFromConfig(action.config, 'message', 'Automation completed')}`)
      }
    }

    const message = completed.length ? `Workflow completed: ${completed.join(', ')}.` : 'Workflow completed.'
    await markWorkflowRun(workflow, 'success', message)
    return { workflow: serializeWorkflow(workflow), message }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Workflow failed'
    await markWorkflowRun(workflow, 'failed', message)
    throw new AppError(message, error instanceof AppError ? error.statusCode : 500)
  }
}

export const runDueAutomationWorkflows = async () => {
  const now = new Date()
  const mongoAvailable = isMongoAvailable()
  const dueWorkflows = mongoAvailable
    ? await AutomationWorkflow.find({ status: 'active', nextRunAt: { $lte: now } }).limit(20)
    : memoryAutomationWorkflows.filter((workflow) => workflow.status === 'active' && workflow.nextRunAt && workflow.nextRunAt <= now).slice(0, 20)
  const results: Array<{ id: string; status: 'success' | 'failed'; message: string }> = []

  for (const workflow of dueWorkflows) {
    const workflowId = mongoAvailable ? (workflow as any)._id.toString() : (workflow as StoredAutomationWorkflow).id
    const userId = workflow.createdBy?.toString?.() ?? workflow.createdBy

    try {
      const result = await runAutomationWorkflow(userId, workflowId)
      results.push({ id: workflowId, status: 'success', message: result.message })
    } catch (error) {
      results.push({ id: workflowId, status: 'failed', message: error instanceof Error ? error.message : 'Workflow failed' })
    }
  }

  return results
}
