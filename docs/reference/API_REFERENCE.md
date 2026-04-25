# API_REFERENCE.md

Last updated: 2026-04-25

Base URL:
- local: `http://localhost:3000/api/v1`
- production: `https://api.handycall.org/api/v1`

This is a high-level route inventory.

## Auth
- `POST /auth/customer/register`
- `POST /auth/pro/register`
- `POST /auth/login`
- `POST /auth/oauth/exchange`
- `GET /auth/verify-email`
- `POST /auth/resend-confirmation`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/change-password`

## Marketplace And Pros
- `GET /marketplace/services`
- `GET /marketplace/filters`
- `GET /pros`
- `GET /pros/:pro_id`
- `GET /pros/me`
- `GET /pros/onboarding/status`
- onboarding writes under `/pros/onboarding/*`

## Customer Flows
- routes under `/customers`
- routes under `/bookings`
- routes under `/reviews`

## Payments
- `POST /payments/intent/:booking_id`
- `POST /payments/webhook`

## Admin
- routes under `/admin`
- admin audit-log routes under `/admin/logs`

## Security Notes
- public exposure must be mirrored intentionally in the web proxy allowlist
- new endpoints must receive a rate-limit policy
- sensitive endpoints should emit audit logs
