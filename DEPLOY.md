# HandyCall — Deployment Guide

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser / Mobile                                               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
          ┌───────────▼───────────┐
          │   Vercel (CDN/Edge)   │  handycall.org
          │   Next.js 14 (Web)    │  packages/web
          └───────────┬───────────┘
                      │ HTTPS /api/v1/...
          ┌───────────▼───────────┐
          │   Fly.io (iad)        │  handycall-api.fly.dev
          │   NestJS API          │  packages/backend
          │   Docker / Node 20    │  Port 8080
          └──┬────────┬──────────┘
             │        │
   ┌─────────▼──┐  ┌──▼────────────────────────────────┐
   │  AWS SES   │  │  AWS (me-central-1 — Saudi Arabia)  │
   │ us-east-1  │  │                                     │
   │  Email     │  │  DynamoDB   —  9 tables             │
   └────────────┘  │  S3          —  handycall-media-*   │
                   │  Cognito     —  social auth          │
                   │  SSM         —  secrets              │
                   └─────────────────────────────────────┘
```

| Service | Platform | URL | Config file |
|---------|----------|-----|-------------|
| Web (Next.js) | Vercel | handycall.org | `.vercel/project.json` |
| API (NestJS) | Fly.io | handycall-api.fly.dev | `fly.toml`, `Dockerfile` |
| Database | AWS DynamoDB me-central-1 | — | `scripts/create-marketplace-tables.sh` |
| Media | AWS S3 us-east-1 | — | `scripts/setup-aws.sh` |
| Email | AWS SES us-east-1 | no-reply@handycall.org | `fly.toml` env |
| Auth | AWS Cognito us-east-1 | — | Vercel env vars |
| Secrets | AWS SSM me-central-1 | — | `scripts/setup-aws.sh` |

---

## Quick Reference

```bash
# Routine: deploy everything
bash scripts/deploy.sh

# Deploy only the API (Fly.io)
bash scripts/deploy.sh api

# Deploy only the web (Vercel)
bash scripts/deploy.sh web

# First-time: provision AWS infrastructure
bash scripts/deploy.sh aws
```

---

## Prerequisites

Install these tools before running any deploy script.

### CLI tools

```bash
# Fly.io CLI
curl -L https://fly.io/install.sh | sh

# Vercel CLI
npm install -g vercel@latest

# AWS CLI v2
# macOS:
brew install awscli
# Linux:
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
unzip awscliv2.zip && sudo ./aws/install
```

### Authenticate each CLI

```bash
fly auth login                    # Fly.io
vercel login                      # Vercel
aws configure                     # AWS (region: me-central-1 recommended)
```

### Make scripts executable (one-time)

```bash
chmod +x scripts/*.sh
```

---

## First-Time Environment Setup

Run these in order on a fresh environment.

### 1. AWS infrastructure

```bash
bash scripts/setup-aws.sh
```

This creates:
- S3 bucket with versioning and CORS
- All DynamoDB tables (via `create-marketplace-tables.sh`)
- Verifies SES sender identity
- Prints remaining SSM secrets you need to fill in

### 2. Fly.io secrets

Secrets are encrypted at rest on Fly. Set them once — they persist across deploys.

```bash
fly secrets set \
  JWT_SECRET="<64-char random string>" \
  AWS_ACCESS_KEY_ID="<IAM key for Fly container>" \
  AWS_SECRET_ACCESS_KEY="<IAM secret>" \
  HYPERPAY_ACCESS_TOKEN="<HyperPay token>" \
  HYPERPAY_ENTITY_ID_MADA="<entity ID>" \
  HYPERPAY_ENTITY_ID_VISA="<entity ID>" \
  --app handycall-api
```

Generate a strong JWT secret:
```bash
openssl rand -hex 32
```

View currently set secrets (names only, values are hidden):
```bash
fly secrets list --app handycall-api
```

### 3. Vercel environment variables

Set in the [Vercel dashboard](https://vercel.com/dashboard) under your project → Settings → Environment Variables. Set for **Production** environment.

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://handycall-api.fly.dev/api/v1` |
| `NEXTAUTH_URL` | `https://handycall.org` |
| `NEXTAUTH_SECRET` | Random 32-char string (`openssl rand -hex 16`) |
| `COGNITO_REGION` | `us-east-1` |
| `COGNITO_USER_POOL_ID` | From AWS Cognito console |
| `COGNITO_CLIENT_ID` | From AWS Cognito console |
| `COGNITO_CLIENT_SECRET` | From AWS Cognito console |
| `COGNITO_ISSUER` | `https://cognito-idp.us-east-1.amazonaws.com/<pool-id>` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (if using Stripe) |

### 4. Link Vercel project (if .vercel/project.json is missing)

```bash
# From repo root
vercel link
# Select your Vercel team/org and the handycall-web project
```

In the Vercel dashboard, ensure **Root Directory** is set to `packages/web`.

### 5. Create the Fly.io app (if starting from scratch)

```bash
fly apps create handycall-api
# Then run: bash scripts/deploy-api.sh
```

---

## Routine Deploys

### Auto-deploy (recommended)

Connect your GitHub repo to:
- **Vercel**: Dashboard → project → Git integration → push to `main` auto-deploys
- **Fly.io**: See GitHub Actions section below (optional)

### Manual deploy

```bash
# Both services
bash scripts/deploy.sh

# API only (faster if only backend changed)
bash scripts/deploy.sh api

# Web only (faster if only frontend changed)
bash scripts/deploy.sh web
```

---

## Secrets Management

### Where secrets live

| Secret | Lives in | Used by |
|--------|----------|---------|
| JWT_SECRET | Fly.io secrets | NestJS (signs tokens) |
| AWS_ACCESS_KEY_ID | Fly.io secrets | NestJS (DynamoDB, S3, SES) |
| AWS_SECRET_ACCESS_KEY | Fly.io secrets | NestJS |
| HYPERPAY_* | Fly.io secrets | NestJS (payments) |
| NEXTAUTH_SECRET | Vercel env | Next.js (NextAuth sessions) |
| COGNITO_CLIENT_SECRET | Vercel env | Next.js (OAuth) |
| Long-term secrets | AWS SSM me-central-1 | Optionally pulled by backend at startup |

### Rotating a Fly.io secret

```bash
fly secrets set JWT_SECRET="<new-value>" --app handycall-api
# Fly automatically restarts the app with the new secret
```

### Rotating a Vercel secret

Update in Vercel dashboard → Environment Variables → redeploy (or push to trigger auto-deploy).

---

## AWS IAM Permissions

The IAM user/role used by the Fly.io container (`AWS_ACCESS_KEY_ID`) needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem",
        "dynamodb:DeleteItem", "dynamodb:Query", "dynamodb:Scan",
        "dynamodb:BatchGetItem", "dynamodb:BatchWriteItem"
      ],
      "Resource": "arn:aws:dynamodb:me-central-1:*:table/handycall_prod_*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::handycall-media-prod-982081079378/*"
    },
    {
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*",
      "Condition": { "StringEquals": { "ses:FromAddress": "no-reply@handycall.org" } }
    },
    {
      "Effect": "Allow",
      "Action": ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"],
      "Resource": "arn:aws:ssm:me-central-1:*:parameter/handycall/*"
    }
  ]
}
```

---

## Rollback

### Fly.io

```bash
# List past releases
fly releases --app handycall-api

# Roll back to a specific version
fly deploy --image registry.fly.io/handycall-api:<version> --app handycall-api
```

### Vercel

In the Vercel dashboard → Deployments → find the previous successful deployment → click **Promote to Production**.

Or via CLI:
```bash
vercel rollback [deployment-url]
```

---

## Monitoring & Logs

### Fly.io (API)

```bash
# Live logs
fly logs --app handycall-api

# Status and machine health
fly status --app handycall-api

# SSH into the running container
fly ssh console --app handycall-api

# Scale machines (if needed)
fly scale count 2 --app handycall-api

# Health check endpoint
curl https://handycall-api.fly.dev/api/v1/health
```

### Vercel (Web)

```bash
# Live function logs
vercel logs --follow

# List deployments
vercel ls
```

### AWS

```bash
# DynamoDB table sizes
aws dynamodb describe-table --table-name handycall_prod_bookings \
  --region me-central-1 --query 'Table.ItemCount'

# SES sending stats (last 14 days)
aws sesv2 get-account --region us-east-1 --query 'SendQuota'

# CloudWatch logs for DynamoDB
# → AWS Console → CloudWatch → Log groups → /aws/dynamodb/...
```

---

## Local Development

### Backend

```bash
# 1. Start DynamoDB Local (requires Docker)
docker run -p 8000:8000 amazon/dynamodb-local

# 2. Create local tables
DYNAMODB_ENDPOINT=http://localhost:8000 \
DYNAMODB_TABLE_PREFIX=handycall_dev_ \
  bash scripts/create-marketplace-tables.sh

# 3. Copy and fill backend env
cp packages/backend/.env.example packages/backend/.env

# 4. Start backend dev server
npm run start:dev --workspace=packages/backend
# → http://localhost:3000/api/v1
```

### Web

```bash
# Copy and fill web env
cp packages/web/.env.local.example packages/web/.env.local

# Start Next.js dev server
cd packages/web && npm run dev
# → http://localhost:3001
```

### Environment variable files

| File | Purpose |
|------|---------|
| `packages/backend/.env.example` | Template for backend local dev |
| `packages/web/.env.local.example` | Template for web local dev |
| `packages/backend/.env` | Your local backend config (git-ignored) |
| `packages/web/.env.local` | Your local web config (git-ignored) |

---

## Optional: GitHub Actions CI/CD

If you want automatic deploys on push, create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [master]

jobs:
  deploy-api:
    name: Deploy API → Fly.io
    runs-on: ubuntu-latest
    if: contains(github.event.commits[0].modified, 'packages/backend') || contains(github.event.commits[0].modified, 'packages/shared')
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: fly deploy --app handycall-api --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

  # Web is auto-deployed by Vercel's GitHub integration — no action needed.
```

Get the Fly API token:
```bash
fly tokens create deploy --app handycall-api
# Add as GitHub secret: FLY_API_TOKEN
```

Vercel auto-deploys on push when the GitHub repo is connected in the Vercel dashboard — no workflow needed for the web.
