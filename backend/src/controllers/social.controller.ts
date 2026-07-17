import type { NextFunction, Response } from 'express'
import { ZodError } from 'zod'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { completeZernioSocialConnection as completeZernioAccountConnection, createZernioConnectionStart, disconnectSocialAccount, listConnectedAccounts, publishSocialPost, recordPublishedSocialPost } from '../services/social.service.js'
import { env } from '../utils/env.js'
import { publishSocialPostSchema, socialProviderSchema, zernioCallbackSchema } from '../validators/social.validator.js'

export const getConnectedAccounts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('[social.controller] GET /api/social/accounts', {
      userId: req.user?.id,
    })
    const accounts = await listConnectedAccounts(req.user?.id ?? '')
    console.log('[social.controller] connected accounts response', {
      userId: req.user?.id,
      count: accounts.length,
    })
    res.status(200).json({ accounts })
  } catch (error) {
    next(error)
  }
}

export const startZernioSocialConnection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const provider = socialProviderSchema.parse(req.params.provider)
    console.log('[social.controller] GET /api/social/zernio/:provider/start', {
      provider,
      userId: req.user?.id,
    })
    const result = await createZernioConnectionStart(req.user?.id ?? '', provider)
    console.log('[social.controller] Zernio start result', {
      provider,
      configured: result.configured,
      hasAuthUrl: Boolean(result.authUrl),
      connectionId: result.connectionId,
    })
    res.status(200).json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || 'Invalid provider' })
    }

    next(error)
  }
}

export const completeZernioSocialConnection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const provider = socialProviderSchema.parse(req.params.provider)
    console.log('[social.controller] POST /api/social/zernio/:provider/callback', {
      provider,
      userId: req.user?.id,
      body: req.body,
      query: req.query,
    })
    const parsed = zernioCallbackSchema.parse(req.body)
    console.log('[social.controller] Parsed Zernio callback body', {
      provider,
      parsed,
    })
    const account = await completeZernioAccountConnection(req.user?.id ?? '', provider, parsed)
    console.log('[social.controller] Zernio callback stored account', {
      provider,
      userId: req.user?.id,
      accountId: account.id,
      accountName: account.accountName,
      verifiedAt: account.verifiedAt,
      status: account.status,
    })
    res.status(200).json({ account })
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || 'Invalid Zernio callback' })
    }

    console.error('[social.controller] Zernio callback processing failed', {
      provider: req.params.provider,
      userId: req.user?.id,
      body: req.body,
      query: req.query,
      error,
    })
    next(error)
  }
}

export const completeZernioSocialRedirect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const provider = socialProviderSchema.parse(req.params.provider)
    console.log('[social.controller] GET /api/social/zernio/:provider/callback', {
      provider,
      userId: req.user?.id,
      query: req.query,
    })
    const parsed = zernioCallbackSchema.parse(req.query)
    console.log('[social.controller] Parsed Zernio callback query', {
      provider,
      parsed,
    })
    await completeZernioAccountConnection(req.user?.id ?? '', provider, parsed)
    console.log('[social.controller] Redirecting connected account back to frontend', {
      provider,
      userId: req.user?.id,
    })
    res.redirect(`${env.FRONTEND_APP_URL}/dashboard/connected-accounts?social=connected&provider=${provider}`)
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('[social.controller] Invalid Zernio callback query', {
        provider: req.params.provider,
        userId: req.user?.id,
        query: req.query,
        error,
      })
      return res.redirect(`${env.FRONTEND_APP_URL}/dashboard/connected-accounts?social=failed`)
    }

    if (req.method === 'GET') {
      console.error('[social.controller] Zernio callback redirect failed', {
        provider: req.params.provider,
        userId: req.user?.id,
        query: req.query,
        error,
      })
      return res.redirect(`${env.FRONTEND_APP_URL}/dashboard/connected-accounts?social=failed`)
    }

    console.error('[social.controller] Zernio callback redirect encountered an error', {
      provider: req.params.provider,
      userId: req.user?.id,
      query: req.query,
      error,
    })
    next(error)
  }
}

export const disconnectConnectedAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const provider = socialProviderSchema.parse(req.params.provider)
    console.log('[social.controller] DELETE /api/social/accounts/:provider', {
      provider,
      userId: req.user?.id,
    })
    const account = await disconnectSocialAccount(req.user?.id ?? '', provider)
    res.status(200).json({ account })
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || 'Invalid provider' })
    }

    next(error)
  }
}

export const publishSocialPostHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('[social.controller] POST /api/social/publish', {
      userId: req.user?.id,
      body: req.body,
    })
    const parsed = publishSocialPostSchema.parse(req.body)
    const result = await publishSocialPost(req.user?.id ?? '', parsed)
    const post = await recordPublishedSocialPost(req.user?.id ?? '', parsed, result)
    console.log('[social.controller] publish completed', {
      userId: req.user?.id,
      externalPostId: result.externalPostId,
      zernioPostId: result.zernioPostId,
      platformPostUrl: result.platformPostUrl,
      status: result.status,
      savedPostId: post.id,
    })
    res.status(200).json({ publish: result, post })
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || 'Invalid publish request' })
    }

    next(error)
  }
}
