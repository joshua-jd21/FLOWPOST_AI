import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IConnectedAccount extends Document {
  userId: Types.ObjectId;
  platform: 'instagram' | 'linkedin' | 'facebook' | 'twitter';
  accessToken: string;
  refreshToken?: string;
  accountName: string;
  accountId?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const connectedAccountSchema = new Schema<IConnectedAccount>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    platform: {
      type: String,
      required: true,
      enum: ['instagram', 'linkedin', 'facebook', 'twitter'],
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      default: undefined,
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
    },
    accountId: {
      type: String,
      default: undefined,
    },
    expiresAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

connectedAccountSchema.index({ userId: 1, platform: 1 }, { unique: true });

export const ConnectedAccount = mongoose.model<IConnectedAccount>(
  'ConnectedAccount',
  connectedAccountSchema
);
