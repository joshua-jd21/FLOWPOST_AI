import { Request, Response, NextFunction } from 'express';
import * as geminiService from '../services/gemini.js';
import { generateCaptionSchema } from '../validators/ai.js';

export async function generateCaption(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = generateCaptionSchema.parse(req.body);
    const result = await geminiService.generateCaption(input);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
