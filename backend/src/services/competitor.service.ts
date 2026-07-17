import mongoose from 'mongoose'
import { memoryCompetitors } from '../config/db.js'
import { Competitor } from '../models/competitor.model.js'
import { AppError } from '../utils/errors.js'
import type { CompetitorPayload } from '../validators/competitor.validator.js'

type Platform = 'Instagram' | 'LinkedIn' | 'X (Twitter)'

type StoredCompetitor = {
  id: string
  createdBy: string
  name: string
  website?: string
  industry: string
  platforms: Platform[]
  positioning: string
  strengths: string[]
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export type TrendContext = {
  competitors: string[]
  trendingTopics: string[]
  hashtags: string[]
  contentGaps: string[]
  contentIdeas: string[]
  postingSchedule: Array<{ platform: Platform; bestDays: string; bestTimes: string; recommendation: string }>
}

const isMongoAvailable = () => mongoose.connection.readyState === 1

const normalizePayload = (input: CompetitorPayload) => ({
  name: input.name,
  website: input.website || undefined,
  industry: input.industry,
  platforms: input.platforms as Platform[],
  positioning: input.positioning,
  strengths: input.strengths,
  notes: input.notes || undefined,
})

const serializeCompetitor = (competitor: any) => ({
  id: competitor.id || competitor._id?.toString(),
  createdBy: competitor.createdBy?.toString?.() ?? competitor.createdBy,
  name: competitor.name,
  website: competitor.website,
  industry: competitor.industry,
  platforms: competitor.platforms ?? [],
  positioning: competitor.positioning,
  strengths: competitor.strengths ?? [],
  notes: competitor.notes,
  createdAt: competitor.createdAt,
  updatedAt: competitor.updatedAt,
})

const unique = (values: string[]) => [...new Set(values.filter(Boolean))]

const getCompetitors = async (userId: string) => {
  if (!isMongoAvailable()) {
    return memoryCompetitors
      .filter((competitor) => competitor.createdBy === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map(serializeCompetitor)
  }

  const competitors = await Competitor.find({ createdBy: userId }).sort({ updatedAt: -1 }).limit(40)
  return competitors.map(serializeCompetitor)
}

const inferTopics = (competitors: Array<ReturnType<typeof serializeCompetitor>>) => {
  const industries = unique(competitors.map((competitor) => competitor.industry))
  const strengths = unique(competitors.flatMap((competitor) => competitor.strengths))
  const base = industries[0] || 'creator marketing'

  return unique([
    `${base} workflow automation`,
    `${base} content planning`,
    'AI-assisted campaign strategy',
    'short-form educational content',
    'behind-the-scenes build process',
    ...strengths.slice(0, 4).map((strength) => `${strength} playbooks`),
  ]).slice(0, 8)
}

const platformSchedules: TrendContext['postingSchedule'] = [
  { platform: 'Instagram', bestDays: 'Tuesday, Thursday, Sunday', bestTimes: '9:00 AM, 12:30 PM, 6:30 PM', recommendation: 'Use Reels early in the week and carousels on high-save days.' },
  { platform: 'LinkedIn', bestDays: 'Tuesday, Wednesday, Thursday', bestTimes: '8:30 AM, 11:00 AM, 4:00 PM', recommendation: 'Lead with insight posts and founder POV before promotional pushes.' },
  { platform: 'X (Twitter)', bestDays: 'Monday, Wednesday, Friday', bestTimes: '9:30 AM, 1:00 PM, 7:00 PM', recommendation: 'Use short threads, polls, and trend reaction posts around product moments.' },
]

export const listCompetitors = async (userId: string) => getCompetitors(userId)

export const createCompetitor = async (userId: string, input: CompetitorPayload) => {
  const payload = normalizePayload(input)

  if (!isMongoAvailable()) {
    const now = new Date()
    const competitor: StoredCompetitor = {
      id: `${memoryCompetitors.length + 1}`,
      createdBy: userId,
      ...payload,
      createdAt: now,
      updatedAt: now,
    }
    memoryCompetitors.push(competitor)
    return serializeCompetitor(competitor)
  }

  const created = await Competitor.create({ ...payload, createdBy: userId })
  return serializeCompetitor(created)
}

export const deleteCompetitor = async (userId: string, competitorId: string) => {
  if (!isMongoAvailable()) {
    const index = memoryCompetitors.findIndex((competitor) => competitor.id === competitorId && competitor.createdBy === userId)

    if (index < 0) {
      throw new AppError('Competitor not found', 404)
    }

    memoryCompetitors.splice(index, 1)
    return
  }

  const deleted = await Competitor.findOneAndDelete({ _id: competitorId, createdBy: userId })

  if (!deleted) {
    throw new AppError('Competitor not found', 404)
  }
}

export const getTrendIntelligence = async (userId: string) => {
  const competitors = await getCompetitors(userId)
  const names = competitors.map((competitor) => competitor.name)
  const topics = inferTopics(competitors)
  const hashtags = unique([
    '#ContentStrategy',
    '#CreatorEconomy',
    '#AIMarketing',
    '#SocialMediaTips',
    '#BrandGrowth',
    ...competitors.flatMap((competitor) => competitor.industry.split(/\s+/).map((word: string) => `#${word.replace(/[^a-z0-9]/gi, '')}`)),
  ]).slice(0, 10)
  const gaps = competitors.length
    ? [
        'Competitors talk about features, but few explain repeatable content systems.',
        'Most brands underuse customer proof and transformation stories.',
        'There is room for sharper comparison posts that explain why workflows are faster.',
        'Educational carousels can bridge the gap between awareness and product adoption.',
      ]
    : [
        'Add competitors to unlock sharper gap analysis.',
        'Map competitor positioning before planning comparison content.',
        'Track active platforms to identify underused channels.',
      ]
  const ideas = topics.slice(0, 6).map((topic, index) => {
    const formats = ['carousel', 'short video', 'poll', 'LinkedIn POV', 'X thread', 'promotional post']
    return `Create a ${formats[index % formats.length]} about ${topic} with a clear takeaway and soft product CTA.`
  })

  return {
    competitors,
    insights: [
      competitors.length ? `${names.slice(0, 3).join(', ')} are shaping the visible market conversation.` : 'Add 3-5 competitors to make the market map more precise.',
      'Trend-led posts should connect market pain points to a practical workflow, not just mention buzzwords.',
      'The strongest content opportunity is combining education, proof, and scheduling discipline.',
    ],
    trendingTopics: topics,
    hashtags,
    postingSchedule: platformSchedules,
    contentGaps: gaps,
    contentIdeas: ideas,
  }
}

export const getTrendContext = async (userId: string): Promise<TrendContext | null> => {
  const intelligence = await getTrendIntelligence(userId)

  if (!intelligence.competitors.length) {
    return null
  }

  return {
    competitors: intelligence.competitors.map((competitor) => competitor.name),
    trendingTopics: intelligence.trendingTopics,
    hashtags: intelligence.hashtags,
    postingSchedule: intelligence.postingSchedule,
    contentGaps: intelligence.contentGaps,
    contentIdeas: intelligence.contentIdeas,
  }
}

export const formatTrendContext = (context?: TrendContext | null) => {
  if (!context) {
    return 'No competitor intelligence is available yet.'
  }

  return [
    `Competitors: ${context.competitors.join(', ')}`,
    `Trending topics: ${context.trendingTopics.join(', ')}`,
    `Suggested hashtags: ${context.hashtags.join(' ')}`,
    `Content gaps: ${context.contentGaps.join(' | ')}`,
    `Market-inspired ideas: ${context.contentIdeas.join(' | ')}`,
  ].join('\n')
}
