import mongoose from 'mongoose'

export const memoryUsers: Array<{ id: string; name: string; email: string; password: string; avatar?: string; isActive?: boolean }> = []
export const memoryAIHistory: Array<{ id: string; userId: string; type: 'caption' | 'image' | 'post'; input: string; output: string }> = []
export const memoryConnectedAccounts: Array<{
  id: string
  userId: string
  provider: 'linkedin' | 'x' | 'instagram' | 'facebook'
  providerAccountId: string
  accountName: string
  profileImageUrl?: string
  connectToken?: string
  status: 'connected' | 'disconnected' | 'needs_reauth'
  verifiedAt?: Date
  scopes: string[]
}> = []
export const memoryPosts: Array<{
  id: string
  title: string
  caption: string
  platform: 'Instagram' | 'LinkedIn' | 'X (Twitter)' | 'Facebook'
  media: Array<{ url: string; type?: string; name?: string; size?: number }>
  scheduledAt?: Date
  status: 'draft' | 'scheduled' | 'published'
  publishedAt?: Date
  externalPostId?: string
  zernioPostId?: string
  platformPostUrl?: string
  publishError?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}> = []
export const memoryCampaignPlans: Array<{
  id: string
  title: string
  objective: string
  audience: string
  durationDays: 7 | 15 | 30
  platforms: Array<'Instagram' | 'LinkedIn' | 'X (Twitter)'>
  ideas: Array<{
    id: string
    day: number
    date: Date
    platform: 'Instagram' | 'LinkedIn' | 'X (Twitter)'
    format: 'Reel' | 'Carousel' | 'Video' | 'Poll' | 'Promotional Post'
    title: string
    caption: string
    hashtags: string[]
    cta: string
    bestTime: string
    status: 'idea' | 'scheduled'
    createdPostId?: string
  }>
  createdBy: string
  createdAt: Date
  updatedAt: Date
}> = []
export const memoryBrandKits: Array<{
  id: string
  createdBy: string
  brandName: string
  description: string
  industry: string
  website?: string
  targetAudience: string
  colors: string[]
  toneOfVoice: string
  logoUrl?: string
  createdAt: Date
  updatedAt: Date
}> = []
export const memoryCompetitors: Array<{
  id: string
  createdBy: string
  name: string
  website?: string
  industry: string
  platforms: Array<'Instagram' | 'LinkedIn' | 'X (Twitter)'>
  positioning: string
  strengths: string[]
  notes?: string
  createdAt: Date
  updatedAt: Date
}> = []
export const memoryAgentSessions: Array<{
  id: string
  createdBy: string
  title: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    actions?: Array<{ type: string; label: string; status: 'completed' | 'needs_input' | 'failed'; data?: unknown }>
    createdAt: Date
  }>
  createdAt: Date
  updatedAt: Date
}> = []
export const memoryCopilotSessions: Array<{
  id: string
  createdBy: string
  title: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    actions?: Array<{ type: string; label: string; status: 'completed' | 'needs_input' | 'failed'; data?: unknown }>
    createdAt: Date
  }>
  createdAt: Date
  updatedAt: Date
}> = []
export const memoryUserSettings: Array<{
  id: string
  userId: string
  theme: 'system' | 'dark' | 'dim'
  emailNotifications: boolean
  weeklyDigest: boolean
  productUpdates: boolean
  createdAt: Date
  updatedAt: Date
}> = []
export const memoryAutomationWorkflows: Array<{
  id: string
  createdBy: string
  name: string
  description?: string
  status: 'active' | 'paused'
  trigger: {
    type: 'scheduled'
    runAt: Date
    timezone?: string
  }
  actions: Array<{
    type: 'generate' | 'schedule' | 'publish' | 'notify'
    config: Record<string, unknown>
  }>
  lastRunAt?: Date
  nextRunAt?: Date
  runCount: number
  lastRunStatus?: 'success' | 'failed'
  lastRunMessage?: string
  createdAt: Date
  updatedAt: Date
}> = []

export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/postpilot'

  try {
    await mongoose.connect(mongoUri)
    console.log('MongoDB connected')
  } catch (error) {
    console.warn('MongoDB connection failed. Continuing without a database connection.', error)
  }
}
