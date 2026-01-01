# Local Development Setup Guide

This guide will help you run the HandyCall UI locally for development.

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- AWS CLI configured with appropriate credentials
- Access to AWS resources (DynamoDB, S3, Cognito, Bedrock)

## Environment Setup

Environment files have been created:
- `packages/backend/.env` - Backend API configuration
- `packages/web/.env.local` - Frontend Next.js configuration

These files are gitignored and contain all necessary environment variables fetched from your AWS Elastic Beanstalk environment.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Build Shared Types

```bash
npm run shared:build
```

### 3. Start Backend API

In one terminal:

```bash
npm run backend:dev
```

The backend will start on `http://localhost:3000`

### 4. Start Web Frontend

In another terminal:

```bash
npm run web:dev
```

The web app will start on `http://localhost:3001`

## Configuration

### Backend Configuration (`packages/backend/.env`)

Key settings:
- **PORT**: 3000 (backend API)
- **NODE_ENV**: development
- **CORS_ORIGINS**: Includes `http://localhost:3001` for local frontend
- **DYNAMODB_TABLE_PREFIX**: `handycall_dev_` (for local development)
- **AWS_REGION**: us-east-1
- All AWS credentials (Cognito, Bedrock) are configured

### Web Configuration (`packages/web/.env.local`)

- **NEXT_PUBLIC_API_URL**: `http://localhost:3000/api/v1`

## Accessing the Application

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000/api/v1

## Notes

1. **AWS Credentials**: Make sure your AWS CLI is configured with credentials that have access to:
   - DynamoDB tables (with `handycall_dev_` or `handycall_prod_` prefix)
   - S3 buckets (`handycall-recordings-prod`, `handycall-transcripts-prod`)
   - Cognito User Pools
   - Bedrock models

2. **DynamoDB**: The backend uses your AWS DynamoDB tables directly. Make sure they exist or update `DYNAMODB_TABLE_PREFIX` in `.env` if needed.

3. **Hot Reload**: Both services support hot reload, so changes will be reflected automatically.

4. **CORS**: The backend is configured to accept requests from `http://localhost:3001`.

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed troubleshooting steps.

### Quick Checks

**Backend won't start:**
- Ensure dependencies are installed: `npm install`
- Build shared package: `npm run shared:build`
- Check that port 3000 is not in use
- Verify `.env` file exists in `packages/backend/`
- Check AWS credentials: `aws sts get-caller-identity`
- Look for specific error messages in the terminal output

**Frontend can't connect to backend ("Failed to fetch" error):**
- Verify backend is running: Open http://localhost:3000/api/v1/health in browser
- Check that `NEXT_PUBLIC_API_URL` in `packages/web/.env.local` is correct
- Ensure CORS includes `http://localhost:3001` in backend `.env`
- Restart both services after making changes

**AWS Service Errors:**
- Verify AWS credentials are configured: `aws configure list`
- Check that you have permissions for the required AWS services
- Verify the AWS region matches your resources (us-east-1)

## Development Workflow

1. Start both services (`npm run backend:dev` and `npm run web:dev`)
2. Make UI changes in `packages/web/src/`
3. Changes will hot-reload automatically
4. Test locally without deploying to AWS

