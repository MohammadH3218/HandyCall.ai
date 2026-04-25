# Backend Deployment Guide

Last updated: 2026-04-21

## Live Production Target
- Platform: **Fly.io** (app: `handycall-api`)
- API URL: `https://handycall-api.fly.dev`
- Region: `iad` (Washington D.C.)

## One-Command Deploy
```bash
# From the monorepo root:
flyctl deploy --config packages/backend/fly.toml --dockerfile packages/backend/Dockerfile
```

> **Important:** Run from the repo root (`/HandyCall`), not from `packages/backend`. The Dockerfile uses monorepo-relative COPY paths (`packages/backend/src`, `packages/shared/src`) so the build context must be the repo root.

## Prerequisites
- Fly CLI: `brew install flyctl`
- Authenticated: `flyctl auth login`

## Verification
```bash
curl https://handycall-api.fly.dev/api/v1/health
```

## Config
- Runtime config lives in `fly.toml`
- Secrets (env vars not in fly.toml) are managed via: `flyctl secrets set KEY=value --config packages/backend/fly.toml`
