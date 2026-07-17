import mongoose, { Document, Schema } from 'mongoose'

export interface IUser extends Document {
  name: string
  email: string
  password: string
  avatar?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, minlength: 6 },
    avatar: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export const User = mongoose.model<IUser>('User', userSchema)
