# Local Development Setup

This setup runs the current marketplace stack locally against DynamoDB Local plus the current web/backend apps.

## Service Mapping
- auth: AWS Cognito
- database: DynamoDB Local
- object storage: local filesystem or S3-compatible local config as needed
- app hosting: local `npm run backend:dev` + `npm run web:dev`

## Prerequisites
- Docker + Docker Compose
- Node.js + npm
- AWS CLI
- `jq`, `curl`

## Start
```bash
npm install
npm run local:start
npm run dev
```

## Individual Commands
```bash
npm run shared:build
npm run backend:dev
npm run web:dev
```

## Git Workflow
- `master` is the deployable truth branch.
- Use short-lived feature branches off `master` when needed.
- Push to `origin`.
