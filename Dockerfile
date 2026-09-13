# syntax=docker/dockerfile:1

# ---- deps ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_WS_URL=
ARG NEXT_PUBLIC_WS_PATH=/ws-signal
ARG NEXT_PUBLIC_ICE_SERVERS=
ARG TARGET_PATH=
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_WS_PATH=$NEXT_PUBLIC_WS_PATH
ENV NEXT_PUBLIC_ICE_SERVERS=$NEXT_PUBLIC_ICE_SERVERS
ENV TARGET_PATH=$TARGET_PATH
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build && npm run build:server

# ---- run ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/server-dist ./server-dist

EXPOSE 3000 3001
# Runs both the Next.js app (3000) and the signaling server (3001).
CMD ["sh", "-c", "node server.js & node server-dist/server/index.js"]