import { Router } from 'express';
import * as pollinationsController from '../../controllers/pollinations.js';

const router = Router();

// POST /api/v1/ai/generate-image
router.post('/generate-image', pollinationsController.generateImage);

export default router;
