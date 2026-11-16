# syntax=docker/dockerfile:1

FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --config.strict-dep-builds=false

FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build && pnpm prune --prod --config.strict-dep-builds=false

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8000
RUN addgroup -S ripples && adduser -S ripples -G ripples
COPY --from=build --chown=ripples:ripples /app/package.json ./
COPY --from=build --chown=ripples:ripples /app/node_modules ./node_modules
COPY --from=build --chown=ripples:ripples /app/dist ./dist
USER ripples
EXPOSE 8000
CMD ["node", "dist/main.js"]
