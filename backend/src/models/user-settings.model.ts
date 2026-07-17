import mongoose, { Document, Schema } from 'mongoose'

export interface IUserSettings extends Document {
  userId: mongoose.Types.ObjectId
  theme: 'system' | 'dark' | 'dim'
  emailNotifications: boolean
  weeklyDigest: boolean
  productUpdates: boolean
  createdAt: Date
  updatedAt: Date
}

const userSettingsSchema = new Schema<IUserSettings>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    theme: { type: String, enum: ['system', 'dark', 'dim'], default: 'dark', required: true },
    emailNotifications: { type: Boolean, default: true },
    weeklyDigest: { type: Boolean, default: true },
    productUpdates: { type: Boolean, default: false },
  },
  { timestamps: true },
)

export const UserSettings = mongoose.model<IUserSettings>('UserSettings', userSettingsSchema)
