import { Router } from 'express'
import { completeZernioSocialConnection, completeZernioSocialRedirect, disconnectConnectedAccount, getConnectedAccounts, publishSocialPostHandler, startZernioSocialConnection } from '../controllers/social.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = Router()

router.get('/accounts', protect, getConnectedAccounts)
router.get('/zernio/:provider/start', protect, startZernioSocialConnection)
router.get('/zernio/:provider/callback', protect, completeZernioSocialRedirect)
router.post('/zernio/:provider/callback', protect, completeZernioSocialConnection)
router.post('/publish', protect, publishSocialPostHandler)
router.delete('/accounts/:provider', protect, disconnectConnectedAccount)

export default router
