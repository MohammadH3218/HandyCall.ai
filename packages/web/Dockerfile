# Multi-stage Dockerfile for HandyCall Web (Next.js)
# Monorepo-aware build that includes @handycall/shared

FROM node:20-alpine AS shared-builder

WORKDIR /build

COPY tsconfig.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src

WORKDIR /build/packages/shared
RUN npm install --no-audit --no-fund
RUN npm run build

FROM node:20-alpine AS web-builder

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /build

COPY package*.json ./
COPY packages/web/package*.json ./packages/web/
COPY packages/web/next.config.js ./packages/web/
COPY packages/web/postcss.config.js ./packages/web/
COPY packages/web/tailwind.config.ts ./packages/web/
COPY packages/web/tsconfig.json ./packages/web/
COPY packages/web/src ./packages/web/src
COPY packages/web/public ./packages/web/public

COPY --from=shared-builder /build/packages/shared ./packages/shared

WORKDIR /build/packages/web
RUN npm install --no-audit --no-fund
RUN npm run build

FROM web-builder AS runtime

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /build/packages/web

EXPOSE 3001
CMD ["npm", "run", "start"]
