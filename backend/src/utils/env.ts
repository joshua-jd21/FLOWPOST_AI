import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { z } from 'zod'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

for (const envPath of [
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env'),
]) {
  dotenv.config({ path: envPath })
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGO_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/postpilot'),
  JWT_SECRET: z.string().min(1).default('dev-secret-change-me'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_TEXT_MODEL: z.string().optional().default('gemini-3.5-flash'),
  GEMINI_IMAGE_MODEL: z.string().optional().default('gemini-2.0-flash-preview-image-generation'),
  GEMINI_REQUEST_TIMEOUT_MS: z.coerce.number().optional().default(60000),
  POLLINATIONS_IMAGE_BASE_URL: z.string().url().optional().default('https://image.pollinations.ai'),
  POLLINATIONS_IMAGE_MODEL: z.string().optional().default('flux'),
  POLLINATIONS_REQUEST_TIMEOUT_MS: z.coerce.number().optional().default(45000),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  SOCIAL_CALLBACK_BASE_URL: z.string().optional().default('http://localhost:5000'),
  FRONTEND_APP_URL: z.string().url().optional().default('http://localhost:5173'),
  ZERNIO_API_BASE_URL: z.string().optional().default(''),
  ZERNIO_API_KEY: z.string().optional().default(''),
  ZERNIO_PROFILE_ID: z.string().optional().default(''),
  ZERNIO_CALLBACK_PATH: z.string().optional().default(''),
  ZERNIO_PUBLISH_PATH: z.string().optional().default(''),
  ZERNIO_REQUEST_TIMEOUT_MS: z.coerce.number().optional().default(45000),
})

const parsedEnv = envSchema.parse(process.env)

const trimValue = (value: string) => value.trim()

export const env = {
  ...parsedEnv,
  MONGO_URI: trimValue(parsedEnv.MONGO_URI),
  JWT_SECRET: trimValue(parsedEnv.JWT_SECRET),
  GEMINI_API_KEY: trimValue(parsedEnv.GEMINI_API_KEY),
  GEMINI_TEXT_MODEL: trimValue(parsedEnv.GEMINI_TEXT_MODEL),
  GEMINI_IMAGE_MODEL: trimValue(parsedEnv.GEMINI_IMAGE_MODEL),
  POLLINATIONS_IMAGE_BASE_URL: trimValue(parsedEnv.POLLINATIONS_IMAGE_BASE_URL),
  POLLINATIONS_IMAGE_MODEL: trimValue(parsedEnv.POLLINATIONS_IMAGE_MODEL),
  CLOUDINARY_CLOUD_NAME: trimValue(parsedEnv.CLOUDINARY_CLOUD_NAME),
  CLOUDINARY_API_KEY: trimValue(parsedEnv.CLOUDINARY_API_KEY),
  CLOUDINARY_API_SECRET: trimValue(parsedEnv.CLOUDINARY_API_SECRET),
  SOCIAL_CALLBACK_BASE_URL: trimValue(parsedEnv.SOCIAL_CALLBACK_BASE_URL),
  FRONTEND_APP_URL: trimValue(parsedEnv.FRONTEND_APP_URL),
  ZERNIO_API_BASE_URL: trimValue(parsedEnv.ZERNIO_API_BASE_URL),
  ZERNIO_API_KEY: trimValue(parsedEnv.ZERNIO_API_KEY),
  ZERNIO_PROFILE_ID: trimValue(parsedEnv.ZERNIO_PROFILE_ID),
  ZERNIO_CALLBACK_PATH: trimValue(parsedEnv.ZERNIO_CALLBACK_PATH),
  ZERNIO_PUBLISH_PATH: trimValue(parsedEnv.ZERNIO_PUBLISH_PATH),
}
