# FlowPost AI

A unified social media management platform — captions, images, scheduling, and publishing in one dashboard.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4
- **Backend:** Node.js + Express + TypeScript
- **Database:** MongoDB + Mongoose
- **Auth:** JWT (access + refresh tokens) + bcrypt
- **APIs:** Google Gemini, Pollinations AI, Cloudinary, Zernio

## Architecture

```
flowpost-ai/
├── server/                    # Express API server
│   └── src/
│       ├── config/            # App config & DB connection
│       ├── controllers/       # Route handlers
│       ├── middleware/        # Auth, error handling, logging
│       ├── models/            # Mongoose schemas (User, Post, Schedule, ConnectedAccount)
│       ├── routes/            # API route definitions (/api/v1/*)
│       ├── services/          # Business logic layer
│       ├── utils/             # Token generation, helpers
│       └── validators/        # Zod request schemas
├── client/                    # React SPA
│   └── src/
│       ├── api/               # Axios client with auth interceptor
│       ├── components/ui/     # Reusable UI components (Button, Input, Card, Loading)
│       ├── context/           # Auth context + provider
│       └── pages/             # Login, Register, Dashboard
├── .github/workflows/         # CI pipeline
├── Dockerfile                 # Multi-stage production build
└── docker-compose.yml         # Local dev with MongoDB
```

## Getting Started

### Prerequisites

- Node.js 22+
- MongoDB 7+ (or Docker)

### Installation

```bash
# Clone the repo
git clone <repo-url>
cd flowpost-ai

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your values

# Start development servers
npm run dev
```

The API server runs on `http://localhost:4000` and the frontend on `http://localhost:5173`.

### Docker

```bash
docker compose up -d
```

## API Endpoints

| Method | Path                     | Auth     | Description         |
|--------|--------------------------|----------|---------------------|
| POST   | /api/v1/auth/register    | No       | Register new user   |
| POST   | /api/v1/auth/login       | No       | Login               |
| POST   | /api/v1/auth/refresh     | No       | Refresh tokens      |
| POST   | /api/v1/auth/logout      | Yes      | Logout              |
| GET    | /api/v1/auth/profile     | Yes      | Get user profile    |
| GET    | /api/health              | No       | Health check        |

## License

Private — FlowPost AI