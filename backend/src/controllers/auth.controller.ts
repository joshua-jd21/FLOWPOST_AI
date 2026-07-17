import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { loginUser, registerUser } from '../services/auth.service.js'
import { loginSchema, registerSchema } from '../validators/auth.validator.js'

const setAuthCookie = (res: Response, token: string) => {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  })
}

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = registerSchema.parse(req.body)
    const result = await registerUser(parsed)
    setAuthCookie(res, result.token)
    res.status(201).json({ user: result.user })
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || 'Invalid input' })
    }

    next(error)
  }
}

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.parse(req.body)
    const result = await loginUser(parsed)
    setAuthCookie(res, result.token)
    res.status(200).json({ user: result.user })
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || 'Invalid input' })
    }

    next(error)
  }
}
