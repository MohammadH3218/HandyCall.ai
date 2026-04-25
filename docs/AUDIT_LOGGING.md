# Audit Logging

Last updated: 2026-04-25

## Policy
Audit logs are metadata-only by default.

## Must Log
- auth success/failure and recovery flows
- admin actions
- payment intent and webhook outcomes
- pro onboarding/profile/service changes
- rate-limit denials
- forbidden access attempts
- invalid webhook signatures
- rejected uploads

## Must Not Log
- message bodies
- raw webhook payloads
- raw document contents
- secrets, passwords, or tokens
- unrestricted freeform search text

## Event Shape
Use the shared audit types in `packages/shared/src/types/audit.ts`.

Key fields:
- `event_id`
- `occurred_at`
- `company_id`
- `category`
- `severity`
- `outcome`
- `action`
- `route`
- `method`
- `request_id`
- `ip_address`
- `user_agent`
- `actor_type`
- `actor_id`
- `actor_email`
- `target_type`
- `target_id`
- `metadata`

## Admin UI
- route: `/admin/logs`
- filters: company, actor email, actor type, category, severity, outcome, request ID, target type, date range
- detail view: structured metadata only
