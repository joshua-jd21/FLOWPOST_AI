# PostPilot AI

PostPilot AI is an AI-powered social media SaaS for creators and teams. It combines AI content generation, campaign planning, scheduling, analytics, connected social accounts, Zernio publishing, brand identity, competitor intelligence, automation workflows, and a natural-language Content Copilot.

## Stack

- Frontend: React, TypeScript, Vite, React Router, Recharts
- Backend: Node.js, Express, TypeScript
- Database: MongoDB Atlas or local MongoDB with Mongoose
- Auth: JWT stored in secure HTTP-only cookies
- AI: Gemini for text, Pollinations AI for thumbnail image generation
- Social publishing: Zernio API with OAuth scaffolding

## Features

- Premium landing page, public demo mode, and protected onboarding checklist
- Cookie-based registration, login, logout, and protected dashboard routes
- AI Studio for captions, hashtags, CTA suggestions, and thumbnails
- AI History for generated content review
- Brand Kit and persona storage for brand-aware generation
- Campaign Planner with 7-day, 15-day, and 30-day calendars
- Scheduler with drafts, scheduled posts, media, and publishing hooks
- Connected Accounts architecture for LinkedIn, Instagram, X, and Facebook
- Analytics and insights for posts, generated content, accounts, and trends
- Competitor and trend intelligence
- AI Automation Workflows for scheduled generate/schedule/publish actions
- AI Content Copilot for natural-language orchestration across modules

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- MongoDB Atlas cluster or local MongoDB
- Optional: Gemini API key, Zernio API credentials, OAuth client IDs

## Installation

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Update `backend/.env` with your MongoDB Atlas URI and secrets.

## Development

Run both apps from the repository root:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev --workspace backend
npm run dev --workspace frontend
```

Default URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/health`

## Environment

Backend:

- `PORT`: API port
- `NODE_ENV`: `development`, `test`, or `production`
- `MONGO_URI`: MongoDB Atlas or local connection string
- `JWT_SECRET`: JWT signing secret
- `GEMINI_API_KEY`: Gemini API key for text generation
- `GEMINI_TEXT_MODEL`: Gemini text model
- `POLLINATIONS_IMAGE_BASE_URL`: Pollinations image endpoint
- `POLLINATIONS_IMAGE_MODEL`: Pollinations model name
- `OAUTH_TOKEN_SECRET`: token encryption secret for connected accounts
- `OAUTH_REDIRECT_BASE_URL`: public backend URL for OAuth callbacks
- `ZERNIO_API_BASE_URL`, `ZERNIO_API_KEY`, and Zernio path variables
- `LINKEDIN_CLIENT_ID`, `X_CLIENT_ID`, `INSTAGRAM_CLIENT_ID`, `FACEBOOK_CLIENT_ID`

Frontend:

- `VITE_API_URL`: public backend API URL

## Build

```bash
npm run build
```

Workspace builds:

```bash
npm run build --workspace backend
npm run build --workspace frontend
```

## Deployment

See [docs/deployment.md](docs/deployment.md) for production deployment guidance.

## Documentation

- [Architecture](docs/architecture.md)
- [Database Schema](docs/database-schema.md)
- [Deployment](docs/deployment.md)
- [Roadmap](ROADMAP.md)

## Production Notes

- Use MongoDB Atlas in production.
- Set `NODE_ENV=production`.
- Use strong values for `JWT_SECRET` and `OAUTH_TOKEN_SECRET`.
- Configure `VITE_API_URL` to the deployed backend URL.
- Configure CORS origins in `backend/src/index.ts` for deployed frontend URLs.
- Store third-party API keys in your hosting provider secret manager.
