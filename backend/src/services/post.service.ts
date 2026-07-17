import mongoose from 'mongoose'
import { memoryPosts } from '../config/db.js'
import { Post } from '../models/post.model.js'
import { AppError } from '../utils/errors.js'
import { ensureVerifiedPublishingAccount, publishSocialPost } from './social.service.js'
import type { PostPayload, PostQuery } from '../validators/post.validator.js'

type StoredPost = {
  id: string
  title: string
  caption: string
  platform: 'Instagram' | 'LinkedIn' | 'X (Twitter)' | 'Facebook'
  provider?: 'linkedin' | 'x' | 'instagram' | 'facebook'
  media: Array<{ url: string; type?: string; name?: string; size?: number }>
  scheduledAt?: Date
  status: 'draft' | 'scheduled' | 'published'
  publishedAt?: Date
  externalPostId?: string
  zernioPostId?: string
  platformPostUrl?: string
  publishError?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

type SerializedPostSource = {
  _id?: mongoose.Types.ObjectId | string
  id?: string
  title: string
  caption: string
  platform: 'Instagram' | 'LinkedIn' | 'X (Twitter)' | 'Facebook'
  provider?: 'linkedin' | 'x' | 'instagram' | 'facebook'
  media?: Array<{ url: string; type?: string; name?: string; size?: number }>
  scheduledAt?: Date
  status: 'draft' | 'scheduled' | 'published'
  publishedAt?: Date
  externalPostId?: string
  zernioPostId?: string
  platformPostUrl?: string
  publishError?: string
  createdBy?: mongoose.Types.ObjectId | string
  createdAt: Date
  updatedAt: Date
}

type PersistedPostDocument = SerializedPostSource & {
  save: () => Promise<unknown>
}

type PostProvider = 'linkedin' | 'x' | 'instagram' | 'facebook'

const isMongoAvailable = () => mongoose.connection.readyState === 1

const platformToProvider = (platform: PostPayload['platform']): PostProvider => {
  if (platform === 'LinkedIn') {
    return 'linkedin'
  }

  if (platform === 'X (Twitter)') {
    return 'x'
  }

  if (platform === 'Facebook') {
    return 'facebook'
  }

  return 'instagram'
}

const normalizePostPayload = (input: PostPayload): Pick<StoredPost, 'title' | 'caption' | 'platform' | 'provider' | 'media' | 'scheduledAt' | 'status'> => {
  const hasSchedule = Boolean(input.scheduledAt)
  const status = hasSchedule
    ? input.status === 'published' ? 'published' as const : 'scheduled' as const
    : input.status === 'scheduled' ? 'draft' as const : input.status

  return {
    title: input.title,
    caption: input.caption,
    platform: input.platform,
    provider: platformToProvider(input.platform),
    media: input.media ?? [],
    scheduledAt: hasSchedule ? new Date(input.scheduledAt as string) : undefined,
    status,
  }
}

const serializePost = (post: SerializedPostSource) => ({
  id: post.id || post._id?.toString() || '',
  title: post.title,
  caption: post.caption,
  platform: post.platform,
  provider: post.provider,
  media: post.media ?? [],
  scheduledAt: post.scheduledAt,
  status: post.status,
  publishedAt: post.publishedAt,
  externalPostId: post.externalPostId,
  zernioPostId: post.zernioPostId,
  platformPostUrl: post.platformPostUrl,
  publishError: post.publishError,
  createdBy: post.createdBy?.toString?.() ?? post.createdBy,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
})

export const listPosts = async (userId: string, query: PostQuery) => {
  const limit = query.limit ?? 50

  if (!isMongoAvailable()) {
    let posts = memoryPosts.filter((post) => post.createdBy === userId)

    if (query.status) {
      posts = posts.filter((post) => post.status === query.status)
    }

    if (query.upcoming) {
      posts = posts.filter((post) => post.status === 'scheduled' && post.scheduledAt && post.scheduledAt >= new Date())
    }

    return posts
      .sort((a, b) => {
        const left = a.scheduledAt?.getTime() ?? a.updatedAt.getTime()
        const right = b.scheduledAt?.getTime() ?? b.updatedAt.getTime()
        return query.upcoming ? left - right : right - left
      })
      .slice(0, limit)
      .map(serializePost)
  }

  const filter: Record<string, unknown> = { createdBy: userId }

  if (query.status) {
    filter.status = query.status
  }

  if (query.upcoming) {
    filter.status = 'scheduled'
    filter.scheduledAt = { $gte: new Date() }
  }

  const posts = await Post.find(filter)
    .sort(query.upcoming ? { scheduledAt: 1 } : { updatedAt: -1 })
    .limit(limit)

  return posts.map(serializePost)
}

export const createPost = async (userId: string, input: PostPayload) => {
  const payload = normalizePostPayload(input)

  if (payload.status === 'scheduled') {
    await ensureVerifiedPublishingAccount(userId, payload.platform)
  }

  if (!isMongoAvailable()) {
    const now = new Date()
    const post: StoredPost = {
      id: `${memoryPosts.length + 1}`,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      ...payload,
    }
    memoryPosts.push(post)
    return serializePost(post)
  }

  const created = await Post.create({ ...payload, createdBy: userId })
  return serializePost(created)
}

export const updatePost = async (userId: string, postId: string, input: PostPayload) => {
  const payload = normalizePostPayload(input)

  if (payload.status === 'scheduled') {
    await ensureVerifiedPublishingAccount(userId, payload.platform)
  }

  if (!isMongoAvailable()) {
    const index = memoryPosts.findIndex((post) => post.id === postId && post.createdBy === userId)

    if (index < 0) {
      throw new AppError('Post not found', 404)
    }

    memoryPosts[index] = {
      ...memoryPosts[index],
      ...payload,
      updatedAt: new Date(),
    }

    return serializePost(memoryPosts[index])
  }

  const { scheduledAt, ...setPayload } = payload
  const update = scheduledAt
    ? { $set: { ...setPayload, scheduledAt } }
    : { $set: setPayload, $unset: { scheduledAt: '' } }
  const updated = await Post.findOneAndUpdate(
    { _id: postId, createdBy: userId },
    update,
    { returnDocument: 'after' },
  )

  if (!updated) {
    throw new AppError('Post not found', 404)
  }

  return serializePost(updated)
}

export const deletePost = async (userId: string, postId: string) => {
  if (!isMongoAvailable()) {
    const index = memoryPosts.findIndex((post) => post.id === postId && post.createdBy === userId)

    if (index < 0) {
      throw new AppError('Post not found', 404)
    }

    memoryPosts.splice(index, 1)
    return
  }

  const deleted = await Post.findOneAndDelete({ _id: postId, createdBy: userId })

  if (!deleted) {
    throw new AppError('Post not found', 404)
  }
}

export const publishPost = async (userId: string, postId: string) => {
  const mongoAvailable = isMongoAvailable()
  const post = mongoAvailable
    ? await Post.findOne({ _id: postId, createdBy: userId })
    : memoryPosts.find((entry) => entry.id === postId && entry.createdBy === userId)

  if (!post) {
    throw new AppError('Post not found', 404)
  }

  try {
    const publish = await publishSocialPost(userId, {
      platform: post.platform,
      caption: post.caption,
      media: post.media ?? [],
      title: post.title,
    })
    const now = new Date()
    const postStatus = publish.status === 'scheduled' ? 'scheduled' : 'published'
    const publishedAt = postStatus === 'published' ? now : undefined

    if (!mongoAvailable) {
      const memoryPost = post as StoredPost
      memoryPost.status = postStatus
      memoryPost.publishedAt = publishedAt
      memoryPost.externalPostId = publish.externalPostId
      memoryPost.zernioPostId = publish.zernioPostId || publish.externalPostId
      memoryPost.platformPostUrl = publish.platformPostUrl || publish.url
      memoryPost.provider = platformToProvider(post.platform)
      memoryPost.publishError = undefined
      memoryPost.updatedAt = now
      return { post: serializePost(memoryPost), publish }
    }

    const mongoPost = post as PersistedPostDocument
    mongoPost.status = postStatus
    mongoPost.publishedAt = publishedAt
    mongoPost.externalPostId = publish.externalPostId
    mongoPost.zernioPostId = publish.zernioPostId || publish.externalPostId
    mongoPost.platformPostUrl = publish.platformPostUrl || publish.url
    mongoPost.provider = platformToProvider(post.platform)
    mongoPost.publishError = undefined
    await mongoPost.save()
    return { post: serializePost(mongoPost), publish }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Publishing failed'

    if (!mongoAvailable) {
      const memoryPost = post as StoredPost
      memoryPost.publishError = message
      memoryPost.updatedAt = new Date()
    } else {
      const mongoPost = post as PersistedPostDocument
      mongoPost.publishError = message
      await mongoPost.save()
    }

    throw error
  }
}

export const publishDueScheduledPosts = async () => {
  const now = new Date()
  const mongoAvailable = isMongoAvailable()
  const duePosts = mongoAvailable
    ? await Post.find({ status: 'scheduled', scheduledAt: { $lte: now } }).limit(25)
    : memoryPosts.filter((post) => post.status === 'scheduled' && post.scheduledAt && post.scheduledAt <= now).slice(0, 25)
  const results: Array<{ id: string; status: 'published' | 'failed'; message?: string }> = []

  for (const post of duePosts) {
    const postId = mongoAvailable ? String((post as SerializedPostSource)._id) : (post as StoredPost).id
    const userId = post.createdBy?.toString?.() ?? post.createdBy

    try {
      await publishPost(userId, postId)
      results.push({ id: postId, status: 'published' })
    } catch (error) {
      results.push({ id: postId, status: 'failed', message: error instanceof Error ? error.message : 'Publishing failed' })
    }
  }

  return results
}
