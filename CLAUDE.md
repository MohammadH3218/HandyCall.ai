# AGENTS.md — HandyCall Coding Agent Context

> **Single source of truth for every coding agent working in this repo.**
> This applies to Claude Code, Codex, Cursor, Copilot, Devin, and any other agent.
> Update this file when the product, infra, or deploy process changes.

---

## ⚠️ GOLDEN RULES — READ BEFORE TOUCHING ANYTHING

### 1. Git first, deploy second — always

Cloud-based agents (Codex, Devin, etc.) run in **ephemeral containers** destroyed at session end.
If you deploy to Vercel/Fly.io without first pushing to GitHub, your changes exist only in that
temporary container. When the container dies, the changes are gone forever. The next agent clones
the repo, sees the old code, deploys it, and silently overwrites your work. **This has happened
multiple times in this project and caused significant regressions.**

**Required workflow every time:**
```bash
# 1. Make changes
# 2. Commit
git add <specific files — never git add -A blindly>
git commit -m "descriptive message"
# 3. Push to GitHub FIRST
git push origin master
# 4. Only then deploy
vercel --prod --yes --archive=tgz          # frontend
flyctl deploy --config packages/backend/fly.toml --dockerfile packages/backend/Dockerfile  # backend
```

**Before any deploy, confirm the working tree is clean:**
```bash
git status   # must show "nothing to commit"
git log origin/master..HEAD  # must show 0 unpushed commits
```

### 2. Pull before you start

Always sync with GitHub before making changes. Remote may have commits you don't have locally.
```bash
git pull origin master
```

### 3. Read before editing

Read the file before modifying it. Never guess at existing structure.

### 4. Commit specific files, not everything

Never `git add -A` or `git add .` — check `git status` first and add only relevant files.
Do not commit `.env`, credentials, build artifacts, or large binaries.

---

## What This Is

**HandyCall** is a Saudi Arabian home services marketplace for Riyadh — similar to TaskRabbit or
Thumbtack. Customers browse and book verified home service pros (electricians, plumbers, HVAC,
cleaners, etc.) by district and service category.

**This is NOT an AI receptionist or SaaS product.** All old references to telephony, Stripe, Twilio,
Cognito, and multi-tenant billing are dead/deleted. Do not restore them.

---

## Monorepo Structure

```
/
├── packages/
│   ├── backend/        NestJS API (auth, marketplace, bookings, etc.)
│   ├── web/            Next.js 14 frontend (handycall.org)
│   └── shared/         Shared TypeScript types (not published to npm)
├── docs/               Architecture docs (some outdated — this file takes precedence)
├── scripts/            DynamoDB table creation scripts
└── .vercel/            ← Root-level Vercel config (deploy from HERE, not packages/web/)
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 App Router, Tailwind CSS, Zustand |
| Backend | NestJS, DynamoDB, S3, SES (AWS SDK v3) |
| Auth | JWT (HS256) + bcrypt — NO Cognito |
| Hosting (web) | Vercel — project `handycall-web` |
| Hosting (backend) | Fly.io — app `handycall-api` |
| Database | DynamoDB (no SQL) |
| AI Search | OpenRouter (google/gemma-4-31b-it:free) |

---

## GitHub

- Remote: `origin`
- URL: `https://github.com/MohammadH3218/HandyCall.ai.git`
- Main branch: `master`
- **Always `git push origin master` before deploying.**

---

## Deployment — Frontend (Vercel)

**Live URL:** https://handycall.org  
**Project:** `handycall-web` (`prj_5IrGAUkCxco7n6aE2RbeVNJADBlO`)

```bash
# Run from repo ROOT /  (not packages/web/)
vercel --prod --yes --archive=tgz
```

- Root `.vercel/project.json` already points to the correct project — do not change it
- `--archive=tgz` required — bypasses Vercel's hash deduplication cache
- Running from inside `packages/web/` causes path doubling and breaks the build

**Verify:** `curl -I https://handycall.org`

---

## Deployment — Backend (Fly.io)

**Live URL:** https://handycall-api.fly.dev  
**App:** `handycall-api` | **Region:** `iad`

```bash
# Run from repo ROOT /  (not packages/backend/)
flyctl deploy --config packages/backend/fly.toml --dockerfile packages/backend/Dockerfile
```

- Dockerfile uses monorepo-relative paths (`packages/backend/src`, `packages/shared/src`)
- Build context must be the repo root for these to resolve
- Manage secrets: `flyctl secrets set KEY=value --config packages/backend/fly.toml`

**Verify:** `curl https://handycall-api.fly.dev/api/v1/health`

---

## Shared Types

`@handycall/shared` is **not published to npm**. Never add it to any `package.json`.

- In the web package: import from `@/types/shared` → `packages/web/src/types/shared.ts`
- `packages/shared/` is used only at backend Docker build time
- Direct imports in Next.js will fail at Vercel build time

---

## Backend Modules (all active)

```
packages/backend/src/modules/
├── auth/               JWT+bcrypt auth, two user types (CUSTOMER, PRO)
├── customers/          Customer profiles, PDPL deletion
├── pros/               Pro profiles, onboarding steps 2-5
├── pro-services/       Service listings (SAR prices stored as Halalas)
├── bookings/           Booking lifecycle, VAT/platform fee calcs
├── reviews/            Customer reviews, pro replies, rating rollup
├── email/              SES wrapper + all transactional templates
├── payments/           Stub — HyperPay/Moyasar integration pending
├── admin/              Pro approval queue, platform config
├── dashboard/          Stats for customers, pros, and admin
├── marketplace/        Browse/search (public) — AI search via OpenRouter
├── portal-messaging/   Pro↔customer in-app messaging (SSE)
└── quote-requests/     Customer quote request flow
```

---

## Saudi-Specific Rules

- **Phone numbers**: `+9665XXXXXXXX` only (`/^\+9665\d{8}$/`)
- **National ID / Iqama**: 10 digits (`/^\d{10}$/`)
- **IBAN**: `/^SA\d{22}$/`
- **Currency**: SAR — stored in **Halalas** (1 SAR = 100 Halalas). Always `Math.round()`, never floats.
- **VAT**: 15% | **Platform fee**: 15%
- **PDPL consent**: required on registration — reject `pdpl_consent: false`
- **User types**: `CUSTOMER` | `PRO` (JWT: `{ user_id, user_type, email }`)

---

## Frontend Key Paths

```
packages/web/src/
├── app/
│   ├── page.tsx                        Landing page
│   ├── admin/                          Admin dashboard
│   ├── pros/[id]/                      Public pro profile
│   │   ├── page.tsx
│   │   └── ProProfileClient.tsx        → calls apiClient.getProviderById() → GET /pros/:id
│   ├── search/                         Search results
│   ├── customer/dashboard/             Customer dashboard
│   ├── pro/dashboard/                  Pro dashboard
│   ├── onboarding/                     Pro onboarding
│   └── api/proxy/[...path]/route.ts   Next.js proxy to backend (PUBLIC_PATHS list)
├── components/marketing/
│   ├── pages/SearchPageClient.tsx      Search results + filter sidebar
│   ├── pages/HomePageClient.tsx        Landing page
│   ├── SearchBar.tsx
│   └── site-header.tsx / site-footer.tsx
├── lib/
│   └── api-client.ts                   All backend API calls
├── constants/
│   ├── houston-areas.ts                Riyadh district data (misnamed, content is correct)
│   └── home-services.ts
└── types/shared.ts                     Local copy of shared types
```

### Proxy public paths
`packages/web/src/app/api/proxy/[...path]/route.ts` has a `PUBLIC_PATHS` array.
Any backend route accessible without auth must be listed there. Currently includes:
`marketplace/search`, `marketplace/services`, `marketplace/filters`, `pros/`, `reviews/pro/`, all `auth/` routes.

---

## AI-Powered Search

Two sequential OpenRouter LLM calls in `marketplace.service.ts`:

1. **`classifyQuery(q)`** — classifies query into a `ServiceCategory` + extracts keywords  
2. **`matchServicesToQuery(q, allServices)`** — semantically matches the query against all specific
   services listed by active pros (e.g. "I have a leak in my sprinkler system" → "Sprinkler Leak
   Detection & Repair")

Both use `google/gemma-4-31b-it:free`. Requires `OPENROUTER_API_KEY` env var. Fails gracefully.

Search results return `_matchedServices` (green chips on card) and `_matchType` (`specific` | `category`).

---

## Common Pitfalls

1. **Deploy from root only** — `vercel` from `packages/web/` and `flyctl` from `packages/backend/`
   both cause path errors. Always deploy from `/`.

2. **Wrong Vercel project** — There are two projects: `web` and `handycall-web`. Only `handycall-web`
   serves `handycall.org`. Root `.vercel/project.json` is correct; do not change it.

3. **`@handycall/shared` in Next.js** — Will fail at Vercel build time. Use `@/types/shared`.

4. **`outputFileTracingRoot` in next.config.js** — Must NOT be set; causes doubled path on Vercel.

5. **Halala math** — Always `Math.round()`. Never store floats for prices.

6. **Dead route** — `/marketplace/provider-by-id/:id` is deleted. Pro profiles are at `/pros/:id`.
   `apiClient.getProviderById()` must call `/pros/:id`.

7. **Diverged branches** — Always `git pull origin master` before starting work.
   If local and remote have diverged, use `git pull --rebase origin master` and resolve conflicts.
   Never force-push without explicit instruction.
