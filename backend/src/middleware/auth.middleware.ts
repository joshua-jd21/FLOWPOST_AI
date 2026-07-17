import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { memoryUsers } from '../config/db.js'
import { User } from '../models/user.model.js'
import { env } from '../utils/env.js'

export interface AuthRequest extends Request {
  user?: { id: string; email: string; name?: string; avatar?: string; isActive?: boolean }
}

const getTokenFromRequest = (req: Request) => {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1]
  }

  const cookieHeader = req.headers.cookie || ''
  const cookie = cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith('token='))

  return cookie?.split('=')[1]
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = getTokenFromRequest(req)

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { sub: string; email: string }

    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(decoded.sub).select('-password')

      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' })
      }

      req.user = {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        isActive: user.isActive,
      }
    } else {
      const user = memoryUsers.find((entry) => entry.id === decoded.sub)

      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' })
      }

      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        isActive: user.isActive,
      }
    }

    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}
