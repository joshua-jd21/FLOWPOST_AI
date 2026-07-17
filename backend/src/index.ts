import cors from 'cors'
import express from 'express'
import { connectDB } from './config/db.js'
import aiRoutes from './routes/ai.routes.js'
import analyticsRoutes from './routes/analytics.routes.js'
import authRoutes from './routes/auth.routes.js'
import copilotRoutes from './routes/copilot.routes.js'
import postRoutes from './routes/post.routes.js'
import protectedRoutes from './routes/protected.routes.js'
import socialRoutes from './routes/social.routes.js'
import userRoutes from './routes/user.routes.js'
import { runDueAutomationWorkflows } from './services/automation.service.js'
import { publishDueScheduledPosts } from './services/post.service.js'
import { env } from './utils/env.js'
import { handleError } from './utils/errors.js'

const app = express()
const port = env.PORT

// Allow local frontend during development
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (Postman, curl)
      if (!origin) {
        return callback(null, true)
      }

      const allowedOrigins = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        'http://localhost:5175',
        'http://127.0.0.1:5175',
        'http://localhost:5176',
        'http://127.0.0.1:5176',
        'http://localhost:5177',
        'http://127.0.0.1:5177',
        'http://localhost:5178',
        'http://127.0.0.1:5178',
        'http://localhost:5179',
        'http://127.0.0.1:5179',
        'http://localhost:5180',
        'http://127.0.0.1:5180',
        'http://localhost:5181',
        'http://127.0.0.1:5181',
      ]

      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)

app.use(express.json({ limit: '8mb' }))

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'postpilot-api',
  })
})

app.use('/api/auth', authRoutes)
app.use('/api', protectedRoutes)
app.use('/api/users', userRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/social', socialRoutes)
app.use('/api/copilot', copilotRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/analytics', analyticsRoutes)

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err)

    if (err instanceof Error) {
      return handleError(err, res)
    }

    return res.status(500).json({
      message: 'Internal server error',
    })
  },
)

const startServer = async () => {
  try {
    await connectDB()

    app.listen(port, () => {
      console.log(`PostPilot API listening on port ${port}`)
    })

    setInterval(() => {
      void publishDueScheduledPosts().catch((error) => {
        console.error('Scheduled publishing check failed', error)
      })
      void runDueAutomationWorkflows().catch((error) => {
        console.error('Automation workflow check failed', error)
      })
    }, 60_000)
  } catch (error) {
    console.error('Failed to start server', error)
    process.exit(1)
  }
}

startServer()
