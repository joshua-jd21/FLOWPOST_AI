import type { NextFunction, Response } from 'express'
import { ZodError } from 'zod'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { getCopilotSession, listCopilotSessions, sendCopilotMessage } from '../services/copilot.service.js'
import { copilotMessageSchema, copilotSessionIdSchema } from '../validators/copilot.validator.js'

export const getCopilotSessions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sessions = await listCopilotSessions(req.user?.id ?? '')
    res.status(200).json({ sessions })
  } catch (error) {
    next(error)
  }
}

export const getCopilotSessionHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = copilotSessionIdSchema.parse(req.params)
    const session = await getCopilotSession(req.user?.id ?? '', parsed.id)

    if (!session) {
      return res.status(404).json({ message: 'Copilot session not found' })
    }

    res.status(200).json({ session })
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || 'Invalid Copilot session id' })
    }

    next(error)
  }
}

export const sendCopilotMessageHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = copilotMessageSchema.parse(req.body)
    const result = await sendCopilotMessage(req.user?.id ?? '', parsed)
    res.status(200).json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || 'Invalid Copilot message' })
    }

    next(error)
  }
}
