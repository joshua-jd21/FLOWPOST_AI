# Deployment Guide

This guide prepares PostPilot AI for a production deployment with a hosted frontend, hosted backend, and MongoDB Atlas.

## 1. MongoDB Atlas

1. Create a MongoDB Atlas project and cluster.
2. Create a database user with read/write access.
3. Add your backend hosting provider IPs to Network Access.
4. Copy the connection string into `MONGO_URI`.
5. Use a database name such as `postpilot`.

Example:

```bash
MONGO_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/postpilot
```

## 2. Backend Hosting

Suitable hosts include Render, Railway, Fly.io, Heroku-compatible platforms, or a VPS.

Build command:

```bash
npm install
npm run build --workspace backend
```

Start command:

```bash
npm run start --workspace backend
```

Required backend environment:

```bash
NODE_ENV=production
PORT=5000
MONGO_URI=...
JWT_SECRET=...
OAUTH_TOKEN_SECRET=...
GEMINI_API_KEY=...
ZERNIO_API_KEY=...
OAUTH_REDIRECT_BASE_URL=https://your-api.example.com
```

Set optional OAuth client IDs if you are not fully delegating connection flows to Zernio.

## 3. Frontend Hosting

Suitable hosts include Vercel, Netlify, Cloudflare Pages, or any static host.

Build command:

```bash
npm install
npm run build --workspace frontend
```

Output directory:

```bash
frontend/dist
```

Required frontend environment:

```bash
VITE_API_URL=https://your-api.example.com
```

## 4. CORS

Update `backend/src/index.ts` before production release so `allowedOrigins` includes the deployed frontend domain.

Examples:

- `https://postpilot.example.com`
- `https://postpilot-ai.vercel.app`

## 5. Cookies

Authentication uses HTTP-only JWT cookies. For cross-domain production deployment, configure cookie security in the auth service as needed:

- `secure: true`
- `sameSite: 'none'` for cross-site frontend/backend domains
- production domain settings if required by the host

## 6. Scheduled Work

The backend currently checks scheduled publishing and automation workflows on an interval inside the API process. For larger production usage, move these checks to a separate worker process.

## 7. Verification Checklist

- Backend `/health` returns `status: ok`.
- Frontend loads the landing page.
- Signup and login work with cookies.
- Dashboard protected routes redirect unauthenticated users.
- AI Studio can generate captions.
- Pollinations image generation displays thumbnails when requested.
- Scheduler can create and list posts.
- Connected Accounts page loads provider states.
- Content Copilot can create a campaign and store chat history.
- `npm run build --workspace backend` passes.
- `npm run build --workspace frontend` passes.
