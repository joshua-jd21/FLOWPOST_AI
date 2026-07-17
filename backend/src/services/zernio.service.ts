import { env } from '../utils/env.js'
import { AppError } from '../utils/errors.js'
import type { SocialProvider } from '../validators/social.validator.js'

type ZernioConnectionStart = {
  provider: SocialProvider
  userId: string
  state: string
  redirectUri: string
}

type ZernioConnectionCallback = {
  provider: SocialProvider
  userId: string
  connected: boolean | string
  profileId: string
  accountId: string
  username: string
  connect_token: string
}

type ZernioMediaItem = {
  url: string
  type?: string
  title?: string
}

type ZernioPlatformTarget = {
  platform: SocialProvider
  accountId: string
}

type ZernioPublishPayload = {
  content: string
  mediaItems: ZernioMediaItem[]
  platforms: ZernioPlatformTarget[]
  publishNow: boolean
  scheduledFor?: string
  timezone?: string
  title?: string
  hashtags?: string[]
}

type ZernioErrorResponse = {
  message?: string
  error?: string
  errors?: Array<
    | string
    | {
        field?: string
        path?: string
        message?: string
      }
  >
}

type ZernioConnectResponse = ZernioErrorResponse & {
  authUrl?: string
  connectUrl?: string
  connectionId?: string
}

type ZernioRequestOptions = {
  method?: 'GET' | 'POST'
  query?: Record<string, string | number | boolean | undefined>
  body?: Record<string, unknown>
}

export type ZernioConnectionResult = {
  authUrl: string | null
  connectionId?: string
}

export type ZernioCallbackResponse = ZernioErrorResponse & {
  connected: boolean
  profileId: string
  accountId: string
  username: string
  connect_token: string
}

type ZernioPublishResponse = ZernioErrorResponse & {
  post?: {
    _id?: string
    id?: string
    status?: string
    platformPostUrl?: string
    scheduledFor?: string
    timezone?: string
    platforms?: Array<{
      platform?: string
      accountId?: string
      platformPostUrl?: string
    }>
  }
  id?: string
  postId?: string
  externalPostId?: string
  status?: string
  url?: string
  platformPostUrl?: string
}

export type ZernioPublishResult = {
  externalPostId: string
  zernioPostId: string
  status: string
  platformPostUrl?: string
  url?: string
}

const requiredZernioConfig = [
  'ZERNIO_API_BASE_URL',
  'ZERNIO_API_KEY',
  'ZERNIO_PROFILE_ID',
] as const

const missingZernioConfig = () => requiredZernioConfig.filter((key) => !env[key])

const ensureConfigured = () => {
  const missing = missingZernioConfig()

  if (missing.length) {
    throw new AppError(`Zernio is not fully configured. Missing: ${missing.join(', ')}.`, 503)
  }

  try {
    new URL(env.ZERNIO_API_BASE_URL)
  } catch {
    throw new AppError('ZERNIO_API_BASE_URL must be a valid URL.', 503)
  }
}

const zernioUrl = (path: string) => `${env.ZERNIO_API_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`

const buildQueryString = (query?: Record<string, string | number | boolean | undefined>) => {
  if (!query) {
    return ''
  }

  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue
    }

    params.set(key, String(value))
  }

  const serialized = params.toString()

  return serialized ? `?${serialized}` : ''
}

const zernioErrorMessage = (data: ZernioErrorResponse, status: number) =>
  data.message ||
  data.error ||
  (Array.isArray(data.errors) && data.errors.length
    ? (() => {
        const firstError = data.errors[0]

        if (typeof firstError === 'string') {
          return firstError
        }

        const field = firstError.path || firstError.field || 'request'
        return `${field}: ${firstError.message || 'Invalid value'}`
      })()
    : `Zernio request failed with status ${status}`)

const requireZernioPath = (path: string, label: string) => {
  if (!path.trim()) {
    throw new AppError(`${label} is not configured.`, 503)
  }

  return path
}

const requestZernio = async <TResponse extends ZernioErrorResponse>(path: string, options: ZernioRequestOptions = {}): Promise<TResponse> => {
  ensureConfigured()

  const method = options.method ?? (options.body ? 'POST' : 'GET')
  const requestUrl = `${zernioUrl(path)}${buildQueryString(options.query)}`

  console.log('[zernio.service] request', {
    requestUrl,
    method,
    query: options.query,
    body: options.body ?? null,
  })

  const response = await fetch(requestUrl, {
    method,
    headers: {
      Authorization: `Bearer ${env.ZERNIO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: method === 'GET' ? undefined : JSON.stringify(options.body ?? {}),
    signal: AbortSignal.timeout(env.ZERNIO_REQUEST_TIMEOUT_MS),
  })
  const rawBody = await response.text().catch(() => '')
  let data: TResponse

  try {
    data = rawBody ? (JSON.parse(rawBody) as TResponse) : ({} as TResponse)
  } catch {
    data = ({ message: rawBody } as TResponse)
  }

  console.log('[zernio.service] response', {
    requestUrl,
    method,
    status: response.status,
    ok: response.ok,
    body: data,
  })

  if (!response.ok) {
    throw new AppError(zernioErrorMessage(data, response.status), response.status >= 500 ? 502 : response.status)
  }

  return data
}

export const isZernioConfigured = () => missingZernioConfig().length === 0

export const startZernioConnection = async (input: ZernioConnectionStart): Promise<ZernioConnectionResult> => {
  const data = await requestZernio<ZernioConnectResponse>(`/connect/${input.provider}`, {
    method: 'GET',
    query: {
      profileId: env.ZERNIO_PROFILE_ID,
      redirect_url: input.redirectUri,
    },
  })

  return {
    authUrl: data.authUrl || data.connectUrl || null,
    connectionId: data.connectionId,
  }
}

export const completeZernioConnection = async (input: ZernioConnectionCallback): Promise<ZernioCallbackResponse> => {
  ensureConfigured()

  return {
    connected: input.connected === true || input.connected === 'connected' || input.connected === 'true' || input.connected === '1',
    profileId: input.profileId.trim(),
    accountId: input.accountId.trim(),
    username: input.username.trim(),
    connect_token: input.connect_token.trim(),
  }
}

export const publishWithZernio = async (input: ZernioPublishPayload): Promise<ZernioPublishResult> => {
  const publishPath = requireZernioPath(env.ZERNIO_PUBLISH_PATH, 'ZERNIO_PUBLISH_PATH')
  console.log('[zernio.service] publishWithZernio request payload', {
    ...input,
    platforms: input.platforms.map((platform) => ({
      ...platform,
      platform: platform.platform,
    })),
  })
  const data = await requestZernio<ZernioPublishResponse>(publishPath, {
    method: 'POST',
    body: {
      content: input.content,
      mediaItems: input.mediaItems,
      platforms: input.platforms,
      publishNow: input.publishNow,
      ...(input.scheduledFor ? { scheduledFor: input.scheduledFor } : {}),
      ...(input.timezone ? { timezone: input.timezone } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(input.hashtags?.length ? { hashtags: input.hashtags } : {}),
    },
  })

  const post = data.post ?? {}
  const zernioPostId = post._id || post.id || data.externalPostId || data.postId || data.id || ''
  const status = post.status || data.status || 'published'
  const platformPostUrl = post.platformPostUrl || post.platforms?.[0]?.platformPostUrl || data.platformPostUrl || data.url
  const url = platformPostUrl || data.url

  return {
    externalPostId: zernioPostId,
    zernioPostId,
    status,
    platformPostUrl,
    url,
  }
}
