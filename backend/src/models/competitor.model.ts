import mongoose, { Document, Schema } from 'mongoose'

export type CompetitorPlatform = 'Instagram' | 'LinkedIn' | 'X (Twitter)'

export interface ICompetitor extends Document {
  createdBy: mongoose.Types.ObjectId
  name: string
  website?: string
  industry: string
  platforms: CompetitorPlatform[]
  positioning: string
  strengths: string[]
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const competitorSchema = new Schema<ICompetitor>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    website: { type: String, trim: true },
    industry: { type: String, required: true, trim: true },
    platforms: { type: [String], enum: ['Instagram', 'LinkedIn', 'X (Twitter)'], default: [] },
    positioning: { type: String, required: true, trim: true },
    strengths: { type: [String], default: [] },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
)

competitorSchema.index({ createdBy: 1, updatedAt: -1 })

export const Competitor = mongoose.model<ICompetitor>('Competitor', competitorSchema)
