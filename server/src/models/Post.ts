import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPost extends Document {
  userId: Types.ObjectId;
  caption: string;
  imageUrl?: string;
  platforms: string[];
  scheduledAt?: Date;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  publishedAt?: Date;
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    caption: {
      type: String,
      required: [true, 'Caption is required'],
      maxlength: [2200, 'Caption cannot exceed 2200 characters'],
    },
    imageUrl: {
      type: String,
      default: undefined,
    },
    platforms: {
      type: [String],
      required: [true, 'At least one platform is required'],
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: 'At least one platform must be selected',
      },
    },
    scheduledAt: {
      type: Date,
      default: undefined,
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published', 'failed'],
      default: 'draft',
    },
    publishedAt: {
      type: Date,
      default: undefined,
    },
    aiGenerated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

postSchema.index({ userId: 1, status: 1 });
postSchema.index({ scheduledAt: 1 }, { sparse: true });

export const Post = mongoose.model<IPost>('Post', postSchema);
