# packages/web — Frontend Context

See repo root [CLAUDE.md](../../CLAUDE.md) for full project context.

## Deploy Rule (CRITICAL)
Run `vercel --prod --yes --archive=tgz` from the **repo root** (`/`), NOT from this directory.
- Vercel project: `handycall-web` — root `.vercel/project.json` already configured
- Running from here causes "path packages/web/packages/web does not exist" error

## Key Files
- `src/app/page.tsx` → imports `HomePageClient` — this is the landing page
- `src/components/marketing/pages/HomePageClient.tsx` — main landing page component
- `src/types/shared.ts` — local replacement for `@handycall/shared` (not on npm)
- `src/constants/houston-areas.ts` — Riyadh districts (misnamed file, correct content)
- `next.config.js` — do NOT add `outputFileTracingRoot` — breaks Vercel build

## Import Rules
- Never import from `@handycall/shared` — use `@/types/shared` instead
- `@handycall/shared` is not published to npm and will fail at Vercel build time
