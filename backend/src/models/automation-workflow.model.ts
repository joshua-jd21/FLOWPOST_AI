import mongoose, { Document, Schema } from 'mongoose'

export type AutomationWorkflowStatus = 'active' | 'paused'
export type AutomationActionType = 'generate' | 'schedule' | 'publish' | 'notify'
export type AutomationRunStatus = 'success' | 'failed'

export interface IAutomationAction {
  type: AutomationActionType
  config: Record<string, unknown>
}

export interface IAutomationWorkflow extends Document {
  createdBy: mongoose.Types.ObjectId
  name: string
  description?: string
  status: AutomationWorkflowStatus
  trigger: {
    type: 'scheduled'
    runAt: Date
    timezone?: string
  }
  actions: IAutomationAction[]
  lastRunAt?: Date
  nextRunAt?: Date
  runCount: number
  lastRunStatus?: AutomationRunStatus
  lastRunMessage?: string
  createdAt: Date
  updatedAt: Date
}

const automationActionSchema = new Schema<IAutomationAction>(
  {
    type: { type: String, enum: ['generate', 'schedule', 'publish', 'notify'], required: true },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false },
)

const automationWorkflowSchema = new Schema<IAutomationWorkflow>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ['active', 'paused'], default: 'active', required: true },
    trigger: {
      type: {
        type: String,
        enum: ['scheduled'],
        default: 'scheduled',
        required: true,
      },
      runAt: { type: Date, required: true },
      timezone: { type: String, trim: true },
    },
    actions: { type: [automationActionSchema], default: [] },
    lastRunAt: { type: Date },
    nextRunAt: { type: Date },
    runCount: { type: Number, default: 0 },
    lastRunStatus: { type: String, enum: ['success', 'failed'] },
    lastRunMessage: { type: String, trim: true },
  },
  { timestamps: true },
)

automationWorkflowSchema.index({ createdBy: 1, updatedAt: -1 })
automationWorkflowSchema.index({ status: 1, nextRunAt: 1 })

export const AutomationWorkflow = mongoose.model<IAutomationWorkflow>('AutomationWorkflow', automationWorkflowSchema)
