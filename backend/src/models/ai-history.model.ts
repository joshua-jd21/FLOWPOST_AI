import mongoose, { Document, Schema } from 'mongoose'

export interface IAIHistory extends Document {
  userId: mongoose.Types.ObjectId
  type: 'caption' | 'image' | 'post'
  input: string
  output: string
  createdAt: Date
  updatedAt: Date
}

const aiHistorySchema = new Schema<IAIHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['caption', 'image', 'post'], required: true },
    input: { type: String, required: true, trim: true },
    output: { type: String, required: true, trim: true },
  },
  { timestamps: true },
)

aiHistorySchema.index({ userId: 1, createdAt: -1 })

export const AIHistory = mongoose.model<IAIHistory>('AIHistory', aiHistorySchema)
