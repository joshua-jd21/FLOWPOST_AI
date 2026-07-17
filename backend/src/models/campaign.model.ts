import mongoose, { Document, Schema } from 'mongoose'

export type CampaignPlatform = 'Instagram' | 'LinkedIn' | 'X (Twitter)'
export type CampaignDuration = 7 | 15 | 30
export type CampaignFormat = 'Reel' | 'Carousel' | 'Video' | 'Poll' | 'Promotional Post'
export type CampaignIdeaStatus = 'idea' | 'scheduled'

export interface ICampaignIdea {
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
  status: CampaignIdeaStatus
  createdPostId?: mongoose.Types.ObjectId
}

export interface ICampaign extends Document {
  title: string
  objective: string
  audience: string
  durationDays: CampaignDuration
  platforms: CampaignPlatform[]
  ideas: ICampaignIdea[]
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const campaignIdeaSchema = new Schema<ICampaignIdea>(
  {
    id: { type: String, required: true },
    day: { type: Number, required: true },
    date: { type: Date, required: true },
    platform: { type: String, enum: ['Instagram', 'LinkedIn', 'X (Twitter)'], required: true },
    format: { type: String, enum: ['Reel', 'Carousel', 'Video', 'Poll', 'Promotional Post'], required: true },
    title: { type: String, required: true, trim: true },
    caption: { type: String, required: true, trim: true },
    hashtags: { type: [String], default: [] },
    cta: { type: String, required: true, trim: true },
    bestTime: { type: String, required: true, trim: true },
    status: { type: String, enum: ['idea', 'scheduled'], default: 'idea', required: true },
    createdPostId: { type: Schema.Types.ObjectId, ref: 'Post' },
  },
  { _id: false },
)

const campaignSchema = new Schema<ICampaign>(
  {
    title: { type: String, required: true, trim: true },
    objective: { type: String, required: true, trim: true },
    audience: { type: String, required: true, trim: true },
    durationDays: { type: Number, enum: [7, 15, 30], required: true },
    platforms: { type: [String], enum: ['Instagram', 'LinkedIn', 'X (Twitter)'], required: true },
    ideas: { type: [campaignIdeaSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
)

campaignSchema.index({ createdBy: 1, updatedAt: -1 })

export const Campaign = mongoose.model<ICampaign>('Campaign', campaignSchema)
