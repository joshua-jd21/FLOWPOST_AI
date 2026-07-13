import { Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { config } from '../config/index.js';

export const logger = pino({
  name: 'flowpost-api',
  level: config.isDev ? 'debug' : 'info',
  transport: config.isDev
    ? {
        target: 'pino-pretty',
        options: { colorize: true },
      }
    : undefined,
});

export function requestLogger(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  logger.info({ method: req.method, url: req.url }, 'request');
  next();
}
