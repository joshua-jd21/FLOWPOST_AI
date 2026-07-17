import { Router } from 'express'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { protect } from '../middleware/auth.middleware.js'

const router = Router()

router.get('/me', protect, (req: AuthRequest, res) => {
  res.json({
    message: 'Protected route accessed successfully',
    user: req.user,
  })
})

export default router
