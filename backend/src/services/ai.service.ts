import crypto from 'node:crypto'
import mongoose from 'mongoose'
import { memoryAIHistory } from '../config/db.js'
import { AIHistory } from '../models/ai-history.model.js'
import { AppError } from '../utils/errors.js'
import { env } from '../utils/env.js'
import { getBrandKitContext, type BrandKitContext } from './brand-kit.service.js'
import { formatTrendContext, getTrendContext, type TrendContext } from './competitor.service.js'

type GenerateCaptionInput = {
  platform: string
  contentType: string
  tone: string
  audience: string
  prompt: string
  generateImage?: boolean
}

type GeneratedContent = {
  caption: string
  hashtags: string[]
  ctaSuggestions: string[]
}

type GeneratedContentResult = GeneratedContent & {
  usedFallback: boolean
  fallbackReason?: string
  imageUrl?: string
  imagePrompt?: string
  imageProvider?: 'gemini' | 'pollinations'
  imageFallbackReason?: string
  imageError?: string
}

type GeneratedImageResult = {
  imageUrl: string
  imagePrompt: string
  imageProvider: 'gemini' | 'pollinations'
  imageFallbackReason?: string
}

type SerializedHistoryEntry = {
  id: string
  type: 'caption' | 'image' | 'post'
  input: GenerateCaptionInput | Record<string, unknown>
  output: GeneratedContentResult | Record<string, unknown>
  createdAt?: Date
  updatedAt?: Date
}

type GeminiInteractionResponse = {
  output_text?: string
  output_image?: {
    mime_type?: string
    data?: string
  }
  steps?: Array<{
    output?: Array<{
      type?: string
      text?: string
      image?: {
        mime_type?: string
        data?: string
      }
    }>
  }>
  error?: {
    message?: string
  }
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
        inlineData?: {
          mimeType?: string
          data?: string
        }
        inline_data?: {
          mime_type?: string
          data?: string
        }
      }>
    }
  }>
}

type ImageBytes = {
  buffer: Buffer
  contentType: string
  provider: 'gemini' | 'pollinations'
  fallbackReason?: string
}

const isMongoAvailable = () => mongoose.connection.readyState === 1

const getAudience = (input: GenerateCaptionInput, brandKit?: BrandKitContext | null) => brandKit?.targetAudience || input.audience
const getTone = (input: GenerateCaptionInput, brandKit?: BrandKitContext | null) => brandKit?.toneOfVoice || input.tone

const buildBrandContext = (brandKit?: BrandKitContext | null) => {
  if (!brandKit) {
    return 'No saved brand kit is available. Use the requested tone and audience.'
  }

  return [
    `Brand name: ${brandKit.brandName}`,
    `Brand description: ${brandKit.description}`,
    `Industry: ${brandKit.industry}`,
    `Website: ${brandKit.website || 'Not provided'}`,
    `Target audience: ${brandKit.targetAudience}`,
    `Brand colors: ${brandKit.colors.join(', ') || 'Not provided'}`,
    `Tone of voice: ${brandKit.toneOfVoice}`,
  ].join('\n')
}

const buildFallbackContent = (input: GenerateCaptionInput, brandKit?: BrandKitContext | null): GeneratedContent => {
  const brandLead = brandKit?.brandName ? `${brandKit.brandName}: ` : ''
  const caption = `${brandLead}Elevate your ${input.platform} presence with a ${getTone(input, brandKit).toLowerCase()} ${input.contentType.toLowerCase()} message tailored for ${getAudience(input, brandKit)}. ${input.prompt}`.slice(0, 240)

  return {
    caption,
    hashtags: [`#${input.platform.toLowerCase().replace(/\s+/g, '')}`, '#contentstrategy', '#brandgrowth', '#socialmedia'],
    ctaSuggestions: ['Save this draft', 'Schedule it for launch', 'Share it with your team'],
  }
}

const withFallbackMetadata = (input: GenerateCaptionInput, fallbackReason: string, brandKit?: BrandKitContext | null): GeneratedContentResult => ({
  ...buildFallbackContent(input, brandKit),
  usedFallback: true,
  fallbackReason,
})

const buildGeminiPrompt = (input: GenerateCaptionInput, brandKit?: BrandKitContext | null, trendContext?: TrendContext | null) => `
You are an expert social media copywriter.
Write a polished caption for ${input.platform} for a ${input.contentType.toLowerCase()} post.
Tone: ${getTone(input, brandKit)}.
Audience: ${getAudience(input, brandKit)}.
Context: ${input.prompt}.
Brand context:
${buildBrandContext(brandKit)}
Market context:
${formatTrendContext(trendContext)}
The caption, hashtags, and CTA suggestions must follow the saved brand voice, target audience, color/style personality, and industry positioning whenever brand context exists.
Use the market context to address content gaps and trends without naming competitors directly unless the user asked for it.
Return only valid JSON with keys caption, hashtags, and ctaSuggestions. Do not wrap it in markdown.
The caption should be concise, professional, and ready to publish. Hashtags should be an array of 4-6 strings. CTA suggestions should be an array of 3 strings.
`

const buildImagePrompt = (input: GenerateCaptionInput, brandKit?: BrandKitContext | null, trendContext?: TrendContext | null) =>
  [
    `High-quality marketing-style social media thumbnail for ${input.platform}.`,
    `Campaign: ${input.prompt}.`,
    `Content type: ${input.contentType}.`,
    `Tone: ${getTone(input, brandKit)}.`,
    `Audience: ${getAudience(input, brandKit)}.`,
    brandKit ? `Brand: ${brandKit.brandName}. Industry: ${brandKit.industry}. Brand description: ${brandKit.description}. Use brand colors ${brandKit.colors.join(', ')} as the visual palette. Logo style reference: ${brandKit.logoUrl ? 'logo is available and should inspire the composition without copying exact UI' : 'no logo provided'}.` : '',
    trendContext ? `Market trend inspiration: ${trendContext.trendingTopics.slice(0, 4).join(', ')}. Content gaps to imply visually: ${trendContext.contentGaps.slice(0, 2).join('; ')}.` : '',
    'Premium creator brand aesthetic, cinematic lighting, crisp product-marketing composition, vibrant purple blue pink accent lighting, modern social media campaign visual, polished commercial photography, high contrast, shallow depth of field, no UI screenshots, no watermarks, minimal text.',
  ].filter(Boolean).join(' ')

const postGeminiInteraction = async (body: Record<string, unknown>) => {
  console.log('[ai.service] Gemini request', {
    model: body.model,
    hasInput: Boolean(body.input),
    keys: Object.keys(body),
  })
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(env.GEMINI_REQUEST_TIMEOUT_MS),
  })

  const data = (await response.json().catch(() => ({}))) as GeminiInteractionResponse

  console.log('[ai.service] Gemini response status', response.status)

  if (!response.ok) {
    const message = data.error?.message || `Gemini request failed with status ${response.status}`
    throw new Error(message)
  }

  return data
}

const isGeminiQuotaError = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  return message.includes('quota') || message.includes('rate limit') || message.includes('429') || message.includes('resource exhausted')
}

const extractGeminiText = (data: GeminiInteractionResponse) => {
  if (data.output_text) {
    return data.output_text
  }

  return data.steps
    ?.flatMap((step) => step.output || [])
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text)
    .join('')
}

const parseGeminiContent = (text: string, input: GenerateCaptionInput, brandKit?: BrandKitContext | null): GeneratedContent => {
  const fallbackContent = buildFallbackContent(input, brandKit)
  const cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()
  const jsonStart = cleaned.indexOf('{')
  const jsonEnd = cleaned.lastIndexOf('}')
  const json = jsonStart >= 0 && jsonEnd > jsonStart ? cleaned.slice(jsonStart, jsonEnd + 1) : cleaned
  const parsed = JSON.parse(json) as Partial<GeneratedContent>

  return {
    caption: typeof parsed.caption === 'string' && parsed.caption.trim() ? parsed.caption.trim() : fallbackContent.caption,
    hashtags: Array.isArray(parsed.hashtags) && parsed.hashtags.length ? parsed.hashtags.map(String) : fallbackContent.hashtags,
    ctaSuggestions: Array.isArray(parsed.ctaSuggestions) && parsed.ctaSuggestions.length ? parsed.ctaSuggestions.map(String) : fallbackContent.ctaSuggestions,
  }
}

const generateWithGemini = async (input: GenerateCaptionInput, brandKit?: BrandKitContext | null, trendContext?: TrendContext | null): Promise<GeneratedContentResult> => {
  if (!env.GEMINI_API_KEY) {
    return withFallbackMetadata(input, 'Gemini is not configured yet, so fallback content was generated.', brandKit)
  }

  try {
    const data = await postGeminiInteraction({
      model: env.GEMINI_TEXT_MODEL,
      input: buildGeminiPrompt(input, brandKit, trendContext),
      generation_config: {
        temperature: 0.8,
      },
    })
    const text = extractGeminiText(data) || ''

    if (!text) {
      throw new Error('Gemini returned no content')
    }

    const parsed = parseGeminiContent(text, input, brandKit)

    return {
      ...parsed,
      usedFallback: false,
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Gemini was unavailable'
    return withFallbackMetadata(input, `Gemini caption generation failed: ${reason}. Fallback content was generated.`, brandKit)
  }
}

const extractGeminiImage = (data: GeminiInteractionResponse) => {
  if (data.output_image?.data) {
    return {
      buffer: Buffer.from(data.output_image.data, 'base64'),
      contentType: data.output_image.mime_type || 'image/jpeg',
    }
  }

  const stepImage = data.steps
    ?.flatMap((step) => step.output || [])
    .find((part) => part.image?.data)

  if (stepImage?.image?.data) {
    return {
      buffer: Buffer.from(stepImage.image.data, 'base64'),
      contentType: stepImage.image.mime_type || 'image/jpeg',
    }
  }

  const parts = data.candidates?.flatMap((candidate) => candidate.content?.parts || []) || []
  const imagePart = parts.find((part) => part.inlineData?.data || part.inline_data?.data)
  const inlineData = imagePart?.inlineData
  const inlineDataSnake = imagePart?.inline_data
  const base64 = inlineData?.data || inlineDataSnake?.data
  const contentType = inlineData?.mimeType || inlineDataSnake?.mime_type || 'image/jpeg'

  if (!base64) {
    return null
  }

  return {
    buffer: Buffer.from(base64, 'base64'),
    contentType,
  }
}

const generateGeminiImageBytes = async (imagePrompt: string): Promise<ImageBytes> => {
  if (!env.GEMINI_API_KEY) {
    throw new Error('Gemini image generation is not configured.')
  }

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      model: env.GEMINI_IMAGE_MODEL,
      input: imagePrompt,
      response_format: {
        type: 'image',
        mime_type: 'image/jpeg',
        aspect_ratio: '1:1',
        image_size: '2K',
      },
    }),
    signal: AbortSignal.timeout(env.GEMINI_REQUEST_TIMEOUT_MS),
  })
  const data = (await response.json().catch(() => ({}))) as GeminiInteractionResponse

  console.log('[ai.service] Gemini image response', {
    status: response.status,
    hasOutputImage: Boolean(data.output_image?.data),
  })

  if (!response.ok) {
    throw new Error(data.error?.message || `Gemini image request failed with status ${response.status}`)
  }

  const image = extractGeminiImage(data)

  if (!image) {
    throw new Error('Gemini did not return an image.')
  }

  return {
    ...image,
    provider: 'gemini',
  }
}

const generatePollinationsImageBytes = async (imagePrompt: string, fallbackReason?: string): Promise<ImageBytes> => {
  const promptPath = encodeURIComponent(imagePrompt)
  const seed = `${Date.now()}-${Math.floor(Math.random() * 100000)}`
  const imageUrl = `${env.POLLINATIONS_IMAGE_BASE_URL.replace(/\/$/, '')}/prompt/${promptPath}?width=1024&height=1024&seed=${encodeURIComponent(seed)}&model=${encodeURIComponent(env.POLLINATIONS_IMAGE_MODEL)}&nologo=true&enhance=true`

  try {
    const response = await fetch(imageUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(env.POLLINATIONS_REQUEST_TIMEOUT_MS),
    })
    const contentType = response.headers.get('content-type') || ''

    if (!response.ok || !contentType.startsWith('image/')) {
      throw new Error(`Pollinations returned ${response.status || 'an invalid response'}`)
    }

    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      contentType,
      provider: 'pollinations',
      fallbackReason,
    }
  } catch (error) {
    throw new AppError('We could not generate a thumbnail right now. Please try again in a moment.', 502)
  }
}

const generateImageBytes = async (imagePrompt: string): Promise<ImageBytes> => {
  try {
    return await generateGeminiImageBytes(imagePrompt)
  } catch (error) {
    const fallbackReason = isGeminiQuotaError(error)
      ? 'Your thumbnail has been generated using our backup image engine.'
      : error instanceof Error && error.message.includes('denied access')
        ? 'Gemini access is currently unavailable, so your thumbnail was generated using our backup image engine.'
        : 'Your thumbnail has been generated using our backup image engine.'
    console.warn('[ai.service] Falling back to Pollinations image generation', {
      reason: error instanceof Error ? error.message : 'unknown error',
    })
    return generatePollinationsImageBytes(imagePrompt, fallbackReason)
  }
}

const uploadImageToCloudinary = async (image: ImageBytes, imagePrompt: string) => {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new AppError('Cloudinary is not configured, so generated thumbnails cannot be saved permanently yet.', 503)
  }

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const folder = 'postpilot-ai/thumbnails'
  const publicId = `thumbnail-${timestamp}-${crypto.randomUUID()}`
  const signaturePayload = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`
  const signature = crypto.createHash('sha1').update(signaturePayload).digest('hex')
  const formData = new FormData()
  const extension = image.contentType.includes('png') ? 'png' : image.contentType.includes('webp') ? 'webp' : 'jpg'
  const uploadBytes = new Uint8Array(image.buffer.byteLength)
  uploadBytes.set(image.buffer)

  formData.set('file', new Blob([uploadBytes], { type: image.contentType }), `${publicId}.${extension}`)
  formData.set('api_key', env.CLOUDINARY_API_KEY)
  formData.set('timestamp', timestamp)
  formData.set('folder', folder)
  formData.set('public_id', publicId)
  formData.set('signature', signature)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/image/upload`, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(env.POLLINATIONS_REQUEST_TIMEOUT_MS),
  })
  const data = (await response.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } }

  if (!response.ok || !data.secure_url) {
    throw new AppError(data.error?.message || 'Generated thumbnail could not be saved permanently right now.', 502)
  }

  return data.secure_url
}

const generateThumbnailImage = async (input: GenerateCaptionInput, brandKit?: BrandKitContext | null, trendContext?: TrendContext | null): Promise<GeneratedImageResult> => {
  const imagePrompt = buildImagePrompt(input, brandKit, trendContext).trim()
  const image = await generateImageBytes(imagePrompt)
  const imageUrl = await uploadImageToCloudinary(image, imagePrompt)

  return {
    imageUrl,
    imagePrompt,
    imageProvider: image.provider,
    imageFallbackReason: image.fallbackReason,
  }
}

const saveHistory = async (userId: string, input: GenerateCaptionInput, content: GeneratedContentResult, type: 'caption' | 'image' = 'caption') => {
  const payload = {
    userId,
    type,
    input: JSON.stringify(input),
    output: JSON.stringify(content),
  }

  if (!isMongoAvailable()) {
    const entry = { id: `${memoryAIHistory.length + 1}`, ...payload }
    memoryAIHistory.push(entry)
    return entry
  }

  const created = await AIHistory.create(payload)
  return created.toObject()
}

const safeJsonParse = (value: string) => {
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return { raw: value }
  }
}

const serializeHistoryEntry = (entry: any): SerializedHistoryEntry => ({
  id: entry.id || entry._id?.toString?.() || '',
  type: entry.type,
  input: safeJsonParse(entry.input),
  output: safeJsonParse(entry.output),
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
})

export const generateCaptionContent = async (userId: string, input: GenerateCaptionInput) => {
  const brandKit = await getBrandKitContext(userId)
  const trendContext = await getTrendContext(userId)
  console.log('[ai.service] generateCaptionContent request', {
    userId,
    platform: input.platform,
    contentType: input.contentType,
    generateImage: input.generateImage,
    hasGeminiKey: Boolean(env.GEMINI_API_KEY),
    geminiTextModel: env.GEMINI_TEXT_MODEL,
    geminiImageModel: env.GEMINI_IMAGE_MODEL,
  })
  const content = await generateWithGemini(input, brandKit, trendContext)
  let contentWithImage: GeneratedContentResult = content

  if (input.generateImage) {
    try {
      contentWithImage = {
        ...content,
        ...(await generateThumbnailImage(input, brandKit, trendContext)),
      }
    } catch (error) {
      contentWithImage = {
        ...content,
        imageError: error instanceof AppError ? error.message : 'We could not generate a thumbnail right now. Please try again in a moment.',
      }
    }
  }

  const history = await saveHistory(userId, input, contentWithImage)

  console.log('[ai.service] generateCaptionContent result', {
    userId,
    usedFallback: contentWithImage.usedFallback,
    hasImage: Boolean(contentWithImage.imageUrl),
    imageProvider: contentWithImage.imageProvider,
  })

  return {
    ...contentWithImage,
    history,
  }
}

export const generateImageContent = async (userId: string, input: GenerateCaptionInput) => {
  const brandKit = await getBrandKitContext(userId)
  const trendContext = await getTrendContext(userId)
  console.log('[ai.service] generateImageContent request', {
    userId,
    platform: input.platform,
    hasGeminiKey: Boolean(env.GEMINI_API_KEY),
    geminiImageModel: env.GEMINI_IMAGE_MODEL,
  })
  const content = await generateThumbnailImage(input, brandKit, trendContext)
  const history = await saveHistory(userId, { ...input, generateImage: true }, { ...content, caption: '', hashtags: [], ctaSuggestions: [], usedFallback: false }, 'image')

  console.log('[ai.service] generateImageContent result', {
    userId,
    imageProvider: content.imageProvider,
    hasImage: Boolean(content.imageUrl),
  })

  return {
    ...content,
    history,
  }
}

export const listAIHistory = async (userId: string) => {
  if (!isMongoAvailable()) {
    return memoryAIHistory
      .filter((entry) => entry.userId === userId)
      .slice()
      .reverse()
      .map(serializeHistoryEntry)
  }

  const entries = await AIHistory.find({ userId }).sort({ createdAt: -1 }).limit(100)
  return entries.map(serializeHistoryEntry)
}

export const downloadGeneratedImage = async (imageUrl: string) => {
  const allowedBaseUrl = env.POLLINATIONS_IMAGE_BASE_URL.replace(/\/$/, '')
  const cloudinaryBaseUrl = env.CLOUDINARY_CLOUD_NAME ? `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/` : ''

  if (!imageUrl.startsWith(allowedBaseUrl) && (!cloudinaryBaseUrl || !imageUrl.startsWith(cloudinaryBaseUrl))) {
    throw new AppError('Unsupported image URL', 400)
  }

  const response = await fetch(imageUrl, {
    method: 'GET',
    signal: AbortSignal.timeout(env.POLLINATIONS_REQUEST_TIMEOUT_MS),
  })
  const contentType = response.headers.get('content-type') || 'image/jpeg'

  if (!response.ok || !contentType.startsWith('image/')) {
    throw new AppError('Generated image could not be downloaded right now.', 502)
  }

  const buffer = Buffer.from(await response.arrayBuffer())

  return {
    buffer,
    contentType,
  }
}
