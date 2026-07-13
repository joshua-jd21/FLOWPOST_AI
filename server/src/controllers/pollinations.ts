import { Request, Response, NextFunction } from 'express';
import * as pollinationsService from '../services/pollinations.js';
import { generateImageSchema } from '../validators/ai.js';

export async function generateImage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = generateImageSchema.parse(req.body);
    const imageUrl = await pollinationsService.generateImage(input);
    res.json({ imageUrl });
  } catch (error) {
    next(error);
  }
}
