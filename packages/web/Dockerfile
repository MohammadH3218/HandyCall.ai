FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src
COPY packages/web/package*.json ./packages/web/
COPY packages/web/next.config.js ./packages/web/
COPY packages/web/next-env.d.ts ./packages/web/
COPY packages/web/tsconfig.json ./packages/web/
COPY packages/web/postcss.config.js ./packages/web/
COPY packages/web/tailwind.config.ts ./packages/web/
COPY packages/web/public ./packages/web/public
COPY packages/web/src ./packages/web/src

RUN npm install --workspace packages/shared --workspace packages/web --include-workspace-root --no-audit --no-fund
RUN npm run build -w packages/shared
RUN npm run build -w packages/web

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/web ./packages/web

WORKDIR /app/packages/web

EXPOSE 3001

CMD ["npm", "run", "start"]
