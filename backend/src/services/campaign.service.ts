import mongoose from 'mongoose'
import { memoryCampaignPlans } from '../config/db.js'
import { Campaign } from '../models/campaign.model.js'
import { AppError } from '../utils/errors.js'
import { getBrandKitContext, type BrandKitContext } from './brand-kit.service.js'
import { formatTrendContext, getTrendContext, type TrendContext } from './competitor.service.js'
import { createPost } from './post.service.js'
import type { CampaignGeneratePayload } from '../validators/campaign.validator.js'

type CampaignPlatform = 'Instagram' | 'LinkedIn' | 'X (Twitter)'
type CampaignFormat = 'Reel' | 'Carousel' | 'Video' | 'Poll' | 'Promotional Post'

type CampaignIdea = {
  id: string
  day: number
  date: Date
  platform: CampaignPlatform
  format: CampaignFormat
  title: string
  caption: string
  hashtags: string[]
  cta: string
  bestTime: string
  status: 'idea' | 'scheduled'
  createdPostId?: string
}

type StoredCampaign = {
  id: string
  title: string
  objective: string
  audience: string
  durationDays: 7 | 15 | 30
  platforms: CampaignPlatform[]
  ideas: CampaignIdea[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const formats: CampaignFormat[] = ['Reel', 'Carousel', 'Video', 'Poll', 'Promotional Post']
const angles = ['pain point', 'behind-the-scenes', 'proof', 'education', 'offer', 'community', 'comparison', 'quick win']
const bestTimes: Record<CampaignPlatform, string[]> = {
  Instagram: ['9:00 AM', '12:30 PM', '6:30 PM'],
  LinkedIn: ['8:30 AM', '11:00 AM', '4:00 PM'],
  'X (Twitter)': ['9:30 AM', '1:00 PM', '7:00 PM'],
}

const isMongoAvailable = () => mongoose.connection.readyState === 1

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 28)

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const dateAtBestTime = (date: Date, bestTime: string) => {
  const match = bestTime.match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/)
  const scheduled = new Date(date)

  if (!match) {
    scheduled.setHours(9, 0, 0, 0)
    return scheduled
  }

  const hour = Number(match[1]) % 12
  const minute = Number(match[2])
  scheduled.setHours(match[3] === 'PM' ? hour + 12 : hour, minute, 0, 0)
  return scheduled
}

const platformHashtags: Record<CampaignPlatform, string[]> = {
  Instagram: ['#CreatorTools', '#SocialMediaTips', '#ContentStrategy', '#BrandGrowth'],
  LinkedIn: ['#MarketingStrategy', '#CreatorEconomy', '#BusinessGrowth', '#ContentMarketing'],
  'X (Twitter)': ['#BuildInPublic', '#SocialGrowth', '#Marketing', '#Creators'],
}

const getCampaignAudience = (input: CampaignGeneratePayload, brandKit?: BrandKitContext | null) => brandKit?.targetAudience || input.audience
const getCampaignVoice = (input: CampaignGeneratePayload, brandKit?: BrandKitContext | null) => brandKit?.toneOfVoice || input.brandVoice || 'premium, helpful'
const getBrandPrefix = (brandKit?: BrandKitContext | null) => brandKit?.brandName ? `${brandKit.brandName}: ` : ''

const formatCaption = (input: CampaignGeneratePayload, platform: CampaignPlatform, format: CampaignFormat, angle: string, brandKit?: BrandKitContext | null, trendContext?: TrendContext | null) => {
  const brandContext = brandKit ? ` Position it for the ${brandKit.industry} industry and keep the visual/persona style aligned with ${brandKit.colors.join(', ')}.` : ''
  const trendLine = trendContext ? ` Use this market intelligence: ${formatTrendContext(trendContext)}` : ''
  const base = `${getBrandPrefix(brandKit)}${input.objective} For ${getCampaignAudience(input, brandKit)}, frame this as a ${angle} story with a ${getCampaignVoice(input, brandKit)} voice.${brandContext}${trendLine}`

  if (platform === 'LinkedIn') {
    return `${base} Turn it into a thoughtful ${format.toLowerCase()} that starts with a strong insight, adds one practical takeaway, and invites a professional conversation.`
  }

  if (platform === 'X (Twitter)') {
    return `${base} Keep the ${format.toLowerCase()} sharp, direct, and easy to reply to with one memorable idea.`
  }

  return `${base} Make the ${format.toLowerCase()} visually engaging, save-worthy, and focused on a clear creator benefit.`
}

const generateIdeas = (input: CampaignGeneratePayload, brandKit?: BrandKitContext | null, trendContext?: TrendContext | null): CampaignIdea[] => {
  const startDate = input.startDate ? new Date(input.startDate) : new Date()
  const platforms = input.platforms as CampaignPlatform[]

  return Array.from({ length: input.durationDays }, (_, index) => {
    const day = index + 1
    const platform = platforms[index % platforms.length]
    const format = formats[index % formats.length]
    const angle = angles[index % angles.length]
    const date = addDays(startDate, index)
    const bestTime = bestTimes[platform][index % bestTimes[platform].length]
    const platformTag = platform === 'X (Twitter)' ? 'X' : platform

    return {
      id: `idea-${day}-${slug(platform)}-${slug(format)}`,
      day,
      date,
      platform,
      format,
      title: `${platformTag} ${format}: ${trendContext?.trendingTopics[index % trendContext.trendingTopics.length] || angle.replace(/^\w/, (letter) => letter.toUpperCase())}`,
      caption: formatCaption(input, platform, format, angle, brandKit, trendContext),
      hashtags: trendContext?.hashtags.length ? trendContext.hashtags.slice(0, 4) : platformHashtags[platform],
      cta: format === 'Poll' ? 'Vote and share your take.' : format === 'Promotional Post' ? 'Start planning your next campaign today.' : 'Save this idea for your next content sprint.',
      bestTime,
      status: 'idea',
    }
  })
}

const serializeCampaign = (campaign: any) => ({
  id: campaign.id || campaign._id?.toString(),
  title: campaign.title,
  objective: campaign.objective,
  audience: campaign.audience,
  durationDays: campaign.durationDays,
  platforms: campaign.platforms,
  ideas: (campaign.ideas ?? []).map((idea: any) => ({
    id: idea.id,
    day: idea.day,
    date: idea.date,
    platform: idea.platform,
    format: idea.format,
    title: idea.title,
    caption: idea.caption,
    hashtags: idea.hashtags ?? [],
    cta: idea.cta,
    bestTime: idea.bestTime,
    status: idea.status,
    createdPostId: idea.createdPostId?.toString?.() ?? idea.createdPostId,
  })),
  createdBy: campaign.createdBy?.toString?.() ?? campaign.createdBy,
  createdAt: campaign.createdAt,
  updatedAt: campaign.updatedAt,
})

export const listCampaigns = async (userId: string) => {
  if (!isMongoAvailable()) {
    return memoryCampaignPlans
      .filter((campaign) => campaign.createdBy === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map(serializeCampaign)
  }

  const campaigns = await Campaign.find({ createdBy: userId }).sort({ updatedAt: -1 }).limit(20)
  return campaigns.map(serializeCampaign)
}

export const generateCampaign = async (userId: string, input: CampaignGeneratePayload) => {
  const now = new Date()
  const brandKit = await getBrandKitContext(userId)
  const trendContext = await getTrendContext(userId)
  const payload = {
    title: input.title,
    objective: input.objective,
    audience: getCampaignAudience(input, brandKit),
    durationDays: input.durationDays,
    platforms: input.platforms as CampaignPlatform[],
    ideas: generateIdeas(input, brandKit, trendContext),
    createdBy: userId,
  }

  if (!isMongoAvailable()) {
    const campaign: StoredCampaign = {
      id: `${memoryCampaignPlans.length + 1}`,
      ...payload,
      createdAt: now,
      updatedAt: now,
    }
    memoryCampaignPlans.push(campaign)
    return serializeCampaign(campaign)
  }

  const created = await Campaign.create(payload)
  return serializeCampaign(created)
}

export const convertIdeaToPost = async (userId: string, campaignId: string, ideaId: string) => {
  if (!isMongoAvailable()) {
    const campaign = memoryCampaignPlans.find((entry) => entry.id === campaignId && entry.createdBy === userId)

    if (!campaign) {
      throw new AppError('Campaign not found', 404)
    }

    const idea = campaign.ideas.find((entry) => entry.id === ideaId)

    if (!idea) {
      throw new AppError('Campaign idea not found', 404)
    }

    const post = await createPost(userId, {
      title: idea.title,
      caption: `${idea.caption}\n\n${idea.hashtags.join(' ')}\n\n${idea.cta}`,
      platform: idea.platform,
      media: [],
      scheduledAt: dateAtBestTime(idea.date, idea.bestTime).toISOString(),
      status: 'scheduled',
    })
    idea.status = 'scheduled'
    idea.createdPostId = post.id
    campaign.updatedAt = new Date()
    return { campaign: serializeCampaign(campaign), post }
  }

  const campaign = await Campaign.findOne({ _id: campaignId, createdBy: userId })

  if (!campaign) {
    throw new AppError('Campaign not found', 404)
  }

  const idea = campaign.ideas.find((entry) => entry.id === ideaId)

  if (!idea) {
    throw new AppError('Campaign idea not found', 404)
  }

  const post = await createPost(userId, {
    title: idea.title,
    caption: `${idea.caption}\n\n${idea.hashtags.join(' ')}\n\n${idea.cta}`,
    platform: idea.platform,
    media: [],
    scheduledAt: dateAtBestTime(idea.date, idea.bestTime).toISOString(),
    status: 'scheduled',
  })
  idea.status = 'scheduled'
  idea.createdPostId = new mongoose.Types.ObjectId(post.id)
  await campaign.save()

  return { campaign: serializeCampaign(campaign), post }
}
