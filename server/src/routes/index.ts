import { Router } from 'express';
import authRoutes from './v1/auth.js';

const router = Router();

// API v1 routes
router.use('/v1/auth', authRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
