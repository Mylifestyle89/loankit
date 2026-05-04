# syntax=docker/dockerfile:1.7
# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Prisma + better-sqlite3 native deps on Alpine
RUN apk add --no-cache openssl libc6-compat python3 make g++

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci

RUN npx prisma generate

COPY . .

RUN npm run build

# Runtime stage — minimal, non-root
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache openssl libc6-compat wget

# Standalone server output (already includes minimal node_modules)
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/prisma ./prisma

# Writable data dir owned by node user (UID 1000)
RUN mkdir -p /app/data && chown node:node /app/data

USER node

EXPOSE 3000

# Healthcheck overridable via docker-compose
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
