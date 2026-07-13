import { Router } from 'express';
import * as authController from '../../controllers/auth.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', authController.register);

// POST /api/v1/auth/login
router.post('/login', authController.login);

// POST /api/v1/auth/refresh
router.post('/refresh', authController.refresh);

// POST /api/v1/auth/logout (authenticated)
router.post('/logout', authenticate, authController.logout);

// GET /api/v1/auth/profile (authenticated)
router.get('/profile', authenticate, authController.profile);

export default router;
