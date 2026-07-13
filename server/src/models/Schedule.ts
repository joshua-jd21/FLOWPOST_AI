import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISchedule extends Document {
  userId: Types.ObjectId;
  postId: Types.ObjectId;
  platform: string;
  scheduledAt: Date;
  status: 'pending' | 'published' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const scheduleSchema = new Schema<ISchedule>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    platform: {
      type: String,
      required: true,
      enum: ['instagram', 'linkedin', 'facebook', 'twitter'],
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'published', 'failed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

scheduleSchema.index({ scheduledAt: 1, status: 1 });
scheduleSchema.index({ postId: 1, platform: 1 }, { unique: true });

export const Schedule = mongoose.model<ISchedule>('Schedule', scheduleSchema);
