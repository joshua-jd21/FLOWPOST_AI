import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import { memoryAIHistory, memoryConnectedAccounts, memoryUserSettings, memoryUsers } from '../config/db.js'
import { AIHistory } from '../models/ai-history.model.js'
import { ConnectedAccount } from '../models/connected-account.model.js'
import { UserSettings } from '../models/user-settings.model.js'
import { User } from '../models/user.model.js'
import { AppError } from '../utils/errors.js'
import type { ChangePasswordPayload, SettingsPayload } from '../validators/user.validator.js'

const isMongoAvailable = () => mongoose.connection.readyState === 1

const defaultSettings = {
  theme: 'dark' as const,
  emailNotifications: true,
  weeklyDigest: true,
  productUpdates: false,
}

const serializeSettings = (settings: any) => ({
  theme: settings.theme,
  emailNotifications: settings.emailNotifications,
  weeklyDigest: settings.weeklyDigest,
  productUpdates: settings.productUpdates,
})

const serializeAccount = (account: any) => ({
  id: account.id || account._id?.toString?.() || '',
  provider: account.provider,
  accountName: account.accountName,
  profileImageUrl: account.profileImageUrl,
  status: account.status === 'connected' && !account.verifiedAt ? 'needs_reauth' : account.status,
  verifiedAt: account.verifiedAt,
  scopes: account.scopes ?? [],
  updatedAt: account.updatedAt,
})

export const getUserProfileSummary = async (userId: string) => {
  const connectedAccounts = isMongoAvailable()
    ? await ConnectedAccount.find({ userId, status: 'connected', verifiedAt: { $exists: true } }).sort({ provider: 1 })
    : memoryConnectedAccounts.filter((account) => account.userId === userId && account.status === 'connected' && account.verifiedAt)

  const totalAIGenerations = isMongoAvailable()
    ? await AIHistory.countDocuments({ userId })
    : memoryAIHistory.filter((entry) => entry.userId === userId).length

  return {
    connectedAccounts: connectedAccounts.map(serializeAccount),
    totalAIGenerations,
  }
}

export const getUserSettings = async (userId: string) => {
  if (!isMongoAvailable()) {
    const existing = memoryUserSettings.find((settings) => settings.userId === userId)
    return serializeSettings(existing ?? defaultSettings)
  }

  const settings = await UserSettings.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, ...defaultSettings } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  )

  return serializeSettings(settings)
}

export const updateUserSettings = async (userId: string, input: SettingsPayload) => {
  if (!isMongoAvailable()) {
    const now = new Date()
    const existingIndex = memoryUserSettings.findIndex((settings) => settings.userId === userId)
    const entry = {
      id: existingIndex >= 0 ? memoryUserSettings[existingIndex].id : `${memoryUserSettings.length + 1}`,
      userId,
      ...input,
      createdAt: existingIndex >= 0 ? memoryUserSettings[existingIndex].createdAt : now,
      updatedAt: now,
    }

    if (existingIndex >= 0) {
      memoryUserSettings[existingIndex] = entry
    } else {
      memoryUserSettings.push(entry)
    }

    return serializeSettings(entry)
  }

  const settings = await UserSettings.findOneAndUpdate(
    { userId },
    { $set: input },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  )

  return serializeSettings(settings)
}

export const changeUserPassword = async (userId: string, input: ChangePasswordPayload) => {
  if (!isMongoAvailable()) {
    const user = memoryUsers.find((entry) => entry.id === userId)

    if (!user) {
      throw new AppError('User not found', 404)
    }

    const matches = await bcrypt.compare(input.currentPassword, user.password)

    if (!matches) {
      throw new AppError('Current password is incorrect', 400)
    }

    if (input.newPassword !== input.confirmNewPassword) {
      throw new AppError('New passwords do not match', 400)
    }

    user.password = await bcrypt.hash(input.newPassword, 10)
    return
  }

  const user = await User.findById(userId)

  if (!user) {
    throw new AppError('User not found', 404)
  }

  const matches = await bcrypt.compare(input.currentPassword, user.password)

  if (!matches) {
    throw new AppError('Current password is incorrect', 400)
  }

  if (input.newPassword !== input.confirmNewPassword) {
    throw new AppError('New passwords do not match', 400)
  }

  user.password = await bcrypt.hash(input.newPassword, 10)
  await user.save()
}
