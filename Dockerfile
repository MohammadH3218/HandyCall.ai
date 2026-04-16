# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json ./
COPY tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

# Install all deps (workspaces link shared ↔ backend)
RUN npm install --workspaces --include-workspace-root

# Copy source
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend

# Build shared first (outputs to packages/shared/dist/)
RUN cd packages/shared && npm run build

# Build backend (NestJS → packages/backend/dist/)
RUN cd packages/backend && npm run build

# ─── Stage 2: Production image ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy workspace manifests
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

# Install production deps only
RUN npm install --workspaces --include-workspace-root --omit=dev

# Copy compiled output
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

EXPOSE 8080

CMD ["node", "packages/backend/dist/backend/src/main"]
