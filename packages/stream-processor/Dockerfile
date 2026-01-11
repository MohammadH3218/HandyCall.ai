FROM public.ecr.aws/docker/library/node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

COPY dist ./dist

ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
