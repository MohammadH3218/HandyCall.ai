# Moyasar Pro Billing

HandyCall Pro billing uses Moyasar for monthly lead-fee balance collection.

## Runtime Config

Backend environment variables:

- `MOYASAR_PUBLISHABLE_KEY`: test or live publishable key returned to authenticated Pro billing UI.
- `MOYASAR_SECRET_KEY`: secret key used only by the backend for Moyasar REST API calls.
- `PAYMENTS_WEBHOOK_SECRET`: shared webhook secret registered in Moyasar Dashboard/API.
- `BACKEND_PUBLIC_URL`: public API prefix, for example `https://handycall-api.fly.dev/api/v1`.

Never commit live or test key values.

## Flow

1. Lead-fee transactions are recorded when a Pro claims an open job or accepts a direct customer request.
2. The Pro billing dashboard totals unpaid lead fees into the current balance.
3. `POST /billing/invoices/current` creates or reuses an open Moyasar invoice for that balance.
4. The Pro billing page mounts Moyasar's embedded card form with the invoice id and `credit_card.save_card`.
5. Moyasar redirects back to `/pro/dashboard/billing`; the page verifies the returned payment id with the backend.
6. Moyasar also sends `payment_paid`, `payment_failed`, and `payment_refunded` webhooks to `/payments/webhook`.
7. Successful payments mark the billing invoice and included lead-fee transactions paid.
8. If Moyasar returns a source token, HandyCall stores only the token plus masked card metadata for future balance payments.

## Admin Surfaces

- `/admin/payments`: global lead-fee and invoice activity, with refund action for paid invoices.
- `/admin/pros/:id`: individual Pro billing summary, recent invoices, balance, and payment-method count.
- `/admin/logs`: metadata-only audit trail for invoice creation, webhook processing, and refunds.

## Security Notes

- Moyasar secret keys stay backend-only.
- Card data is collected by Moyasar hosted checkout; HandyCall stores no raw card numbers or CVCs.
- Webhook replay protection uses `webhook_receipts`.
- Webhook payloads are not logged; audit entries keep metadata only.
