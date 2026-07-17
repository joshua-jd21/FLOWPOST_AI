import type { NextFunction, Response } from 'express'
import { ZodError } from 'zod'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { changeUserPassword, getUserProfileSummary, getUserSettings, updateUserSettings } from '../services/user.service.js'
import { changePasswordSchema, settingsPayloadSchema } from '../validators/user.validator.js'

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const summary = await getUserProfileSummary(req.user?.id ?? '')
    res.status(200).json({
      user: req.user,
      ...summary,
    })
  } catch (error) {
    next(error)
  }
}

export const getSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settings = await getUserSettings(req.user?.id ?? '')
    res.status(200).json({ settings })
  } catch (error) {
    next(error)
  }
}

export const updateSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = settingsPayloadSchema.parse(req.body)
    const settings = await updateUserSettings(req.user?.id ?? '', parsed)
    res.status(200).json({ settings })
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || 'Invalid settings' })
    }

    next(error)
  }
}

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = changePasswordSchema.parse(req.body)
    await changeUserPassword(req.user?.id ?? '', parsed)
    res.status(200).json({ message: 'Password updated successfully' })
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || 'Invalid password update' })
    }

    next(error)
  }
}
