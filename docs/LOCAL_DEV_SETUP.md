# Local Development Setup (Cognito Kept in AWS)

This setup keeps **AWS Cognito** for auth, and moves runtime dependencies to free/local services.

## Service Mapping

- Auth: AWS Cognito (kept)
- Database: DynamoDB Local (Docker)
- Object storage: local filesystem (`STORAGE_PROVIDER=local`)
- Email: local console mode (no external email cost during development)
- Webhook queue + KMS encryption: disabled locally by default (synchronous delivery)
- Optional relational stack: Supabase local (Docker)
- App hosting: local `npm run backend:dev` + `npm run web:dev` (no Amplify/EB)

## Prerequisites

- Docker + Docker Compose
- Node.js + npm
- AWS CLI
- Supabase CLI
- ngrok (`brew install ngrok/ngrok/ngrok`)
- Twilio CLI (already installed at `~/.local/node-current/bin/twilio`)
- `jq`, `curl`

## One-Time Setup

1. Start local infra:
```bash
npm run local:start
```
This starts a minimal Supabase profile (Postgres container only) to reduce pull/startup time.
If your network fails while pulling Supabase images, run:
```bash
SKIP_SUPABASE_START=true npm run local:start
```
This still boots DynamoDB local + app services.

2. Create backend local env:
```bash
cp packages/backend/.env.local.example packages/backend/.env.local
```

3. In `packages/backend/.env.local`, set your real Cognito values:
- `AWS_COGNITO_*`
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (if your local Cognito paths need IAM calls)

4. Create web local env:
```bash
cp packages/web/.env.local.example packages/web/.env.local
```

5. Update `packages/web/.env.local` with your real Cognito and NextAuth values.

## Run App Locally

All services start in one command:
```bash
npm run dev
```

This uses `concurrently` to run all packages in parallel with color-coded output:
| Label | Service | Port |
|-------|---------|------|
| `shared` | TypeScript watch build | — |
| `backend` | NestJS API (hot-reload) | 3000 |
| `web` | Next.js dashboard (HMR) | 3001 |
| `voice` | Voice bridge + ngrok tunnel | 8082 |
| `realtime` | Realtime controller | — |

The `voice` service automatically:
- Starts ngrok with static domain `consuelo-harmful-cathy.ngrok-free.dev`
- Updates the Twilio webhook for `+18324605974` via Twilio CLI

Press `Ctrl+C` once to stop everything.

To run services individually:
```bash
npm run backend:dev   # API only
npm run web:dev       # Web only
npm run shared:build  # Build shared types once
```

## Stop Local Infra

```bash
npm run local:stop
```

## Notes

- Existing scripts `scripts/create-dynamodb-tables.sh` and `scripts/seed-dynamodb.sh` are reused against local DynamoDB through `AWS_ENDPOINT_URL`.
- Call recordings/transcripts are written to `.local/storage` in local mode.
- `packages/backend/.env.local` is loaded before `.env` in NestJS.
- Cognito remains AWS-hosted as requested.

## Git Remote Workflow (Local vs Production)

Use separate remotes/branches to keep local development isolated from production deployment flow.

- Local development pushes go to `local` remote (`https://github.com/MohammadH3218/local.git`)
- Cloud/production-ready changes go through `origin` (`https://github.com/MohammadH3218/HandyCall.ai.git`)
- Keep `master` on `origin` for production-level work only
- For local work, create feature branches and push to `local` first

Example:

```bash
git checkout -b feat/my-local-change
git push -u local feat/my-local-change
```

When ready for production:

```bash
git checkout master
git push origin master
```
