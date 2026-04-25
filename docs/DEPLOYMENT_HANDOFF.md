# Deployment Handoff

Last updated: 2026-04-25

## Source Of Truth
- GitHub remote: `origin`
- branch: `master`
- web runtime: Vercel
- API runtime: Fly.io

## Web Deploy
Vercel reads the repo-root `vercel.json`.

Build flow:
1. install workspace dependencies
2. build `packages/shared`
3. build `packages/web`

## API Deploy
Fly.io reads `packages/backend/fly.toml`.

Typical deploy command:
```bash
fly deploy --config packages/backend/fly.toml --app handycall-api
```

Health check:
```bash
curl https://api.handycall.org/api/v1/health
```

## Required Checks Before Deploy
```bash
npm run -w packages/shared build
npm run -w packages/backend build
npm run -w packages/web build
```

## Security Notes
- Do not deploy from stale feature branches.
- Keep secrets in Vercel/Fly managed env or secret stores.
- Keep webhook secrets and rate-limit settings synchronized with the running backend environment.
