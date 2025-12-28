# Environment Variables Audit Summary

## Current Status

### ✅ Elastic Beanstalk (`handycall-api-docker`)

**Current Environment Variables (21 total):**
- NODE_ENV = production
- PORT = 8080
- API_PREFIX = api/v1
- AWS_REGION = us-east-1
- DYNAMODB_TABLE_PREFIX = handycall_prod_
- S3_BUCKET_RECORDINGS = handycall-recordings-prod
- S3_BUCKET_TRANSCRIPTS = handycall-transcripts-prod
- BEDROCK_MODEL_ID = **anthropic.claude-3-sonnet-20240229-v1:0** ⚠️
- BEDROCK_EMBEDDING_MODEL_ID = amazon.titan-embed-text-v1
- JWT_SECRET = (set)
- JWT_EXPIRES_IN = 3600
- REFRESH_TOKEN_SECRET = (set)
- REFRESH_TOKEN_EXPIRES_IN = 2592000
- CORS_ORIGINS = (set)
- AWS_COGNITO_USERS_POOL_ID = us-east-1_gBsGtRPnM
- AWS_COGNITO_USERS_CLIENT_ID = (set)
- AWS_COGNITO_USERS_CLIENT_SECRET = (set)
- AWS_COGNITO_ADMIN_POOL_ID = us-east-1_87I5bQxUW
- AWS_COGNITO_ADMIN_CLIENT_ID = (set)
- AWS_COGNITO_ADMIN_CLIENT_SECRET = (set)

**Missing/Optional:**
- `TELEPHONY_PROVIDER` - Optional (defaults to mock)

**⚠️ ISSUE FOUND:**
- `BEDROCK_MODEL_ID` in Beanstalk is older version than Lambda
  - Beanstalk: `anthropic.claude-3-sonnet-20240229-v1:0`
  - Lambda: `anthropic.claude-3-5-sonnet-20241022-v2:0`
  - **Should be updated to match Lambda**

### ✅ Lambda: call-orchestrator

**Current Environment Variables (3 total):**
- DYNAMODB_TABLE_PREFIX = handycall_prod_
- BEDROCK_EMBEDDING_MODEL_ID = amazon.titan-embed-text-v1
- BEDROCK_MODEL_ID = anthropic.claude-3-5-sonnet-20241022-v2:0

**Status:** ✅ All required variables are set correctly

### ✅ Lambda: post-call-processor

**Current Environment Variables (3 total):**
- S3_BUCKET_TRANSCRIPTS = handycall-transcripts-prod
- BEDROCK_HAIKU_MODEL_ID = anthropic.claude-3-haiku-20240307-v1:0
- DYNAMODB_TABLE_PREFIX = handycall_prod_

**Status:** ✅ All required variables are set correctly

---

## Recommended Actions

### 1. Update Beanstalk BEDROCK_MODEL_ID (IMPORTANT)

The Beanstalk environment is using an older Bedrock model version than the Lambda functions. This could cause inconsistencies in AI responses.

**Command to fix:**
```powershell
aws elasticbeanstalk update-environment `
  --application-name handycall-api `
  --environment-name handycall-api-docker `
  --option-settings "Namespace=aws:elasticbeanstalk:application:environment,OptionName=BEDROCK_MODEL_ID,Value=anthropic.claude-3-5-sonnet-20241022-v2:0"
```

### 2. Optional: Add TELEPHONY_PROVIDER

If you want to explicitly set the telephony provider:
```powershell
aws elasticbeanstalk update-environment `
  --application-name handycall-api `
  --environment-name handycall-api-docker `
  --option-settings "Namespace=aws:elasticbeanstalk:application:environment,OptionName=TELEPHONY_PROVIDER,Value=amazon_connect"
```

---

## Environment Variables Reference

### Backend Required Variables

| Variable | Required | Current | Notes |
|----------|----------|---------|-------|
| NODE_ENV | ✅ | ✅ | production |
| PORT | ✅ | ✅ | 8080 |
| API_PREFIX | ✅ | ✅ | api/v1 |
| AWS_REGION | ✅ | ✅ | us-east-1 |
| DYNAMODB_TABLE_PREFIX | ✅ | ✅ | handycall_prod_ |
| S3_BUCKET_RECORDINGS | ✅ | ✅ | handycall-recordings-prod |
| S3_BUCKET_TRANSCRIPTS | ✅ | ✅ | handycall-transcripts-prod |
| BEDROCK_MODEL_ID | ✅ | ⚠️ | **Needs update** |
| BEDROCK_EMBEDDING_MODEL_ID | ✅ | ✅ | amazon.titan-embed-text-v1 |
| JWT_SECRET | ✅ | ✅ | (set) |
| JWT_EXPIRES_IN | ✅ | ✅ | 3600 |
| REFRESH_TOKEN_SECRET | ✅ | ✅ | (set) |
| REFRESH_TOKEN_EXPIRES_IN | ✅ | ✅ | 2592000 |
| CORS_ORIGINS | ✅ | ✅ | (set) |
| AWS_COGNITO_* | ✅ | ✅ | All 6 variables set |
| TELEPHONY_PROVIDER | ⚠️ | ❌ | Optional (defaults to mock) |

### Lambda Variables

Both Lambda functions have all required variables configured correctly.

---

## Notes

- AWS Systems Manager Parameter Store: Not currently used (no parameters found)
- Amplify: Environment variables would be set in Amplify Console (not checked in this audit)
- All secrets (JWT_SECRET, REFRESH_TOKEN_SECRET, Cognito secrets) are properly set but hidden in output

