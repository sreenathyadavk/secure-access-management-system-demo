# Secure Access Management System - Production Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
RUN apk add --no-cache openssl

# Install all dependencies (including devDependencies for Prisma CLI)
COPY package.json package-lock.json ./
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# Copy application code
COPY src ./src
COPY public ./public

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

# Copy generated Prisma client and node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Fix permissions
RUN chown -R appuser:nodejs /app

# Switch to app user
USER appuser

EXPOSE 3000

# Run migrations and start application
CMD ["sh", "-c", "npx prisma migrate deploy && node src/app.js"]