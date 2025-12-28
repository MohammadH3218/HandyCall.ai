# Environment Variables Audit

## Required Environment Variables (Compiled from Codebase)

### Backend (NestJS) Variables

#### Core Application
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `API_PREFIX` - API prefix (default: api/v1)
- `CORS_ORIGINS` - Comma-separated CORS origins

#### JWT Authentication
- `JWT_SECRET` - Secret for JWT signing
- `JWT_EXPIRES_IN` - JWT expiration in seconds (default: 3600)
- `REFRESH_TOKEN_SECRET` - Secret for refresh tokens
- `REFRESH_TOKEN_EXPIRES_IN` - Refresh token expiration

#### AWS Configuration
- `AWS_REGION` - AWS region (default: us-east-1)
- `DYNAMODB_ENDPOINT` - DynamoDB endpoint (for local dev only)
- `DYNAMODB_TABLE_PREFIX` - Table prefix (e.g., handycall_prod_)
- `S3_BUCKET_RECORDINGS` - S3 bucket for recordings
- `S3_BUCKET_TRANSCRIPTS` - S3 bucket for transcripts

#### AWS Cognito (Optional)
- `AWS_COGNITO_USERS_POOL_ID` - Cognito users pool ID
- `AWS_COGNITO_USERS_CLIENT_ID` - Cognito users client ID
- `AWS_COGNITO_USERS_CLIENT_SECRET` - Cognito users client secret
- `AWS_COGNITO_ADMIN_POOL_ID` - Cognito admin pool ID (optional)
- `AWS_COGNITO_ADMIN_CLIENT_ID` - Cognito admin client ID (optional)
- `AWS_COGNITO_ADMIN_CLIENT_SECRET` - Cognito admin client secret (optional)

#### Bedrock AI
- `BEDROCK_MODEL_ID` - Bedrock LLM model ID (e.g., anthropic.claude-3-5-sonnet-20241022-v2:0)
- `BEDROCK_EMBEDDING_MODEL_ID` - Bedrock embedding model ID (e.g., amazon.titan-embed-text-v1)

#### Telephony
- `TELEPHONY_PROVIDER` - Telephony provider (mock/amazon_connect/twilio)

---

### Lambda: call-orchestrator

Currently Set:
- ✅ `DYNAMODB_TABLE_PREFIX` = handycall_prod_
- ✅ `BEDROCK_EMBEDDING_MODEL_ID` = amazon.titan-embed-text-v1
- ✅ `BEDROCK_MODEL_ID` = anthropic.claude-3-5-sonnet-20241022-v2:0

Used in Code:
- ✅ `AWS_REGION` - Uses default or env (us-east-1)
- ✅ `DYNAMODB_TABLE_PREFIX` - Set
- ✅ `BEDROCK_MODEL_ID` - Set

**Status**: ✅ All required variables are set

---

### Lambda: post-call-processor

Currently Set:
- ✅ `S3_BUCKET_TRANSCRIPTS` = handycall-transcripts-prod
- ✅ `BEDROCK_HAIKU_MODEL_ID` = anthropic.claude-3-haiku-20240307-v1:0
- ✅ `DYNAMODB_TABLE_PREFIX` = handycall_prod_

Used in Code:
- ✅ `S3_BUCKET_TRANSCRIPTS` - Set
- ✅ `DYNAMODB_TABLE_PREFIX` - Set
- ✅ `AWS_REGION` - Uses default or env

**Status**: ✅ All required variables are set

---

## AWS Services to Check

1. **Elastic Beanstalk**: `handycall-api-docker`
2. **Amplify**: `HandyCall.ai` (dwonwh39izoea)
3. **AWS Systems Manager Parameter Store**: `/handycall/prod/*`

