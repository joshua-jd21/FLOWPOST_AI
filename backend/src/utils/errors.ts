export class AppError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 500) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
  }
}

export const handleError = (err: unknown, res: any) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message })
  }

  if (err instanceof Error) {
    return res.status(500).json({ message: err.message })
  }

  return res.status(500).json({ message: 'Internal server error' })
}
