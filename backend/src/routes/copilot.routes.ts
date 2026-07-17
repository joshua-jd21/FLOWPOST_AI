import { Router } from 'express'
import { getCopilotSessionHandler, getCopilotSessions, sendCopilotMessageHandler } from '../controllers/copilot.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = Router()

router.get('/sessions', protect, getCopilotSessions)
router.get('/sessions/:id', protect, getCopilotSessionHandler)
router.post('/chat', protect, sendCopilotMessageHandler)

export default router
