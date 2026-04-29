# Moyasar Pro Billing

HandyCall Pro billing uses Moyasar for prepaid Pro credit purchases. Pros buy credits in SAR, lead fees debit that credit balance, and optional auto recharge uses a saved Moyasar token.

## Runtime Config

Backend environment variables:

- `MOYASAR_PUBLISHABLE_KEY`: test or live publishable key returned to authenticated Pro billing UI.
- `MOYASAR_SECRET_KEY`: secret key used only by the backend for Moyasar REST API calls.
- `PAYMENTS_WEBHOOK_SECRET`: shared webhook secret registered in Moyasar Dashboard/API.
- `BACKEND_PUBLIC_URL`: public API prefix, for example `https://handycall-api.fly.dev/api/v1`.

Never commit live or test key values.

## Flow

1. `POST /billing/credits/top-up` prepares a local credit purchase invoice for at least SAR 20 and at most a SAR 5,000 credit balance.
2. The Pro billing page mounts Moyasar's embedded payment form inside HandyCall with card and enabled wallet methods.
3. Moyasar redirects back to `/pro/dashboard/billing`; the page verifies the returned payment id with the backend.
4. Moyasar also sends `payment_paid`, `payment_failed`, and `payment_refunded` webhooks to `/payments/webhook`.
5. Successful credit purchases create `pro_credit_transactions` ledger credits.
6. Lead-fee purchases debit the credit ledger when a Pro claims an open job or accepts a direct customer request.
7. Auto recharge charges the default saved Moyasar token when the credit balance reaches the configured threshold.
8. If Moyasar returns a source token, HandyCall stores only the token plus masked card metadata.

## Admin Surfaces

- `/admin/payments`: global lead-fee and invoice activity, with refund action for paid invoices.
- `/admin/pros/:id`: individual Pro billing summary, credit ledger, invoices, lead fees, and payment-method count.
- `/admin/logs`: metadata-only audit trail for credit top-up preparation, webhook processing, auto recharge, and refunds.

## Security Notes

- Moyasar secret keys stay backend-only.
- Payment details are collected by Moyasar's embedded form; HandyCall stores no raw card numbers or CVCs.
- Webhook replay protection uses `webhook_receipts`.
- Webhook payloads are not logged; audit entries keep metadata only.
