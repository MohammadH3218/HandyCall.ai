# HandyCall

HandyCall is a Riyadh-focused home-services marketplace with consumer discovery, pro onboarding and profile management, customer booking/payment flows, and an admin control surface.

## Current Architecture
- `packages/backend`: NestJS API backed by DynamoDB and S3
- `packages/web`: Next.js frontend for marketplace, pro, customer, and admin flows
- `packages/shared`: shared contracts and validation helpers
- `packages/widget`: widget package placeholder

## Production Runtime
- Web: Vercel
- API: Fly.io
- Domains:
  - `handycall.org`
  - `www.handycall.org`
  - `admin.handycall.org`
  - `api.handycall.org`

## Product Areas
- consumer marketplace: homepage, categories, search, provider profiles, requests
- pro dashboard: onboarding, profile, inbox, requests, payouts/payments
- customer dashboard: requests, bookings, inbox, payments
- admin dashboard: approvals, platform settings, subscriptions, usage, audit logs

## Read First
- `AGENTS.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/SECURITY_BASELINE.md`
- `docs/AUDIT_LOGGING.md`
- `docs/reference/PROJECT_CONTEXT.md`

## Local Development
```bash
npm install
npm run local:start
npm run dev
```

Individual commands:
```bash
npm run shared:build
npm run backend:dev
npm run web:dev
```

## Validation
```bash
npm run -w packages/shared build
npm run -w packages/backend build
npm run -w packages/web build
```

## Notes
- `master` is the deployable truth branch.
- The legacy `_voice-ai/` subtree is no longer part of the active product path.
- Stale EB/Amplify deployment artifacts have been removed from the primary repo path.
