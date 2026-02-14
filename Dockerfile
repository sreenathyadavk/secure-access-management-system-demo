# Secure Access Management System - Production Dockerfile
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Prisma generate (needs schema)
FROM base AS prisma
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
RUN ./node_modules/.bin/prisma generate

# Production image
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

COPY --from=deps /app/node_modules ./node_modules
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
COPY package.json ./
COPY src ./src
COPY public ./public

USER appuser
EXPOSE 3000

# Run migrations then start (migrate deploy is idempotent)
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node src/app.js"]