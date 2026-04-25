# Implementation Status

Last updated: 2026-04-25

## Current Product Truth
- HandyCall is a Riyadh home-services marketplace.
- `master` is the deployable truth branch.
- Production runtime:
  - web on Vercel
  - API on Fly.io

## Cleanup Program
Completed:
- removed legacy `_voice-ai/` subtree from the active repo path
- removed duplicate and obviously stale marketplace/UI files
- renamed Houston-specific district constants to Riyadh-specific naming
- removed stale AWS EB / Amplify deployment artifacts from the active deploy path
- tightened `.gitignore` for local agent, Vercel, and Xcode user-state clutter

In progress:
- broader archived-doc consistency cleanup
- a few remaining product-copy updates in older surfaces

## Security Baseline Status
Completed:
- request ID propagation
- security headers in backend bootstrap
- route-level rate limiting with named policies
- admin role enforcement
- admin company-override auditing
- webhook signature verification and replay protection
- proxy allowlist cleanup

Needs follow-up:
- platform-level WAF / firewall settings in Vercel and Fly
- secret rotation if any tracked exposure is found outside example files

## Audit Logging Status
Completed:
- shared audit event types
- backend audit-log module and admin log APIs
- auth, admin, payments, rate-limit, and profile/security event logging
- admin logs UI page

Needs follow-up:
- broader event coverage across older dashboard paths
- retention/export review

## Deployment Truth
- web deploy path: Vercel via `vercel.json`
- API deploy path: Fly.io via `packages/backend/fly.toml`
- historical AWS docs remain archived only

## Validation
```bash
npm run -w packages/shared build
npm run -w packages/backend build
npm run -w packages/web build
```
