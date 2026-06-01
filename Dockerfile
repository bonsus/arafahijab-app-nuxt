# syntax=docker/dockerfile:1

# ---------- Stage 1: Dependencies ----------
FROM node:22-alpine AS deps
WORKDIR /app

# Install only what's needed to resolve dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# ---------- Stage 2: Build ----------
FROM node:22-alpine AS build
WORKDIR /app

# Reuse installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Nuxt/Nitro production output (.output)
ENV NODE_ENV=production
RUN npm run build

# ---------- Stage 3: Runner ----------
FROM node:22-alpine AS runner
WORKDIR /app

# Production runtime defaults
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000

# Run as the built-in non-root user for better security
USER node

# Only the self-contained Nitro server output is needed at runtime
COPY --chown=node:node --from=build /app/.output ./.output

EXPOSE 4000

# Nitro server entrypoint
CMD ["node", ".output/server/index.mjs"]
