FROM oven/bun:1 AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile


FROM oven/bun:1 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars required by next.config.ts → lib/env.ts validation.
# Pass these via: docker build --build-arg GOOGLE_GENERATIVE_API_KEY=... etc.
ARG GOOGLE_GENERATIVE_API_KEY
ARG GOOGLE_MAPS_API_KEY
ARG FLIGHT_API_KEY

ENV GOOGLE_GENERATIVE_API_KEY=$GOOGLE_GENERATIVE_API_KEY
ENV GOOGLE_MAPS_API_KEY=$GOOGLE_MAPS_API_KEY
ENV FLIGHT_API_KEY=$FLIGHT_API_KEY
ENV NODE_ENV=production

RUN bun run build


FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["bun", "server.js"]
