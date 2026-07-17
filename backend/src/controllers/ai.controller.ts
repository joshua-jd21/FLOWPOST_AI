import type { NextFunction, Response } from 'express'
import { ZodError } from 'zod'
import { downloadGeneratedImage, generateCaptionContent, generateImageContent, listAIHistory } from '../services/ai.service.js'
import { downloadImageSchema, generateCaptionSchema } from '../validators/ai.validator.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'

export const generateCaption = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = generateCaptionSchema.parse(req.body)
    const result = await generateCaptionContent(req.user?.id ?? 'anonymous', parsed)
    res.status(200).json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || 'Invalid input' })
    }

    next(error)
  }
}

export const generateImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = generateCaptionSchema.parse(req.body)
    const result = await generateImageContent(req.user?.id ?? 'anonymous', parsed)
    res.status(200).json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || 'Invalid input' })
    }

    next(error)
  }
}

export const getAIHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const history = await listAIHistory(req.user?.id ?? '')
    res.status(200).json({ history })
  } catch (error) {
    next(error)
  }
}

export const downloadAIImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = downloadImageSchema.parse(req.body)
    const image = await downloadGeneratedImage(parsed.imageUrl)
    res.setHeader('Content-Type', image.contentType)
    res.setHeader('Content-Disposition', 'attachment; filename="postpilot-ai-thumbnail.jpg"')
    res.status(200).send(image.buffer)
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || 'Invalid image URL' })
    }

    next(error)
  }
}
