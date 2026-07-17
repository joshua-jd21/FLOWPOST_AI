# Architecture

PostPilot AI is a MERN-style TypeScript application split into a Vite frontend and an Express backend.

## High-Level Flow

1. The React frontend calls the backend API with `credentials: include`.
2. The backend authenticates users with JWT cookies through `auth.middleware.ts`.
3. Protected route modules call service-layer functions.
4. Services use Mongoose models when MongoDB is connected.
5. Development fallback arrays in `backend/src/config/db.ts` keep local workflows usable when MongoDB is unavailable.
6. AI and social integrations are isolated behind services so UI modules do not call third-party APIs directly.

## Frontend

Location: `frontend/src`

- `App.tsx`: public routes, protected dashboard routes, and route-level guards.
- `context/AuthContext.tsx`: session restoration, login state, logout.
- `components/dashboard`: dashboard shell, sidebar, and topbar.
- `pages`: public landing/demo/auth pages.
- `pages/dashboard`: protected product modules.
- `App.css`: premium dark SaaS visual system and responsive layout rules.

Key public routes:

- `/`: landing page
- `/demo`: demo mode with sample data
- `/login`
- `/signup`

Key protected routes:

- `/dashboard`
- `/dashboard/content-copilot`
- `/dashboard/onboarding`
- `/dashboard/ai-studio`
- `/dashboard/campaign-planner`
- `/dashboard/scheduled-posts`
- `/dashboard/connected-accounts`
- `/dashboard/automations`

## Backend

Location: `backend/src`

- `index.ts`: Express app, CORS, JSON parsing, route mounting, scheduled checks.
- `routes`: protected API route definitions.
- `controllers`: request validation and response handling.
- `services`: business logic and third-party integration orchestration.
- `models`: Mongoose schemas.
- `validators`: Zod request validation.
- `middleware/auth.middleware.ts`: JWT cookie protection.
- `utils/env.ts`: typed environment configuration.

## Service Boundaries

- `auth.service.ts`: registration, login, session identity.
- `ai.service.ts`: Gemini captions, Pollinations images, AI history.
- `campaign.service.ts`: campaign generation and idea conversion.
- `post.service.ts`: post CRUD, scheduling, and publishing.
- `social.service.ts`: connected accounts and Zernio publishing.
- `automation.service.ts`: AI automation workflows.
- `copilot.service.ts`: natural-language orchestration across modules.
- `analytics.service.ts`: MongoDB aggregation and insights.
- `brand-kit.service.ts`: brand identity and voice context.
- `competitor.service.ts`: competitor profiles and trend intelligence.

## External Integrations

- Gemini: AI caption, hashtag, CTA, and conversational response generation.
- Pollinations AI: free thumbnail/image generation fallback.
- Zernio: social account connection and social publishing automation.
- MongoDB Atlas: production persistence.

## Production Considerations

- Move scheduled publishing and automation checks to a dedicated worker for high scale.
- Add rate limiting and structured request logging.
- Use managed secrets for API keys and token encryption secrets.
- Lock CORS origins to deployed frontend domains.
- Add monitoring for failed AI, OAuth, and publishing operations.
