import mongoose from 'mongoose'
import { memoryBrandKits } from '../config/db.js'
import { BrandKit } from '../models/brand-kit.model.js'
import type { BrandKitPayload } from '../validators/brand-kit.validator.js'

export type BrandKitContext = {
  brandName: string
  description: string
  industry: string
  website?: string
  targetAudience: string
  colors: string[]
  toneOfVoice: string
  logoUrl?: string
}

const isMongoAvailable = () => mongoose.connection.readyState === 1

const normalizePayload = (input: BrandKitPayload): BrandKitContext => ({
  brandName: input.brandName,
  description: input.description,
  industry: input.industry,
  website: input.website || undefined,
  targetAudience: input.targetAudience,
  colors: input.colors,
  toneOfVoice: input.toneOfVoice,
  logoUrl: input.logoUrl || undefined,
})

const serializeBrandKit = (brandKit: any) => ({
  id: brandKit.id || brandKit._id?.toString(),
  createdBy: brandKit.createdBy?.toString?.() ?? brandKit.createdBy,
  brandName: brandKit.brandName,
  description: brandKit.description,
  industry: brandKit.industry,
  website: brandKit.website,
  targetAudience: brandKit.targetAudience,
  colors: brandKit.colors ?? [],
  toneOfVoice: brandKit.toneOfVoice,
  logoUrl: brandKit.logoUrl,
  createdAt: brandKit.createdAt,
  updatedAt: brandKit.updatedAt,
})

export const getBrandKit = async (userId: string) => {
  if (!isMongoAvailable()) {
    const brandKit = memoryBrandKits.find((entry) => entry.createdBy === userId)
    return brandKit ? serializeBrandKit(brandKit) : null
  }

  const brandKit = await BrandKit.findOne({ createdBy: userId })
  return brandKit ? serializeBrandKit(brandKit) : null
}

export const getBrandKitContext = async (userId: string): Promise<BrandKitContext | null> => {
  const brandKit = await getBrandKit(userId)

  if (!brandKit) {
    return null
  }

  return {
    brandName: brandKit.brandName,
    description: brandKit.description,
    industry: brandKit.industry,
    website: brandKit.website,
    targetAudience: brandKit.targetAudience,
    colors: brandKit.colors,
    toneOfVoice: brandKit.toneOfVoice,
    logoUrl: brandKit.logoUrl,
  }
}

export const upsertBrandKit = async (userId: string, input: BrandKitPayload) => {
  const payload = normalizePayload(input)

  if (!isMongoAvailable()) {
    const now = new Date()
    const index = memoryBrandKits.findIndex((entry) => entry.createdBy === userId)

    if (index >= 0) {
      memoryBrandKits[index] = {
        ...memoryBrandKits[index],
        ...payload,
        updatedAt: now,
      }
      return serializeBrandKit(memoryBrandKits[index])
    }

    const brandKit = {
      id: `${memoryBrandKits.length + 1}`,
      createdBy: userId,
      ...payload,
      createdAt: now,
      updatedAt: now,
    }
    memoryBrandKits.push(brandKit)
    return serializeBrandKit(brandKit)
  }

  const brandKit = await BrandKit.findOneAndUpdate(
    { createdBy: userId },
    { $set: payload },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  )

  return serializeBrandKit(brandKit)
}
