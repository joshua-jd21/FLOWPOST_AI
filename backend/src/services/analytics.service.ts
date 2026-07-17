import mongoose from 'mongoose'
import { memoryAIHistory, memoryConnectedAccounts, memoryPosts } from '../config/db.js'
import { AIHistory } from '../models/ai-history.model.js'
import { ConnectedAccount } from '../models/connected-account.model.js'
import { Post } from '../models/post.model.js'

type AnalyticsPost = {
  id: string
  title: string
  platform: string
  status: 'draft' | 'scheduled' | 'published'
  scheduledAt?: Date
  createdAt: Date
  updatedAt: Date
}

const platforms = ['Instagram', 'LinkedIn', 'X (Twitter)', 'Facebook']

const isMongoAvailable = () => mongoose.connection.readyState === 1

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const formatDay = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const formatMonth = (date: Date) => date.toLocaleDateString('en-US', { month: 'short' })

const serializePost = (post: any): AnalyticsPost => ({
  id: post.id || post._id?.toString(),
  title: post.title,
  platform: post.platform,
  status: post.status,
  scheduledAt: post.scheduledAt ? new Date(post.scheduledAt) : undefined,
  createdAt: new Date(post.createdAt),
  updatedAt: new Date(post.updatedAt),
})

const buildWeeklyTrend = (posts: AnalyticsPost[]) => {
  const today = startOfDay(new Date())
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    return date
  })

  return days.map((date) => {
    const next = new Date(date)
    next.setDate(date.getDate() + 1)

    return {
      label: formatDay(date),
      posts: posts.filter((post) => post.createdAt >= date && post.createdAt < next).length,
      scheduled: posts.filter((post) => post.scheduledAt && post.scheduledAt >= date && post.scheduledAt < next).length,
    }
  })
}

const buildMonthlyTrend = (posts: AnalyticsPost[]) => {
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    return date
  })

  return months.map((date) => {
    const next = new Date(date.getFullYear(), date.getMonth() + 1, 1)

    return {
      label: formatMonth(date),
      posts: posts.filter((post) => post.createdAt >= date && post.createdAt < next).length,
      published: posts.filter((post) => post.status === 'published' && post.updatedAt >= date && post.updatedAt < next).length,
    }
  })
}

const buildPlatformAnalytics = (posts: AnalyticsPost[]) => {
  return platforms.map((platform) => {
    const platformPosts = posts.filter((post) => post.platform === platform)

    return {
      platform,
      posts: platformPosts.length,
      scheduled: platformPosts.filter((post) => post.status === 'scheduled').length,
      published: platformPosts.filter((post) => post.status === 'published').length,
      drafts: platformPosts.filter((post) => post.status === 'draft').length,
    }
  })
}

const buildRecentActivity = (posts: AnalyticsPost[], aiCount: number, connectedAccounts: number) => {
  const postActivity = posts
    .slice()
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5)
    .map((post) => ({
      title: post.status === 'scheduled' ? 'Post scheduled' : post.status === 'draft' ? 'Draft updated' : 'Post published',
      detail: `${post.platform} • ${post.title}`,
      timestamp: post.updatedAt,
    }))

  return [
    ...postActivity,
    aiCount ? { title: 'AI content generated', detail: `${aiCount} generations saved`, timestamp: new Date() } : null,
    connectedAccounts ? { title: 'Channels connected', detail: `${connectedAccounts} active accounts`, timestamp: new Date() } : null,
  ].filter(Boolean).slice(0, 6)
}

const buildInsights = (platformAnalytics: ReturnType<typeof buildPlatformAnalytics>, aiGenerated: number, scheduled: number) => {
  const topPlatform = platformAnalytics.slice().sort((a, b) => b.posts - a.posts)[0]
  const insights: string[] = []

  if (topPlatform && topPlatform.posts > 0) {
    insights.push(`${topPlatform.platform} posts perform best by volume in your current workspace.`)
  } else {
    insights.push('Create posts across multiple platforms to unlock richer platform insights.')
  }

  if (scheduled > 0) {
    insights.push(`${scheduled} posts are queued, giving your content calendar momentum.`)
  } else {
    insights.push('Scheduling a few posts ahead will make your dashboard trends more useful.')
  }

  if (aiGenerated > 0) {
    insights.push(`AI has generated ${aiGenerated} content drafts, which can speed up your publishing workflow.`)
  }

  return insights
}

export const getAnalyticsOverview = async (userId: string) => {
  const posts = isMongoAvailable()
    ? (await Post.find({ createdBy: userId })).map(serializePost)
    : memoryPosts.filter((post) => post.createdBy === userId).map(serializePost)

  const aiGenerated = isMongoAvailable()
    ? await AIHistory.countDocuments({ userId })
    : memoryAIHistory.filter((entry) => entry.userId === userId).length

  const connectedAccounts = isMongoAvailable()
    ? await ConnectedAccount.countDocuments({ userId, status: 'connected', verifiedAt: { $exists: true } })
    : memoryConnectedAccounts.filter((entry) => entry.userId === userId && entry.status === 'connected' && entry.verifiedAt).length

  const totalPosts = posts.length
  const scheduled = posts.filter((post) => post.status === 'scheduled').length
  const published = posts.filter((post) => post.status === 'published').length
  const drafts = posts.filter((post) => post.status === 'draft').length
  const platformAnalytics = buildPlatformAnalytics(posts)

  return {
    kpis: {
      totalPosts,
      scheduled,
      published,
      drafts,
      aiGenerated,
      connectedAccounts,
    },
    weeklyTrend: buildWeeklyTrend(posts),
    monthlyTrend: buildMonthlyTrend(posts),
    platformAnalytics,
    statusBreakdown: [
      { name: 'Scheduled', value: scheduled },
      { name: 'Published', value: published },
      { name: 'Drafts', value: drafts },
    ],
    recentActivity: buildRecentActivity(posts, aiGenerated, connectedAccounts),
    insights: buildInsights(platformAnalytics, aiGenerated, scheduled),
  }
}
