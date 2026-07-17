import mongoose, { Document, Schema } from 'mongoose'

export interface IConnectedAccount extends Document {
  userId: mongoose.Types.ObjectId
  provider: 'linkedin' | 'x' | 'instagram' | 'facebook'
  providerAccountId: string
  accountName: string
  profileImageUrl?: string
  connectToken?: string
  status: 'connected' | 'disconnected' | 'needs_reauth'
  verifiedAt?: Date
  scopes: string[]
  createdAt: Date
  updatedAt: Date
}

const connectedAccountSchema = new Schema<IConnectedAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, enum: ['linkedin', 'x', 'instagram', 'facebook'], required: true, trim: true },
    providerAccountId: { type: String, required: true, trim: true },
    accountName: { type: String, required: true, trim: true },
    profileImageUrl: { type: String, trim: true },
    connectToken: { type: String, trim: true },
    status: { type: String, enum: ['connected', 'disconnected', 'needs_reauth'], default: 'connected', required: true },
    verifiedAt: { type: Date },
    scopes: { type: [String], default: [] },
  },
  { timestamps: true },
)

connectedAccountSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true })
connectedAccountSchema.index({ userId: 1, provider: 1 }, { unique: true })

export const ConnectedAccount = mongoose.model<IConnectedAccount>('ConnectedAccount', connectedAccountSchema)
