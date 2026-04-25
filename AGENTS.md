# AGENTS.md

## Purpose
This file is the fast context handoff for coding agents working in this repo.

## Snapshot (2026-04-25)
- Repo: `HandyCall.ai`
- Truth branch: `master`
- Architecture: monorepo (`packages/backend`, `packages/web`, `packages/shared`, `packages/widget`)
- Production hosting:
  - web: Vercel
  - API: Fly.io
- Product: Riyadh home-services marketplace with consumer, pro, customer, and admin surfaces

## Product Context
HandyCall is a Saudi-focused marketplace for home services.

Primary surfaces:
- consumer marketplace search and provider discovery
- pro onboarding, profile, requests, inbox, and payments
- customer bookings, requests, inbox, and payments
- admin approvals, settings, subscriptions, usage, and logs

## Critical Guardrails
- `master` is the only deployable truth branch.
- Never assume AWS Elastic Beanstalk or Amplify is the active deployment path.
- Multi-tenant isolation matters: always scope data by `company_id` where applicable.
- Keep shared contracts in sync across `packages/shared`, backend, and web.
- Never hardcode secrets in code or docs.
- Audit logs are metadata-only by default.

## Security Requirements
- New backend routes must use an intentional rate-limit policy.
- Admin endpoints must explicitly enforce admin roles.
- Webhooks must verify signatures against the raw request body and reject replays.
- Uploads must use MIME, size, and file-count allowlists.
- Security-sensitive actions must emit audit-log events.
- Public web proxy paths must stay intentionally minimal and map to real backend routes.

## Audit Logging Requirements
Always log:
- auth success/failure and recovery flows
- admin mutations
- payment intent and webhook outcomes
- pro onboarding/profile/service changes
- rate-limit denials and forbidden access

Never log:
- message bodies
- raw webhook payloads
- secrets, tokens, or passwords
- unrestricted freeform search text

## Deployment Truth
- GitHub remote: `origin`
- Vercel config: `vercel.json`
- Fly config: `packages/backend/fly.toml`
- Production domains:
  - `handycall.org`
  - `www.handycall.org`
  - `admin.handycall.org`
  - `api.handycall.org`

## Recommended Workflow
1. Read `docs/IMPLEMENTATION_STATUS.md`.
2. Check `git status` and avoid reverting unrelated work.
3. Make cohesive changes in this order when possible: `shared` -> `backend` -> `web`.
4. Run targeted validation before push.
5. Update docs whenever security, deployment, logging, or route exposure changes.

## UI/Content Rules
- Use Riyadh/Saudi terminology, not Houston or generic US placeholders.
- Keep consumer-facing copy English-primary with inline Arabic support.
- Prefer `@tabler/icons-react` for icons in the active web product.
