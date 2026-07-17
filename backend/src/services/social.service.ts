import crypto from 'node:crypto'
import mongoose from 'mongoose'
import { memoryConnectedAccounts, memoryPosts } from '../config/db.js'
import { ConnectedAccount } from '../models/connected-account.model.js'
import { Post } from '../models/post.model.js'
import { env } from '../utils/env.js'
import { AppError } from '../utils/errors.js'
import { isZernioConfigured, publishWithZernio, startZernioConnection } from './zernio.service.js'
import type { PublishSocialPostPayload, SocialProvider, ZernioCallbackInput } from '../validators/social.validator.js'

const providerLabels: Record<SocialProvider, string> = {
  linkedin: 'LinkedIn',
  x: 'X (Twitter)',
  instagram: 'Instagram',
  facebook: 'Facebook',
}

const providerScopes: Record<SocialProvider, string[]> = {
  linkedin: ['zernio:connect', 'zernio:publish', 'linkedin:profile'],
  x: ['zernio:connect', 'zernio:publish', 'x:profile'],
  instagram: ['zernio:connect', 'zernio:publish', 'instagram:profile'],
  facebook: ['zernio:connect', 'zernio:publish', 'facebook:profile'],
}

type PublishSocialPostInput = PublishSocialPostPayload & {
  title?: string
  hashtags?: string[]
  scheduledAt?: string | Date
  timezone?: string
}

const isMongoAvailable = () => mongoose.connection.readyState === 1

const buildRedirectUri = (provider: SocialProvider) => `${env.SOCIAL_CALLBACK_BASE_URL}/api/social/zernio/${provider}/callback`

const appendStateToRedirectUri = (redirectUri: string, state: string) => {
  const url = new URL(redirectUri)
  url.searchParams.set('state', state)
  return url.toString()
}

const buildState = (provider: SocialProvider, userId: string) => {
  const payload = Buffer.from(JSON.stringify({ provider, userId, createdAt: Date.now() })).toString('base64url')
  const signature = crypto.createHmac('sha256', env.JWT_SECRET).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

const verifyState = (state: string, provider: SocialProvider) => {
  const [payload, signature] = state.split('.')

  if (!payload || !signature) {
    throw new AppError('Invalid Zernio connection state. Please restart the connection.', 400)
  }

  const expectedSignature = crypto.createHmac('sha256', env.JWT_SECRET).update(payload).digest('base64url')

  if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new AppError('Zernio connection verification failed. Please restart the connection.', 400)
  }

  let parsed: {
    provider?: SocialProvider
    userId?: string
    createdAt?: number
  }

  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      provider?: SocialProvider
      userId?: string
      createdAt?: number
    }
  } catch {
    throw new AppError('Invalid Zernio connection state. Please restart the connection.', 400)
  }

  if (parsed.provider !== provider || !parsed.userId || !parsed.createdAt) {
    throw new AppError('Zernio connection state does not match this request. Please restart the connection.', 400)
  }

  if (Date.now() - parsed.createdAt > 15 * 60 * 1000) {
    throw new AppError('Zernio connection state has expired. Please restart the connection.', 400)
  }

  return parsed.userId
}

const sanitizeAccount = (account: {
  id?: string
  _id?: unknown
  provider: SocialProvider
  accountName: string
  profileImageUrl?: string
  connectToken?: string
  status: 'connected' | 'disconnected' | 'needs_reauth'
  verifiedAt?: Date
  scopes?: string[]
  updatedAt?: Date
}) => ({
  id: account.id || String(account._id ?? ''),
  provider: account.provider,
  accountName: account.accountName,
  profileImageUrl: account.profileImageUrl,
  status: account.status === 'connected' && !account.verifiedAt ? 'needs_reauth' : account.status,
  verifiedAt: account.verifiedAt,
  scopes: account.scopes ?? [],
  updatedAt: account.updatedAt,
})

const buildPublishedPostTitle = (platform: PublishSocialPostPayload['platform']) => `${platform} publish`

const sanitizePublishedPost = (post: {
  id?: string
  _id?: unknown
  title: string
  caption: string
  platform: PublishSocialPostPayload['platform']
  media?: PublishSocialPostPayload['media']
  status: 'draft' | 'scheduled' | 'published'
  publishedAt?: Date
  externalPostId?: string
  zernioPostId?: string
  platformPostUrl?: string
  createdBy?: unknown
  createdAt?: Date
  updatedAt?: Date
}) => ({
  id: post.id || String(post._id ?? ''),
  title: post.title,
  caption: post.caption,
  platform: post.platform,
  media: post.media ?? [],
  status: post.status,
  publishedAt: post.publishedAt,
  externalPostId: post.externalPostId,
  zernioPostId: post.zernioPostId,
  platformPostUrl: post.platformPostUrl,
  createdBy: post.createdBy?.toString?.() ?? post.createdBy,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
})

const resolvePublishTiming = (scheduledAt?: string | Date, timezone?: string) => {
  if (!scheduledAt) {
    return { publishNow: true as const }
  }

  const scheduledDate = scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt)

  if (Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
    return { publishNow: true as const }
  }

  return {
    publishNow: false as const,
    scheduledFor: scheduledDate.toISOString(),
    timezone: timezone?.trim() || 'UTC',
  }
}

const logCallbackFailure = (reason: string, details: Record<string, unknown>): never => {
  console.error('[social.service] Zernio callback rejected', {
    reason,
    ...details,
  })

  throw new AppError(reason, 400)
}

export const listConnectedAccounts = async (userId: string) => {
  const existingAccounts = isMongoAvailable()
    ? await ConnectedAccount.find({ userId }).sort({ provider: 1 })
    : memoryConnectedAccounts.filter((account) => account.userId === userId)

  return (Object.keys(providerLabels) as SocialProvider[]).map((provider) => {
    const account = existingAccounts.find((entry) => entry.provider === provider)

    return {
      provider,
      label: providerLabels[provider],
      configured: isZernioConfigured(),
      integration: 'zernio',
      scopes: providerScopes[provider],
      status: account ? sanitizeAccount(account).status : 'disconnected',
      account: account ? sanitizeAccount(account) : null,
    }
  })
}

export const createZernioConnectionStart = async (userId: string, provider: SocialProvider) => {
  const state = buildState(provider, userId)
  const redirectUri = appendStateToRedirectUri(buildRedirectUri(provider), state)
  console.log('[social.service] createZernioConnectionStart', {
    userId,
    provider,
    redirectUri,
    configured: isZernioConfigured(),
  })

  if (!isZernioConfigured()) {
    return {
      provider,
      configured: false,
      authUrl: null,
      state,
      redirectUri,
      integration: 'zernio',
      message: 'Zernio is not fully configured. Add ZERNIO_API_BASE_URL, ZERNIO_API_KEY, and ZERNIO_PROFILE_ID before connecting social accounts.',
    }
  }

  const connection = await startZernioConnection({
    provider,
    userId,
    state,
    redirectUri,
  })

  console.log('[social.service] Zernio connection start response', {
    provider,
    userId,
    hasAuthUrl: Boolean(connection.authUrl),
    connectionId: connection.connectionId,
  })

  return {
    provider,
    configured: true,
    authUrl: connection.authUrl,
    connectionId: connection.connectionId,
    state,
    redirectUri,
    integration: 'zernio',
  }
}

export const completeZernioSocialConnection = async (userId: string, provider: SocialProvider, input: ZernioCallbackInput) => {
  console.log('[social.service] completeZernioSocialConnection input', {
    userId,
    provider,
    connected: input.connected,
    profileId: input.profileId,
    accountId: input.accountId,
    username: input.username,
    hasConnectToken: Boolean(input.connect_token),
  })

  if (!isZernioConfigured()) {
    logCallbackFailure('Zernio is not configured. The account was not connected.', {
      provider,
      userId,
    })
  }

  const stateUserId = input.state ? verifyState(input.state, provider) : null
  const resolvedUserId = userId || stateUserId

  console.log('[social.service] Zernio callback identity resolution', {
    provider,
    userId,
    stateUserId,
    resolvedUserId,
  })

  if (!resolvedUserId) {
    logCallbackFailure('Unable to resolve the signed-in user for Zernio callback.', {
      provider,
      userId,
      stateUserId,
      resolvedUserId,
    })
  }

  const resolvedUserIdString = resolvedUserId as string

  if (userId && stateUserId && userId !== stateUserId) {
    logCallbackFailure('Zernio callback state did not match the signed-in user.', {
      provider,
      userId,
      stateUserId,
      resolvedUserId,
    })
  }

  const hasRequiredCallbackPayload =
    Boolean(input.accountId?.trim()) &&
    Boolean(input.profileId?.trim()) &&
    Boolean(input.username?.trim()) &&
    Boolean(input.connect_token?.trim())

  const connectedValue = typeof input.connected === 'string' ? input.connected.trim().toLowerCase() : input.connected
  const isConnected =
    hasRequiredCallbackPayload ||
    connectedValue === true ||
    connectedValue === 'true' ||
    connectedValue === 'connected' ||
    connectedValue === 'linkedin' ||
    connectedValue === '1'

  console.log('[social.service] Zernio callback success evaluation', {
    provider,
    connectedValue,
    hasRequiredCallbackPayload,
    isConnected,
  })

  if (!isConnected) {
    logCallbackFailure(`${providerLabels[provider]} connection through Zernio failed. The account was not connected.`, {
      provider,
      userId,
      stateUserId,
      resolvedUserId,
      connectedValue,
      hasRequiredCallbackPayload,
      input,
    })
  }

  if (input.profileId.trim() !== env.ZERNIO_PROFILE_ID.trim()) {
    logCallbackFailure('Zernio profile verification failed. The account was not connected.', {
      provider,
      userId,
      stateUserId,
      resolvedUserId,
      inputProfileId: input.profileId,
      expectedProfileId: env.ZERNIO_PROFILE_ID,
    })
  }

  const providerAccountId = input.accountId.trim()
  const accountName = input.username.trim()
  const profileImageUrl = undefined

  const payload = {
    userId: resolvedUserIdString,
    provider,
    providerAccountId,
    accountName,
    profileImageUrl,
    connectToken: input.connect_token.trim(),
    status: 'connected' as const,
    verifiedAt: new Date(),
    scopes: providerScopes[provider],
  }

  console.log('[social.service] Zernio callback payload prepared', {
    provider,
    resolvedUserId,
    providerAccountId,
    accountName,
    profileImageUrl,
    connectTokenPresent: Boolean(payload.connectToken),
    profileId: input.profileId,
    connected: input.connected,
  })

  if (!isMongoAvailable()) {
    const existingIndex = memoryConnectedAccounts.findIndex((account) => account.userId === resolvedUserIdString && account.provider === provider)
    const entry = { id: existingIndex >= 0 ? memoryConnectedAccounts[existingIndex].id : `${memoryConnectedAccounts.length + 1}`, ...payload }

    if (existingIndex >= 0) {
      memoryConnectedAccounts[existingIndex] = entry
    } else {
      memoryConnectedAccounts.push(entry)
    }

    return sanitizeAccount(entry)
  }

  const account = await ConnectedAccount.findOneAndUpdate(
    { userId: resolvedUserIdString, provider },
    { $set: payload },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  )

  if (!account) {
    logCallbackFailure('Connected account persistence failed in MongoDB.', {
      provider,
      userId,
      stateUserId,
      resolvedUserId,
      providerAccountId,
      accountName,
    })
  }

  console.log('[social.service] Connected account saved to MongoDB', {
    userId: resolvedUserIdString,
    provider,
    accountId: account?.providerAccountId,
    accountName: account?.accountName,
    profileImageUrl: account?.profileImageUrl,
    verifiedAt: account?.verifiedAt,
  })

  return sanitizeAccount(account)
}

const platformToProvider = (platform: PublishSocialPostPayload['platform']): SocialProvider => {
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

const getConnectedAccountForProvider = async (userId: string, provider: SocialProvider) => {
  if (!isMongoAvailable()) {
    return memoryConnectedAccounts.find((account) => account.userId === userId && account.provider === provider && account.status === 'connected' && account.verifiedAt && account.providerAccountId) ?? null
  }

  return ConnectedAccount.findOne({
    userId,
    provider,
    status: 'connected',
    verifiedAt: { $exists: true },
    providerAccountId: { $exists: true, $ne: '' },
  })
}

export const ensureVerifiedPublishingAccount = async (userId: string, platform: PublishSocialPostPayload['platform']) => {
  const provider = platformToProvider(platform)
  const account = await getConnectedAccountForProvider(userId, provider)

  if (!account) {
    throw new AppError(`Connect and verify ${providerLabels[provider]} through Zernio before publishing.`, 400)
  }

  return { provider, account }
}

export const publishSocialPost = async (userId: string, input: PublishSocialPostInput) => {
  const provider = platformToProvider(input.platform)
  const { account } = await ensureVerifiedPublishingAccount(userId, input.platform)
  const mediaItems = (input.media ?? []).map((media) => ({
    url: media.url,
    type: media.type,
    title: media.name || media.url.split('/').pop() || undefined,
  }))
  const timing = resolvePublishTiming(input.scheduledAt, input.timezone)

  console.log('[social.service] publishSocialPost', {
    userId,
    provider,
    platform: input.platform,
    accountId: account.providerAccountId,
    publishNow: timing.publishNow,
    scheduledFor: 'scheduledFor' in timing ? timing.scheduledFor : undefined,
    timezone: 'timezone' in timing ? timing.timezone : undefined,
    hasMedia: Boolean(mediaItems.length),
  })

  const zernioPublishPayload = {
    content: input.caption,
    mediaItems,
    platforms: [{ platform: provider, accountId: account.providerAccountId }],
    ...(input.title?.trim() ? { title: input.title.trim() } : {}),
    hashtags: input.hashtags?.length ? input.hashtags : undefined,
    ...timing,
  }

  console.log('[social.service] Zernio publish payload', zernioPublishPayload)

  const result = await publishWithZernio({
    ...zernioPublishPayload,
  })

  console.log('[social.service] Zernio publish result', {
    userId,
    provider,
    externalPostId: result.externalPostId,
    zernioPostId: result.zernioPostId,
    status: result.status,
    platformPostUrl: result.platformPostUrl,
  })

  return {
    provider,
    platform: input.platform,
    account: sanitizeAccount(account),
    ...result,
  }
}

export const recordPublishedSocialPost = async (
  userId: string,
  input: PublishSocialPostInput,
  publish: { externalPostId: string; zernioPostId?: string; platformPostUrl?: string; status: string; url?: string },
) => {
  const now = new Date()
  const postStatus: 'scheduled' | 'published' = publish.status === 'scheduled' ? 'scheduled' : 'published'
  const publishedAt = postStatus === 'published' ? now : undefined
  const postPayload: {
    title: string
    caption: string
    platform: PublishSocialPostPayload['platform']
    provider: SocialProvider
    media: PublishSocialPostPayload['media']
    status: 'scheduled' | 'published'
    publishedAt?: Date
    externalPostId: string
    zernioPostId: string
    platformPostUrl?: string
    createdBy: string
  } = {
    title: input.title?.trim() || buildPublishedPostTitle(input.platform),
    caption: input.caption,
    platform: input.platform,
    provider: platformToProvider(input.platform),
    media: input.media ?? [],
    status: postStatus,
    publishedAt,
    externalPostId: publish.externalPostId,
    zernioPostId: publish.zernioPostId || publish.externalPostId,
    platformPostUrl: publish.platformPostUrl || publish.url,
    createdBy: userId,
  }

  if (mongoose.connection.readyState !== 1) {
    const entry = {
      id: `${memoryPosts.length + 1}`,
      createdAt: now,
      updatedAt: now,
      ...postPayload,
    }
    memoryPosts.push(entry)
    return sanitizePublishedPost(entry)
  }

  const created = await Post.create(postPayload)
  console.log('[social.service] Published post stored in MongoDB', {
    userId,
    platform: input.platform,
    externalPostId: publish.externalPostId,
    zernioPostId: publish.zernioPostId,
    status: postStatus,
    publishedAt,
    platformPostUrl: publish.platformPostUrl || publish.url,
  })
  return sanitizePublishedPost(created)
}

export const disconnectSocialAccount = async (userId: string, provider: SocialProvider) => {
  if (!isMongoAvailable()) {
    const account = memoryConnectedAccounts.find((entry) => entry.userId === userId && entry.provider === provider)

    if (!account) {
      throw new AppError('Connected account not found', 404)
    }

    account.status = 'disconnected'
    account.profileImageUrl = undefined
    account.verifiedAt = undefined
    account.connectToken = undefined
    return sanitizeAccount(account)
  }

  const account = await ConnectedAccount.findOneAndUpdate(
    { userId, provider },
    {
      $set: { status: 'disconnected' },
      $unset: { verifiedAt: '', profileImageUrl: '', connectToken: '' },
    },
    { returnDocument: 'after' },
  )

  if (!account) {
    throw new AppError('Connected account not found', 404)
  }

  return sanitizeAccount(account)
}
