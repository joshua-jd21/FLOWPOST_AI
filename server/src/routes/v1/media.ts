import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth.js';
import * as cloudinaryController from '../../controllers/cloudinary.js';
import * as geminiController from '../../controllers/gemini.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: jpg, png, webp, gif'));
    }
  },
});

// POST /api/v1/media/upload (authenticated)
router.post('/upload', authenticate, upload.single('image'), cloudinaryController.upload);

// DELETE /api/v1/media/remove (authenticated)
router.delete('/remove', authenticate, cloudinaryController.remove);

// POST /api/v1/ai/generate-caption
router.post('/ai/generate-caption', geminiController.generateCaption);

export default router;
