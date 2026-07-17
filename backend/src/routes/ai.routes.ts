import { Router } from 'express'
import { downloadAIImage, generateCaption, generateImage, getAIHistory } from '../controllers/ai.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = Router()

router.get('/history', protect, getAIHistory)
router.post('/generate-caption', protect, generateCaption)
router.post('/generate-image', protect, generateImage)
router.post('/download-image', protect, downloadAIImage)

export default router
