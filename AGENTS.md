# AGENTS.md

## Purpose
This file is the fast context handoff for coding agents working in this repo.

## Snapshot (2026-03-10)
- Repo: `HandyCall.ai`
- Branch: `master`
- Architecture: monorepo (`packages/backend`, `packages/web`, `packages/shared`, `apps/ios`, `packages/widget`)
- Production hosting: backend and web are both Docker apps on AWS Elastic Beanstalk in `us-east-1`
- Pricing migration in progress: weekly -> monthly
- Large feature wave in progress: Stripe Connect payments, dashboard redesign, notifications, usage gating, settings wiring, differentiators
- Worktree may be intentionally dirty during implementation; do not revert unrelated local changes

## Product Context
HandyCall is a multi-tenant AI receptionist SaaS for local service businesses.
Key domains:
- telephony (calls/SMS)
- appointments/bookings
- contacts/leads
- notifications
- billing/subscriptions/usage
- CRM/webhooks
- customer payments (Stripe Connect)

## Current Implementation Focus
1. Monthly subscription pricing and limits
2. Stripe Connect onboarding + customer payments
3. Dashboard redesign to business metrics
4. Web + iOS notification UX improvements
5. Hard usage-limit enforcement for AI handling
6. Settings reliability (call modes, transfer, CRM)
7. Differentiators (follow-up sequences, review automation, widget)

## Critical Guardrails
- Multi-tenant isolation: always scope by `company_id`
- Plan-based access: gate restricted functionality by plan features
- Keep shared types/constants in sync with backend + web + iOS
- Keep pricing labels and usage periods consistent (`monthly`, not `weekly`)
- Never hardcode secrets in code or docs

## Where To Start
- Backend billing: `packages/backend/src/modules/billing/`
- Dashboard API: `packages/backend/src/modules/dashboard/`
- Notifications API: `packages/backend/src/modules/notifications/`
- Public booking/payments: `packages/backend/src/modules/public-booking/`
- Web dashboard: `packages/web/src/app/dashboard/`
- Web pricing: `packages/web/src/app/pricing/page.jsx`
- Shared domain/types: `packages/shared/src/types/domain.ts`
- Shared constants: `packages/shared/src/utils/constants.ts`

## Deployment Paths
- GitHub remote: `origin` -> `https://github.com/MohammadH3218/HandyCall.ai.git`
- Local dev remote: `local` -> `https://github.com/MohammadH3218/local.git`
- Branch policy:
  - Use `local` remote for local-development feature branches
  - Use `origin/master` for cloud/production-level deployment flow
- Backend Docker/EB scripts:
  - `packages/backend/deploy.sh` (bash)
  - `packages/backend/deploy-docker-eb.ps1` (PowerShell)
- Web Docker/EB scripts:
  - `packages/web/deploy.sh` (bash)
- Live AWS deployment targets:
  - Backend app/env: `handycall-api` / `handycall-api-lb`
  - Backend ECR repo: `handycall-backend`
  - Web app/env: `handycall-web` / `handycall-web-lb`
  - Web ECR repo: `handycall-web`
  - AWS account: `982081079378`
  - Region: `us-east-1`
- DNS:
  - `handycall.org` and `www.handycall.org` alias to the Elastic Beanstalk load balancer for `handycall-web-lb`
- Web runtime facts:
  - `packages/web/Dockerfile` exposes port `3001`
  - EB health check path is `/`
  - EB target process listens on port `80` and proxies to the container
- Legacy note:
  - `amplify.yml` still exists in the repo, but the live web app is deployed via Elastic Beanstalk, not Amplify
- Prereqs:
  - Docker running
  - AWS CLI authenticated
  - ECR + Elastic Beanstalk permissions

## Recommended Agent Workflow
1. Read `docs/IMPLEMENTATION_STATUS.md`
2. Check `git status` and avoid reverting unrelated work
3. Make smallest cohesive changes per area (shared -> backend -> web/iOS)
4. Run targeted validation before push
5. Update docs when feature behavior or deployment flow changes

---

## Marketing Surface — Saudi Arabia Marketplace Pivot (2026-03)

### Context
The public-facing homepage (`handycall.org/`) has been repositioned from a US-focused AI SaaS landing page to a **Saudi Arabia home services marketplace** (Thumbtack/TaskRabbit model). The backend, dashboard, auth, and billing are unchanged. The pivot is frontend-only.

### Audience Duality
- **Consumer**: Homeowners searching for service pros. Entry at `/`.
- **Pro**: Service professionals signing up. Entry at `/register?audience=pro`.

### New/Changed Marketing Files
| File | Change |
|------|--------|
| `packages/web/src/app/page.tsx` | Full marketplace homepage (9 sections, Saudi-specific) |
| `packages/web/src/components/marketing/site-header.tsx` | Consumer-first nav (Find Services, Categories, How It Works, For Pros pill, Find a Pro CTA) |
| `packages/web/src/components/marketing/site-footer.tsx` | 4-column dark `bg-slate-900` footer with bilingual links |
| `packages/web/src/components/marketing/ProductPreview.tsx` | Marketplace UI mockup (Search Results / Provider Profile / Booking Confirmed tabs) |
| `packages/web/src/components/marketing/SearchBar.tsx` | NEW: service + Saudi city search bar |
| `packages/web/src/components/marketing/CategoryCard.tsx` | NEW: bilingual category grid card |
| `packages/web/src/components/marketing/ProviderCard.tsx` | NEW: pro profile card with SAR pricing |
| `packages/web/src/app/categories/page.tsx` | NEW: browse all categories page |
| `packages/web/src/app/search/page.tsx` | NEW: search results stub page |

### Bilingual Policy
All consumer-facing copy is English-primary with Arabic subtitle/label inline.
Arabic text uses `dir="rtl" lang="ar"` on the element + Arabic system font fallback.
No separate `/ar` route. No `lang` change on `<html>`. Decorative/supplemental at this stage.

### Saudi Context
- Target cities: Riyadh, Jeddah, Dammam, Khobar, Mecca, Medina, Abha
- Currency: SAR (ريال)
- Key services: AC Repair (critical in Saudi heat), Plumbing, Electrical, Cleaning, Painting, Carpentry, Pest Control, Landscaping
- Business week: Sunday–Thursday (Fri–Sat weekend)

### Do NOT Change
- `/dashboard/*` routes (pro business OS)
- `/login`, `/register` (auth flows — separate issue)
- `/admin/*`
- Voice bridge, Twilio, OpenAI integrations
- Stripe billing logic
- `packages/backend/`

---

## Icon Policy — Marketing Surface

### Single Icon Library: `@tabler/icons-react` (v3.37.1)
All icons across marketing pages **must** come from `@tabler/icons-react`. Do not add a second icon package. Tabler is the same library browsable at [icones.js.org/collection/tabler](https://icones.js.org/collection/tabler).

### No Emoji as Icons
Emoji are **banned** as UI icons on marketing pages. Use a proper Tabler SVG component instead (e.g. `IconSearch`, `IconBolt`). Emoji in visible body copy (e.g. reviews, testimonials) are fine.

### Category Icon Map
`packages/web/src/lib/category-icons.tsx` is the single source of truth for service-category icon configs:
- Exports `CategoryIconSlug` union type (all valid slugs)
- Exports `CATEGORY_ICON_MAP: Record<CategoryIconSlug, { Icon, bg, color }>` — colored Tabler icon per category
- `CategoryCard` resolves its icon via `CATEGORY_ICON_MAP[slug]`
- `home-services.ts` `ServiceGroup` type uses `iconSlug: CategoryIconSlug` (not `emoji: string`)

### Adding a New Category
1. Add the slug to the `CategoryIconSlug` union in `category-icons.tsx`
2. Add a matching entry in `CATEGORY_ICON_MAP` (pick a Tabler icon + bg/color pair)
3. Add `iconSlug: 'your-slug'` to the `ServiceGroup` entry in `home-services.ts`

### Recommended Usage
```tsx
import { IconSearch } from '@tabler/icons-react';
// ...
<IconSearch className="h-5 w-5 text-slate-500" stroke={1.8} />
```
Standard stroke weight for marketing UI: **1.8**. Use **2** for small inline icons (≤14 px).
