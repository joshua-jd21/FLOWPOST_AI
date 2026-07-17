import mongoose, { Document, Schema } from 'mongoose'

export interface IBrandKit extends Document {
  createdBy: mongoose.Types.ObjectId
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
}

const brandKitSchema = new Schema<IBrandKit>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    brandName: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    industry: { type: String, required: true, trim: true },
    website: { type: String, trim: true },
    targetAudience: { type: String, required: true, trim: true },
    colors: { type: [String], default: [] },
    toneOfVoice: { type: String, required: true, trim: true },
    logoUrl: { type: String },
  },
  { timestamps: true },
)

export const BrandKit = mongoose.model<IBrandKit>('BrandKit', brandKitSchema)
