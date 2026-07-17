import mongoose, { Document, Schema } from 'mongoose'

export type CopilotMessageRole = 'user' | 'assistant'
export type CopilotActionStatus = 'completed' | 'needs_input' | 'failed'

export interface ICopilotAction {
  type: string
  label: string
  status: CopilotActionStatus
  data?: unknown
}

export interface ICopilotMessage {
  role: CopilotMessageRole
  content: string
  actions?: ICopilotAction[]
  createdAt: Date
}

export interface ICopilotChatSession extends Document {
  createdBy: mongoose.Types.ObjectId
  title: string
  messages: ICopilotMessage[]
  createdAt: Date
  updatedAt: Date
}

const copilotActionSchema = new Schema<ICopilotAction>(
  {
    type: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    status: { type: String, enum: ['completed', 'needs_input', 'failed'], required: true },
    data: { type: Schema.Types.Mixed },
  },
  { _id: false },
)

const copilotMessageSchema = new Schema<ICopilotMessage>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, trim: true },
    actions: { type: [copilotActionSchema], default: [] },
    createdAt: { type: Date, default: Date.now, required: true },
  },
  { _id: false },
)

const copilotChatSessionSchema = new Schema<ICopilotChatSession>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    messages: { type: [copilotMessageSchema], default: [] },
  },
  { timestamps: true },
)

copilotChatSessionSchema.index({ createdBy: 1, updatedAt: -1 })

export const CopilotChatSession = mongoose.model<ICopilotChatSession>('CopilotChatSession', copilotChatSessionSchema)
