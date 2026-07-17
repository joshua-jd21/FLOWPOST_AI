import mongoose, { Document, Schema } from 'mongoose'

export type PostPlatform = 'Instagram' | 'LinkedIn' | 'X (Twitter)' | 'Facebook'
export type PostProvider = 'linkedin' | 'x' | 'instagram' | 'facebook'
export type PostStatus = 'draft' | 'scheduled' | 'published'

export interface IPostMedia {
  url: string
  type?: string
  name?: string
  size?: number
}

export interface IPost extends Document {
  title: string
  caption: string
  platform: PostPlatform
  provider?: PostProvider
  media: IPostMedia[]
  scheduledAt?: Date
  status: PostStatus
  publishedAt?: Date
  externalPostId?: string
  zernioPostId?: string
  platformPostUrl?: string
  publishError?: string
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const postMediaSchema = new Schema<IPostMedia>(
  {
    url: { type: String, required: true },
    type: { type: String, trim: true },
    name: { type: String, trim: true },
    size: { type: Number },
  },
  { _id: false },
)

const postSchema = new Schema<IPost>(
  {
    title: { type: String, required: true, trim: true },
    caption: { type: String, required: true, trim: true },
    platform: { type: String, enum: ['Instagram', 'LinkedIn', 'X (Twitter)', 'Facebook'], required: true },
    provider: { type: String, enum: ['linkedin', 'x', 'instagram', 'facebook'] },
    media: { type: [postMediaSchema], default: [] },
    scheduledAt: { type: Date },
    status: { type: String, enum: ['draft', 'scheduled', 'published'], default: 'draft', required: true },
    publishedAt: { type: Date },
    externalPostId: { type: String, trim: true },
    zernioPostId: { type: String, trim: true },
    platformPostUrl: { type: String, trim: true },
    publishError: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
)

postSchema.index({ createdBy: 1, scheduledAt: 1 })
postSchema.index({ createdBy: 1, status: 1, updatedAt: -1 })

export const Post = mongoose.model<IPost>('Post', postSchema)
