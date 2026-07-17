import { Router } from 'express'
import { changePassword, getProfile, getSettings, updateSettings } from '../controllers/user.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = Router()

router.get('/profile', protect, getProfile)
router.get('/settings', protect, getSettings)
router.put('/settings', protect, updateSettings)
router.put('/password', protect, changePassword)

export default router
