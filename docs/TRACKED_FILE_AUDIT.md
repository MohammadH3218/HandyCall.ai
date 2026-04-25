# Tracked File Audit

Last updated: 2026-04-25

This is the repo cleanup manifest grouped by root area.

## Root
- `AGENTS.md`: replace
- `README.md`: replace
- `vercel.json`: keep
- `amplify.yml`: remove
- `_voice-ai/**`: remove

## packages/backend
- `src/**`: keep
- `fly.toml`: keep
- `.env.example`, `.env.local.example`: keep
- old EB deploy/docs/config files: remove

## packages/web
- `src/**`: keep
- `package.json`, `next.config.js`, `tailwind.config.ts`: keep
- `Dockerfile`, `deploy.sh`, `DEPLOYMENT.md`: remove
- removed stale duplicate/legacy files:
  - `src/app/dashboard/lead-inbox/page 2.tsx`
  - `src/components/providers/amplify-provider.tsx`
  - `src/constants/houston-marketplace.ts`
- renamed:
  - `src/constants/houston-areas.ts` -> `src/constants/riyadh-districts.ts`

## packages/shared
- shared contracts/utilities: keep
- audit types: keep

## apps/ios
- old `HandyCallApp` source: remove

## docs
- current truth docs: keep/replace
- removed historical archive folders that no longer help the current product

## scripts
- keep active setup, QA, OAuth, table, and ops scripts
- do not reintroduce deploy scripts for stale runtimes
