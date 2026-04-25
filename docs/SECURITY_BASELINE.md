# Security Baseline

Last updated: 2026-04-25

## Core Rules
- Every new backend route must have an intentional access model.
- Every abuse-prone route must have a named rate-limit policy.
- Admin actions must require explicit admin-role enforcement.
- Webhooks must verify signatures against raw request bodies.
- File uploads must use MIME, count, and size allowlists.
- Security-sensitive actions must emit audit logs.

## Route Classes
- `AUTH_LOGIN`
- `AUTH_REGISTER`
- `AUTH_VERIFY`
- `AUTH_REFRESH`
- `AUTH_RECOVERY`
- `MARKETPLACE_READ`
- `MARKETPLACE_SEARCH`
- `USER_WRITE`
- `USER_UPLOAD`
- `ADMIN_READ`
- `ADMIN_MUTATION`
- `WEBHOOK`

## Admin Access
- Use `@Roles(UserRole.ADMIN)` on admin controllers/routes.
- Do not trust `x-company-id` unless the authenticated session is admin.
- Log every admin mutation and every accepted/rejected company-context override.

## Webhooks
- Verify signatures using the raw request body.
- Fail closed when webhook secrets are missing.
- Store receipt IDs to prevent replay processing.
- Log invalid signatures, replays, and successful processing outcomes.

## Upload Safety
- Accept only known-safe MIME types.
- Enforce per-field file-size limits.
- Keep identity documents private.
- Do not use base64-in-JSON as a production upload path.

## AI / Prompt Injection
- Public marketplace search is not currently AI-backed.
- If AI search is added later:
  - run it server-side only
  - bound input size
  - use schema-constrained outputs
  - allowlist filters and parameters
  - log suspicious injection patterns

## Secret Handling
- Store secrets in platform-managed env/secret stores.
- Keep only example placeholders in git.
