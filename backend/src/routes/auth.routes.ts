import { Router } from 'express'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { login, register } from '../controllers/auth.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = Router()

router.get('/me', protect, (req: AuthRequest, res) => {
  res.json({ user: req.user })
})

router.post('/logout', (_req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  res.json({ message: 'Logged out' })
})

router.post('/register', register)
router.post('/login', login)

export default router
