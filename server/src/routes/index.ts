import { Router } from 'express';
import authRoutes from './v1/auth.js';
import aiRoutes from './v1/ai.js';
import mediaRoutes from './v1/media.js';

const router = Router();

// API v1 routes
router.use('/v1/auth', authRoutes);
router.use('/v1/ai', aiRoutes);
router.use('/v1/media', mediaRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
