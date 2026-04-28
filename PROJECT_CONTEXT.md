# PROJECT_CONTEXT.md

Last updated: 2026-04-28

## What This Is

**HandyCall is a Saudi Arabian home-services marketplace for Riyadh** — similar to Thumbtack or TaskRabbit. Customers browse and book verified home-service pros (electricians, plumbers, HVAC, cleaners, etc.) by district and service category.

**This is NOT an AI receptionist, SaaS calling tool, or telephony product.** All previous references to AI call handling, Twilio, Stripe, multi-tenant billing, or Cognito-based auth are dead and deleted from the codebase.

---

## Runtime Architecture

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 App Router, Tailwind CSS, Zustand |
| Backend | NestJS, DynamoDB, S3, SES (AWS SDK v3) |
| Auth | JWT (HS256) + bcrypt — no Cognito |
| Web hosting | Vercel (`handycall.org`) |
| API hosting | Fly.io (`api.handycall.org`) |
| Database | DynamoDB |

---

## Monorepo Structure

```
packages/
  backend/    NestJS API
  web/        Next.js 14 frontend
  shared/     Shared TypeScript types (not published to npm)
```

---

## Product Surfaces

- **Consumer**: landing page, category browser, district-based search, pro public profiles, quote requests
- **Pro**: registration, multi-step onboarding, marketplace profile, inbox, booking requests, payouts
- **Customer**: request flow, bookings, inbox, payments
- **Admin**: pro approval queue, platform config, audit logs

---

## Active Backend Modules

`auth` · `pros` · `pro-services` · `marketplace` · `bookings` · `reviews` · `customers` · `payments` · `dashboard` · `admin` · `email` · `portal-messaging` · `quote-requests`

---

## Saudi-Specific Rules

- Phone: `+9665XXXXXXXX`
- National ID / Iqama: 10 digits
- IBAN: `SA` + 22 digits
- Currency: SAR stored as Halalas (1 SAR = 100 Halalas)
- VAT: 15%
- Platform fee: 15%
- PDPL consent required on registration

---

## What Was Removed

The original prototype was an AI phone receptionist for handymen. That entire product direction was abandoned. The following are gone:
- Twilio / telephony integration
- Stripe billing
- AWS Cognito auth
- Multi-tenant SaaS model
- AI call handling / transcription

The current product is a pure marketplace with no AI features.
