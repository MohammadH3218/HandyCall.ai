# CLAUDE.md — HandyCall Repo Context

> Fast context for Claude Code and any coding agent working in this repo.
> Keep this file up to date when the product or infra changes significantly.

---

## What This Is

**HandyCall** is a Saudi Arabian home services marketplace for Riyadh — similar to TaskRabbit or Thumbtack. Customers browse and book verified home service pros (electricians, plumbers, HVAC, cleaners, etc.) by district and service category.

**This is NOT an AI receptionist or SaaS product.** All old references to telephony, Stripe, Twilio, Cognito, and multi-tenant billing are dead/deleted.

---

## Monorepo Structure

```
/
├── packages/
│   ├── backend/        NestJS API (auth, marketplace, bookings, etc.)
│   ├── web/            Next.js 14 frontend (handycall.org)
│   └── shared/         Shared TypeScript types (not published to npm)
├── docs/               Architecture docs
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
| Hosting (backend) | Fly.io or AWS Elastic Beanstalk |
| Database | DynamoDB (no SQL) |

---

## Deployment Rules — CRITICAL

### Frontend (Vercel)
- **Always deploy from the repo ROOT**, not from `packages/web/`
- Vercel project `handycall-web` has `rootDirectory: packages/web` configured on Vercel's side
- Root `.vercel/project.json` → project `handycall-web` (`prj_5IrGAUkCxco7n6aE2RbeVNJADBlO`)
- Command: `vercel --prod --yes --archive=tgz` (run from `/`)
- `--archive=tgz` is required to bypass Vercel's hash deduplication cache
- **Never** deploy from inside `packages/web/` — it causes path doubling error

### Backend
- See `packages/backend/fly.toml` and `docs/DEPLOYMENT_HANDOFF.md`

---

## Shared Types — IMPORTANT

`@handycall/shared` is **not published to npm**. Never add it to `package.json`.

- For the web package: import types from `@/types/shared` (`packages/web/src/types/shared.ts`)
- The shared package at `packages/shared/` is used only for type reference — never imported at build time in web

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
├── marketplace/        Browse/search endpoints (public)
├── portal-messaging/   Pro↔customer in-app messaging (SSE)
└── quote-requests/     Customer quote request flow
```

---

## Saudi-Specific Rules

- **Phone numbers**: `+9665XXXXXXXX` format only (`/^\+9665\d{8}$/`)
- **National ID / Iqama**: 10 digits (`/^\d{10}$/`)
- **IBAN**: `/^SA\d{22}$/`
- **Currency**: SAR — prices stored in Halalas (1 SAR = 100 Halalas)
- **VAT**: 15% (`vat_rate = 0.15`)
- **Platform fee**: 15% (`platform_fee_rate = 0.15`)
- **PDPL consent**: required on registration — reject `pdpl_consent: false`
- **User types**: `CUSTOMER` | `PRO` (JWT payload: `{ user_id, user_type, email }`)

---

## Frontend Key Paths

```
packages/web/src/
├── app/
│   ├── page.tsx                    → HomePageClient (landing page)
│   ├── admin/                      Admin dashboard
│   ├── pros/[id]/                  Public pro profile page
│   ├── search/                     Search results
│   ├── categories/                 Category browser
│   ├── onboarding/                 Pro onboarding steps
│   └── ...
├── components/marketing/
│   ├── pages/HomePageClient.tsx    ← Main landing page component
│   ├── SearchBar.tsx
│   ├── site-header.tsx
│   └── site-footer.tsx
├── constants/
│   ├── houston-areas.ts            Riyadh district data (misnamed, but correct content)
│   ├── marketplace-service-categories.ts
│   └── home-services.ts
└── types/shared.ts                 Local copy of shared types
```

---

## Common Pitfalls

1. **Wrong Vercel project**: There are two projects — `web` and `handycall-web`. Only `handycall-web` serves `handycall.org`. Root `.vercel/project.json` already points to the correct one.

2. **Deploy from root**: Running `vercel` from `packages/web/` breaks because the project's `rootDirectory: packages/web` setting causes path doubling.

3. **`@handycall/shared` import**: Will fail at Vercel build time. Use `@/types/shared` instead.

4. **`outputFileTracingRoot` in next.config.js**: Must NOT be set — causes doubled path on Vercel's `/vercel/path0/` build environment.

5. **Halala math**: Always use `Math.round()` for Halala calculations. Never store floats.
