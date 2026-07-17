import type { NextFunction, Response } from 'express'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { getAnalyticsOverview } from '../services/analytics.service.js'

export const getAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const analytics = await getAnalyticsOverview(req.user?.id ?? '')
    res.status(200).json(analytics)
  } catch (error) {
    next(error)
  }
}
