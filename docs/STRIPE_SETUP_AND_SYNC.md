# Stripe Setup and Sync Runbook

This runbook covers:
- Monthly subscription pricing setup
- Stripe Connect setup (bank account onboarding)
- Booking-link customer payments
- Webhook sync so cancellations in Stripe update HandyCall automatically

## 1) Stripe Dashboard prerequisites

1. Open Stripe Dashboard (same account used by `STRIPE_SECRET_KEY`).
2. Go to `Connect` and complete `Get started`.
3. Confirm your account is in the same mode you are testing (`Sandbox` or `Live`).

If Connect is not enabled, account onboarding fails with:
`You can only create new accounts if you've signed up for Connect`.

## 2) Create monthly prices (Starter/Pro/Max)

Option A: create manually in Stripe Product Catalog.

Option B: use the repo script:

```bash
cd packages/backend
node scripts/setup-stripe-products.js
```

Set the returned IDs in backend environment:

- `STRIPE_PRICE_STARTER` (Starter $19.99/month)
- `STRIPE_PRICE_PRO` (Pro $39.99/month)
- `STRIPE_PRICE_MAX` (Max $99.99/month)

## 3) Required backend environment variables

Set these in Elastic Beanstalk app environment:

- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_MAX`
- `FRONTEND_URL` (example: `https://handycall.org`)

## 4) Webhooks (critical for status sync)

Create two webhook endpoints in Stripe:

1. Billing webhook:
- URL: `https://<backend-domain>/api/v1/billing/webhook`
- Events:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- Secret -> `STRIPE_WEBHOOK_SECRET`

2. Connect webhook:
- URL: `https://<backend-domain>/api/v1/billing/connect/webhook`
- Events:
  - `account.updated`
  - `payment_intent.succeeded`
  - `payment_intent.processing`
  - `payment_intent.payment_failed`
  - `payment_intent.canceled`
- Secret -> `STRIPE_CONNECT_WEBHOOK_SECRET`

## 5) Booking-link customer payments checklist

Company-level prerequisites:
- `stripe_connect_account_id` exists
- Connect account has:
  - `charges_enabled = true`
  - `details_submitted = true`
- `booking_payment_enabled = true`
- At least one active `booking_services[]` item with `amount_cents > 0`

Endpoint checks:
- `GET /api/v1/public/booking/:token/payment-info` should return `enabled: true`
- `POST /api/v1/public/booking/:token/pay` should return:
  - `client_secret`
  - `publishable_key`

## 6) Subscription sync behavior

Implemented backend behavior:
- Stripe webhook updates/deletes sync local company subscription state.
- Billing reads now reconcile with Stripe on-demand if local data is stale.
- Canceling a subscription in Stripe removes local active entitlement after sync/reconcile.

This is what keeps user portal and admin portal billing state aligned with Stripe.

## 7) Validation steps

1. Create a subscription in Stripe test mode.
2. Load `/dashboard/billing` and confirm:
- plan, status, period, and limits match monthly pricing.
3. Cancel in Stripe Dashboard.
4. Reload `/dashboard/billing` and `/admin/subscriptions`.
5. Confirm status reflects cancellation and access/entitlement updates as expected.

