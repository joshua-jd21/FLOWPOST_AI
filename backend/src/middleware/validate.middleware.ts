import type { NextFunction, Request, Response } from 'express'
import type { ZodObject } from 'zod'

export const validateRequest = (schema: ZodObject<any>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      return _res.status(400).json({
        message: result.error.issues[0]?.message || 'Invalid input',
      })
    }

    req.body = result.data
    next()
  }
}
