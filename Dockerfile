# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json tsconfig.base.json ./

# Copy workspace packages
COPY server/package.json server/
COPY client/package.json client/

# Install dependencies
RUN npm ci

# Copy source files
COPY server/ server/
COPY client/ client/

# Build
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Copy built artifacts
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/client/package.json ./client/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/client/node_modules ./client/node_modules

USER appuser

EXPOSE 4000

CMD ["node", "server/dist/index.js"]
