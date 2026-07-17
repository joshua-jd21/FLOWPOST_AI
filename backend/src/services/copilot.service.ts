import mongoose from 'mongoose'
import { memoryCopilotSessions } from '../config/db.js'
import { CopilotChatSession } from '../models/copilot-chat.model.js'
import { env } from '../utils/env.js'
import { generateCaptionContent } from './ai.service.js'
import { getAnalyticsOverview } from './analytics.service.js'
import { createAutomationWorkflow, listAutomationWorkflows } from './automation.service.js'
import { getBrandKitContext } from './brand-kit.service.js'
import { generateCampaign, listCampaigns } from './campaign.service.js'
import { getTrendIntelligence } from './competitor.service.js'
import { createPost, listPosts, publishPost } from './post.service.js'
import { listConnectedAccounts, publishSocialPost } from './social.service.js'
import type { CopilotMessagePayload } from '../validators/copilot.validator.js'

type CopilotActionStatus = 'completed' | 'needs_input' | 'failed'
type CopilotAction = {
  type: string
  label: string
  status: CopilotActionStatus
  data?: unknown
}

type CopilotMessage = {
  role: 'user' | 'assistant'
  content: string
  actions?: CopilotAction[]
  createdAt: Date
}

type StoredCopilotSession = {
  id: string
  createdBy: string
  title: string
  messages: CopilotMessage[]
  createdAt: Date
  updatedAt: Date
}

type GeminiInteractionResponse = {
  output_text?: string
  steps?: Array<{
    output?: Array<{
      type?: string
      text?: string
    }>
  }>
  error?: {
    message?: string
  }
}

const platforms = ['Instagram', 'LinkedIn', 'X (Twitter)'] as const

const isMongoAvailable = () => mongoose.connection.readyState === 1

const titleFromMessage = (message: string) => {
  const cleaned = message.replace(/\s+/g, ' ').trim()
  return cleaned.length > 62 ? `${cleaned.slice(0, 62)}...` : cleaned || 'Content Copilot chat'
}

const serializeSession = (session: any): StoredCopilotSession => ({
  id: session.id || session._id?.toString(),
  createdBy: session.createdBy?.toString?.() ?? session.createdBy,
  title: session.title,
  messages: (session.messages ?? []).map((message: any) => ({
    role: message.role,
    content: message.content,
    actions: message.actions ?? [],
    createdAt: message.createdAt,
  })),
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
})

const extractGeminiText = (data: GeminiInteractionResponse) => {
  if (data.output_text) {
    return data.output_text
  }

  return data.steps
    ?.flatMap((step) => step.output || [])
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text)
    .join('')
}

const askGemini = async (prompt: string) => {
  if (!env.GEMINI_API_KEY) {
    return ''
  }

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      model: env.GEMINI_TEXT_MODEL,
      input: prompt,
      generation_config: { temperature: 0.58 },
    }),
    signal: AbortSignal.timeout(env.GEMINI_REQUEST_TIMEOUT_MS),
  })

  const data = (await response.json().catch(() => ({}))) as GeminiInteractionResponse

  if (!response.ok) {
    throw new Error(data.error?.message || `Gemini request failed with status ${response.status}`)
  }

  return extractGeminiText(data)?.trim() || ''
}

const getOrCreateSession = async (userId: string, payload: CopilotMessagePayload) => {
  if (!isMongoAvailable()) {
    const existing = payload.sessionId
      ? memoryCopilotSessions.find((session) => session.id === payload.sessionId && session.createdBy === userId)
      : null

    if (existing) {
      return existing
    }

    const now = new Date()
    const session = {
      id: `${memoryCopilotSessions.length + 1}`,
      createdBy: userId,
      title: titleFromMessage(payload.message),
      messages: [],
      createdAt: now,
      updatedAt: now,
    }
    memoryCopilotSessions.unshift(session)
    return session
  }

  if (payload.sessionId && mongoose.isValidObjectId(payload.sessionId)) {
    const existing = await CopilotChatSession.findOne({ _id: payload.sessionId, createdBy: userId })

    if (existing) {
      return existing
    }
  }

  return CopilotChatSession.create({
    createdBy: userId,
    title: titleFromMessage(payload.message),
    messages: [],
  })
}

const saveMessages = async (session: any, userMessage: CopilotMessage, assistantMessage: CopilotMessage) => {
  if (!isMongoAvailable()) {
    const memorySession = session as StoredCopilotSession
    memorySession.messages.push(userMessage, assistantMessage)
    memorySession.updatedAt = new Date()
    return serializeSession(memorySession)
  }

  const mongoSession = session as any
  mongoSession.messages.push(userMessage, assistantMessage)
  await mongoSession.save()
  return serializeSession(mongoSession)
}

const detectPlatforms = (message: string) => {
  const lower = message.toLowerCase()
  const detected = platforms.filter((platform) => {
    if (platform === 'X (Twitter)') {
      return /\bx\b|\btwitter\b/.test(lower)
    }

    return lower.includes(platform.toLowerCase())
  })

  return detected.length ? detected : [...platforms]
}

const detectPlatform = (message: string): 'Instagram' | 'LinkedIn' | 'X (Twitter)' | 'Facebook' => {
  const lower = message.toLowerCase()

  if (lower.includes('linkedin')) {
    return 'LinkedIn'
  }

  if (/\bx\b|\btwitter\b/.test(lower)) {
    return 'X (Twitter)'
  }

  if (lower.includes('facebook')) {
    return 'Facebook'
  }

  return 'Instagram'
}

const detectDuration = (message: string): 7 | 15 | 30 => {
  if (/\b30\b|month/i.test(message)) {
    return 30
  }

  if (/\b15\b|two weeks|fortnight/i.test(message)) {
    return 15
  }

  return 7
}

const detectScheduleDate = (message: string) => {
  const lower = message.toLowerCase()
  const date = new Date()

  if (lower.includes('tomorrow')) {
    date.setDate(date.getDate() + 1)
  } else if (lower.includes('next week')) {
    date.setDate(date.getDate() + 7)
  } else {
    date.setDate(date.getDate() + 2)
  }

  const timeMatch = message.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
  const hour = timeMatch ? Number(timeMatch[1]) % 12 : 9
  const minute = timeMatch?.[2] ? Number(timeMatch[2]) : 0
  const isPm = timeMatch?.[3]?.toLowerCase() === 'pm'
  date.setHours(isPm ? hour + 12 : hour, minute, 0, 0)
  return date
}

const campaignTitleFromMessage = (message: string) =>
  titleFromMessage(message).replace(/[?.!]+$/g, '') || 'Content Copilot campaign'

const buildCaptionWithHashtags = (content: { caption?: string; hashtags?: string[]; ctaSuggestions?: string[] }) => {
  const hashtags = content.hashtags?.length ? `\n\n${content.hashtags.join(' ')}` : ''
  const cta = content.ctaSuggestions?.length ? `\n\n${content.ctaSuggestions[0]}` : ''
  return `${content.caption || 'AI-generated social content'}${hashtags}${cta}`
}

const summarizeActionData = (actions: CopilotAction[]) => actions.map((action) => ({
  type: action.type,
  label: action.label,
  status: action.status,
  data: action.data,
}))

const buildFallbackReply = (actions: CopilotAction[]) => {
  if (!actions.length) {
    return 'I can create campaigns, generate AI Studio drafts, schedule posts, publish through connected accounts, review analytics, and set up automation workflows. Try asking for a campaign, a scheduled post, or a publish-ready launch plan.'
  }

  const failed = actions.find((action) => action.status === 'failed')

  if (failed) {
    return `I started the workflow, but one step needs attention: ${failed.label}`
  }

  const sections = actions.map((action) => {
    const payload = action.data as any

    if (action.type === 'campaign' && payload) {
      const ideas = payload.ideas ?? []
      const previewIdeas = ideas.slice(0, 6).map((idea: any) =>
        `Day ${idea.day}: ${idea.title} for ${idea.platform} at ${idea.bestTime}`,
      )

      return [
        `Campaign ready: ${payload.title || 'Generated campaign'}`,
        `Summary: ${payload.durationDays || ideas.length}-day plan for ${(payload.platforms ?? []).join(', ') || 'your selected platforms'}.`,
        previewIdeas.length ? `Daily ideas:\n${previewIdeas.join('\n')}` : '',
        ideas.length > previewIdeas.length ? `Plus ${ideas.length - previewIdeas.length} more daily content ideas in the generated plan.` : '',
      ].filter(Boolean).join('\n')
    }

    if (action.type === 'ai_studio' && payload) {
      return [
        'AI Studio draft ready:',
        payload.caption ? `Caption: ${payload.caption}` : '',
        payload.hashtags?.length ? `Hashtags: ${payload.hashtags.join(' ')}` : '',
        payload.ctaSuggestions?.length ? `CTA options: ${payload.ctaSuggestions.join(' | ')}` : '',
      ].filter(Boolean).join('\n')
    }

    if (action.type === 'scheduler' && payload) {
      return `Scheduling plan ready: ${payload.title || action.label} is ${payload.status || 'scheduled'}${payload.scheduledAt ? ` for ${new Date(payload.scheduledAt).toLocaleString('en-US')}` : ''}.`
    }

    if (action.type === 'automation' && payload) {
      const steps = (payload.actions ?? []).map((step: any, index: number) => `${index + 1}. ${step.type}`)
      return [
        `Automation workflow ready: ${payload.name || action.label}`,
        payload.description ? `Goal: ${payload.description}` : '',
        steps.length ? `Workflow steps:\n${steps.join('\n')}` : '',
      ].filter(Boolean).join('\n')
    }

    if (action.type === 'zernio_publish') {
      return action.label
    }

    return action.label
  })

  return sections.filter(Boolean).join('\n\n')
}

const executeCopilotActions = async (userId: string, message: string): Promise<CopilotAction[]> => {
  const lower = message.toLowerCase()
  const actions: CopilotAction[] = []
  let generatedContent: Awaited<ReturnType<typeof generateCaptionContent>> | null = null
  let scheduledPost: { id: string } | null = null

  if (/\bbrand kit|brand voice|persona|tone\b/.test(lower)) {
    const brandKit = await getBrandKitContext(userId)
    actions.push({
      type: 'brand_context',
      label: brandKit ? `Loaded ${brandKit.brandName || 'your'} brand context.` : 'No saved brand context yet.',
      status: brandKit ? 'completed' : 'needs_input',
      data: brandKit,
    })
  }

  if (/\baccount|connect|connected|zernio|channel\b/.test(lower)) {
    const accounts = await listConnectedAccounts(userId)
    actions.push({
      type: 'connected_accounts',
      label: 'Checked connected social accounts and Zernio readiness.',
      status: 'completed',
      data: accounts,
    })
  }

  if (/\banalytics|insight|performance|kpi|report\b/.test(lower)) {
    const analytics = await getAnalyticsOverview(userId)
    actions.push({
      type: 'analytics',
      label: 'Loaded analytics and content performance signals.',
      status: 'completed',
      data: analytics,
    })
  }

  if (/\btrend|competitor|hashtag|content gap|market\b/.test(lower)) {
    const intelligence = await getTrendIntelligence(userId)
    actions.push({
      type: 'insights',
      label: 'Loaded competitor insights and market recommendations.',
      status: 'completed',
      data: intelligence,
    })
  }

  if (/\bcampaign|calendar|content plan|30-day|15-day|7-day\b/.test(lower)) {
    const campaign = await generateCampaign(userId, {
      title: campaignTitleFromMessage(message),
      objective: message.length > 12 ? message : 'Create a social media campaign for a creator brand.',
      audience: 'Creators, founders, marketers, and social media teams',
      durationDays: detectDuration(message),
      platforms: detectPlatforms(message),
      startDate: new Date().toISOString(),
      brandVoice: 'premium, creative, concise, and helpful',
    })
    actions.push({
      type: 'campaign',
      label: `Created a ${campaign.durationDays}-day campaign with ${campaign.ideas.length} content ideas.`,
      status: 'completed',
      data: campaign,
    })
  }

  const shouldGenerate = /\b(generate|write|draft|caption|post|launch|thumbnail)\b/.test(lower)
  if (shouldGenerate && !/\bautomation workflow\b/.test(lower)) {
    generatedContent = await generateCaptionContent(userId, {
      platform: detectPlatform(message),
      contentType: lower.includes('launch') ? 'Product Launch' : lower.includes('promo') ? 'Promotional' : 'Educational',
      tone: lower.includes('casual') ? 'Casual' : 'Professional',
      audience: 'Creators, founders, marketers, and social media teams',
      prompt: message.length > 10 ? message : 'Create a useful social media post.',
      generateImage: /\bimage|thumbnail|visual|creative\b/.test(lower),
    })
    actions.push({
      type: 'ai_studio',
      label: generatedContent.imageUrl ? 'Generated an AI Studio caption and thumbnail.' : 'Generated an AI Studio caption.',
      status: 'completed',
      data: generatedContent,
    })
  }

  if (/\b(schedule|queue|next week|tomorrow|calendar this)\b/.test(lower)) {
    const scheduledAt = detectScheduleDate(message)
    scheduledPost = await createPost(userId, {
      title: campaignTitleFromMessage(message),
      caption: generatedContent ? buildCaptionWithHashtags(generatedContent) : message,
      platform: detectPlatform(message),
      media: generatedContent?.imageUrl ? [{ url: generatedContent.imageUrl, type: 'image/jpeg', name: 'Content Copilot thumbnail' }] : [],
      scheduledAt: scheduledAt.toISOString(),
      status: 'scheduled',
    })
    actions.push({
      type: 'scheduler',
      label: `Scheduled a ${detectPlatform(message)} post for ${scheduledAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.`,
      status: 'completed',
      data: scheduledPost,
    })
  }

  if (/\b(publish|post now|go live)\b/.test(lower)) {
    if (scheduledPost?.id) {
      const result = await publishPost(userId, scheduledPost.id)
      actions.push({
        type: 'zernio_publish',
        label: 'Published the scheduled post through Zernio.',
        status: 'completed',
        data: result,
      })
    } else if (generatedContent) {
      const result = await publishSocialPost(userId, {
        platform: detectPlatform(message),
        caption: buildCaptionWithHashtags(generatedContent),
        media: generatedContent.imageUrl ? [{ url: generatedContent.imageUrl, type: 'image/jpeg', name: 'Content Copilot thumbnail' }] : [],
      })
      actions.push({
        type: 'zernio_publish',
        label: `Published ${detectPlatform(message)} content through Zernio.`,
        status: 'completed',
        data: result,
      })
    } else {
      actions.push({
        type: 'zernio_publish',
        label: 'Generate or select content before publishing through Zernio.',
        status: 'needs_input',
      })
    }
  }

  if (/\b(automation|workflow|automate|recurring|auto-generate)\b/.test(lower)) {
    const runAt = detectScheduleDate(message)
    const workflow = await createAutomationWorkflow(userId, {
      name: campaignTitleFromMessage(message),
      description: message,
      status: 'active',
      trigger: {
        type: 'scheduled',
        runAt: runAt.toISOString(),
      },
      actions: [
        {
          type: 'generate',
          config: {
            platform: detectPlatform(message),
            contentType: lower.includes('launch') ? 'Product Launch' : 'Educational',
            tone: 'Professional',
            audience: 'Creators, founders, marketers, and social media teams',
            prompt: message,
            generateImage: true,
          },
        },
        {
          type: 'schedule',
          config: {
            title: campaignTitleFromMessage(message),
            platform: detectPlatform(message),
            scheduledAt: runAt.toISOString(),
          },
        },
      ],
    })
    actions.push({
      type: 'automation',
      label: 'Created an AI workflow.',
      status: 'completed',
      data: workflow,
    })
  }

  if (!actions.length && /\b(show|list|upcoming|drafts|workflows)\b/.test(lower)) {
    const posts = await listPosts(userId, { upcoming: lower.includes('upcoming'), limit: 10 })
    const campaigns = await listCampaigns(userId)
    const workflows = await listAutomationWorkflows(userId)
    actions.push({
      type: 'workspace',
      label: 'Loaded workspace summary across campaigns, posts, and workflows.',
      status: 'completed',
      data: { posts, campaigns: campaigns.slice(0, 5), workflows: workflows.slice(0, 5) },
    })
  }

  return actions
}

const buildGeminiReply = async (userId: string, message: string, history: CopilotMessage[], actions: CopilotAction[]) => {
  const brandKit = await getBrandKitContext(userId)
  const recentHistory = history.slice(-10).map((entry) => `${entry.role}: ${entry.content}`).join('\n')

  const prompt = `
You are PostPilot AI Content Copilot inside a premium social media creator SaaS.
You orchestrate AI Studio, saved brand context, campaign generation, Scheduler, Analytics, Connected Accounts, Zernio publishing, and AI Automation Workflows.
Be concise, friendly, and operational. Never say an action happened unless it appears in action results. If a publish step needs a connected account, explain that clearly.

Brand context:
${brandKit ? JSON.stringify(brandKit) : 'No saved brand context yet.'}

Recent conversation:
${recentHistory || 'No previous messages.'}

User request:
${message}

Action results:
${JSON.stringify(summarizeActionData(actions))}

Write the Copilot reply in plain text. Mention completed assets, schedules, publish status, or next steps.
`

  try {
    const reply = await askGemini(prompt)
    return reply || buildFallbackReply(actions)
  } catch {
    return buildFallbackReply(actions)
  }
}

export const listCopilotSessions = async (userId: string) => {
  if (!isMongoAvailable()) {
    return memoryCopilotSessions
      .filter((session) => session.createdBy === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map(serializeSession)
  }

  const sessions = await CopilotChatSession.find({ createdBy: userId }).sort({ updatedAt: -1 }).limit(30)
  return sessions.map(serializeSession)
}

export const getCopilotSession = async (userId: string, sessionId: string) => {
  if (!isMongoAvailable()) {
    const session = memoryCopilotSessions.find((entry) => entry.id === sessionId && entry.createdBy === userId)
    return session ? serializeSession(session) : null
  }

  if (!mongoose.isValidObjectId(sessionId)) {
    return null
  }

  const session = await CopilotChatSession.findOne({ _id: sessionId, createdBy: userId })
  return session ? serializeSession(session) : null
}

export const sendCopilotMessage = async (userId: string, payload: CopilotMessagePayload) => {
  const session = await getOrCreateSession(userId, payload)
  const serialized = serializeSession(session)
  const userMessage: CopilotMessage = {
    role: 'user',
    content: payload.message,
    createdAt: new Date(),
  }

  let actions: CopilotAction[] = []

  try {
    actions = await executeCopilotActions(userId, payload.message)
  } catch (error) {
    actions = [{
      type: 'copilot_error',
      label: error instanceof Error ? error.message : 'The Copilot workflow could not be completed.',
      status: 'failed',
    }]
  }

  const content = await buildGeminiReply(userId, payload.message, serialized.messages, actions)
  const assistantMessage: CopilotMessage = {
    role: 'assistant',
    content,
    actions,
    createdAt: new Date(),
  }
  const savedSession = await saveMessages(session, userMessage, assistantMessage)

  return {
    session: savedSession,
    copilotMessage: assistantMessage,
  }
}
