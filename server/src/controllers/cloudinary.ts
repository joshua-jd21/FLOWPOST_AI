import { Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import * as cloudinaryService from '../services/cloudinary.js';

export async function upload(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const result = await cloudinaryService.uploadImage(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      res.status(400).json({ message: 'publicId is required' });
      return;
    }
    await cloudinaryService.deleteImage(publicId);
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    next(error);
  }
}
