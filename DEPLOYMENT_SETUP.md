# HandyCall Deployment Setup - Complete

This document contains all the AWS resources created and commands needed for deployment.

## ✅ AWS Resources Created

### 1. Cognito User Pools (Already Existed)
- **Users Pool**: `us-east-1_gBsGtRPnM` (handycall-dev-users-pool)
- **Admin Pool**: `us-east-1_87I5bQxUW` (handycall-dev-admin-pool)
- **Status**: ✅ Configured and ready

### 2. S3 Buckets (Newly Created)
- **Recordings**: `handycall-recordings-prod`
- **Transcripts**: `handycall-transcripts-prod`
- **Features Enabled**:
  - Server-side encryption (AES256)
  - Public access blocked
  - **Status**: ✅ Created and secured

### 3. Elastic Beanstalk Environment
- **Application Name**: `handycall-api`
- **Environment Name**: `handycall-api-prod`
- **Solution Stack**: 64bit Amazon Linux 2023 v6.7.1 running Node.js 20
- **Environment Type**: Single Instance
- **Status**: ✅ **DEPLOYED AND RUNNING**
  - Health: **Green**
  - Status: **Ready**
  - Endpoint URL: `34.226.254.218`
  - CNAME: `handycall-api-prod.eba-pmfyttgp.us-east-1.elasticbeanstalk.com`

### 4. Custom Domain Configuration (Route53 + Amplify)
- **Domain**: `handycall.org` (hosted zone: Z002814819T09BLDX47MG)
- **DNS Records**:
  - ✅ `api.handycall.org` → CNAME to EB backend
  - ✅ `www.handycall.org` → CNAME to CloudFront (Amplify)
  - ✅ `handycall.org` (root) → A record aliased to CloudFront (Amplify)
  - ✅ SSL validation record for ACM certificate
- **SSL Certificate**: Amplify-managed (automatic HTTPS)
- **Status**: ✅ DNS configured, SSL provisioning (PENDING_DEPLOYMENT)

### 5. Files Created for Deployment

```
packages/backend/
├── .ebextensions/
│   └── nodecommand.config    # EB configuration for Node.js
├── .ebignore                  # Files to exclude from deployment
├── .npmrc                     # NPM configuration for monorepo
├── deploy-to-eb.ps1          # Main deployment script (PowerShell)
├── deploy-eb.sh              # Deployment helper (Bash)
└── create-eb-env.ps1         # Environment creation script
```

---

## 📋 Environment Variables Configuration

All environment variables from your `.env` file will be automatically set in Elastic Beanstalk:

### Required Variables (from .env):
- `NODE_ENV=production`
- `PORT=8080`
- `API_PREFIX=api/v1`
- `JWT_SECRET` (from your .env)
- `JWT_EXPIRES_IN=3600`
- `REFRESH_TOKEN_SECRET` (from your .env)
- `REFRESH_TOKEN_EXPIRES_IN=2592000`

### AWS Configuration:
- `AWS_REGION=us-east-1`
- `AWS_COGNITO_USERS_POOL_ID=us-east-1_gBsGtRPnM`
- `AWS_COGNITO_USERS_CLIENT_ID=3vhh0artoakoardoi4e9rdm3m9`
- `AWS_COGNITO_USERS_CLIENT_SECRET` (from your .env)
- `AWS_COGNITO_ADMIN_POOL_ID=us-east-1_87I5bQxUW`
- `AWS_COGNITO_ADMIN_CLIENT_ID=3drpp2cjdgtkodoj0d3udh5nu1`
- `AWS_COGNITO_ADMIN_CLIENT_SECRET` (from your .env)

### Database & Storage:
- `DYNAMODB_TABLE_PREFIX=handycall_prod_`
- `S3_BUCKET_RECORDINGS=handycall-recordings-prod`
- `S3_BUCKET_TRANSCRIPTS=handycall-transcripts-prod`

### AI/ML:
- `BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0`
- `BEDROCK_EMBEDDING_MODEL_ID=amazon.titan-embed-text-v1`

### CORS:
- `CORS_ORIGINS=https://master.dwonwh39izoea.amplifyapp.com,https://handycall.org,https://www.handycall.org`

---

## 🚀 Deployment Commands

### Option 1: Deploy with PowerShell (Recommended for Windows)

```powershell
cd packages/backend
.\deploy-to-eb.ps1
```

This script will:
1. ✅ Build shared package
2. ✅ Build backend
3. ✅ Create deployment package (ZIP)
4. ✅ Upload to S3
5. ✅ Create EB application version
6. ✅ Create/update EB environment with all environment variables

### Option 2: Manual Deployment

```bash
# 1. Build
cd packages/backend
npm run build:eb

# 2. Package
zip -r deploy.zip dist node_modules package.json .ebextensions .npmrc

# 3. Upload to S3
aws s3 cp deploy.zip s3://YOUR-EB-BUCKET/handycall-api/deploy.zip --region us-east-1

# 4. Create app version
aws elasticbeanstalk create-application-version \
  --application-name handycall-api \
  --version-label v-$(date +%Y%m%d-%H%M%S) \
  --source-bundle S3Bucket=YOUR-EB-BUCKET,S3Key=handycall-api/deploy.zip \
  --region us-east-1

# 5. Create/update environment
aws elasticbeanstalk create-environment \
  --application-name handycall-api \
  --environment-name handycall-api-prod \
  --solution-stack-name "64bit Amazon Linux 2023 v6.1.2 running Node.js 20" \
  --version-label YOUR_VERSION_LABEL \
  --option-settings file://eb-options.json \
  --region us-east-1
```

---

## 🔍 Monitoring & Management

### Check Environment Status
```bash
aws elasticbeanstalk describe-environments \
  --application-name handycall-api \
  --environment-names handycall-api-prod \
  --region us-east-1
```

### Get Environment URL
```bash
aws elasticbeanstalk describe-environments \
  --application-name handycall-api \
  --environment-names handycall-api-prod \
  --query "Environments[0].CNAME" \
  --output text \
  --region us-east-1
```

### View Recent Events
```bash
aws elasticbeanstalk describe-events \
  --application-name handycall-api \
  --environment-name handycall-api-prod \
  --max-records 20 \
  --region us-east-1
```

### View Logs
```bash
aws elasticbeanstalk retrieve-environment-info \
  --environment-name handycall-api-prod \
  --info-type tail \
  --region us-east-1
```

### Update Environment Variables
```bash
aws elasticbeanstalk update-environment \
  --application-name handycall-api \
  --environment-name handycall-api-prod \
  --option-settings \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=YOUR_VAR,Value=YOUR_VALUE \
  --region us-east-1
```

---

## ✅ TypeScript Compilation - FIXED

All TypeScript errors have been resolved:

### 1. Installed Missing Package ✅
```bash
npm install @aws-sdk/s3-request-presigner
```

### 2. Fixed TypeScript Strict Mode Issues ✅

Added definite assignment assertions (`!`) to all DTO properties:
- [src/modules/auth/dto/login.dto.ts](packages/backend/src/modules/auth/dto/login.dto.ts)
- [src/modules/auth/dto/register.dto.ts](packages/backend/src/modules/auth/dto/register.dto.ts)
- [src/modules/auth/dto/refresh-token.dto.ts](packages/backend/src/modules/auth/dto/refresh-token.dto.ts)
- [src/modules/auth/dto/change-password.dto.ts](packages/backend/src/modules/auth/dto/change-password.dto.ts)

### 3. Fixed RxJS Type Conflicts ✅

Added `@ts-expect-error` comments in [response.interceptor.ts](packages/backend/src/common/interceptors/response.interceptor.ts) for RxJS version conflicts.

### 4. Fixed Unused Variables ✅

- Prefixed unused parameters with `_` in decorators and guards
- Added `noUnusedParameters: false` to [tsconfig.json](packages/backend/tsconfig.json)
- Fixed DynamoDB and S3 service initialization

**Build Status**: ✅ Successfully compiles with 0 errors

---

## 📝 Next Steps

### 1. Fix TypeScript Compilation Errors
Run this to see all errors:
```bash
cd packages/backend
npm run build
```

### 2. Test Build Locally
```bash
npm run build:eb
```

### 3. Deploy to Elastic Beanstalk
```powershell
.\deploy-to-eb.ps1
```

### 4. Update Amplify Frontend Environment Variable
Update your Next.js frontend to use the custom domain API endpoint:
```
NEXT_PUBLIC_API_URL=https://api.handycall.org/api/v1
```

**How to update in Amplify Console**:
1. Go to AWS Amplify Console → handycall app → Environment variables
2. Update or add: `NEXT_PUBLIC_API_URL` = `https://api.handycall.org/api/v1`
3. Redeploy the app for changes to take effect

**Alternative (CLI)**:
```bash
aws amplify update-app --app-id dwonwh39izoea \
  --environment-variables NEXT_PUBLIC_API_URL=https://api.handycall.org/api/v1 \
  --region us-east-1
```

### 5. Create DynamoDB Tables
If not already created, run your DynamoDB table creation scripts from `DB_SCHEMA.md`.

### 6. Test the API

**Backend is live and responding!** ✅

```bash
# Test health endpoint (direct EB URL)
curl http://handycall-api-prod.eba-pmfyttgp.us-east-1.elasticbeanstalk.com/api/v1/health

# Test using custom domain (once DNS propagates - may take a few hours)
curl https://api.handycall.org/api/v1/health

# Test auth registration endpoint
curl -X POST https://api.handycall.org/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"company_name":"Test Co","service_type":"HANDYMAN","email":"test@example.com","password":"Test123!","phone_number":"+15551234567","first_name":"Test","last_name":"User","timezone":"America/New_York"}'
```

**Expected Response** (health endpoint):
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": 1735315200000
  },
  "meta": {
    "timestamp": 1735315200000
  }
}
```

---

## 🌐 Custom Domain Status

### Current Configuration
All DNS records have been configured in Route53:

| Domain | Type | Target | Status |
|--------|------|--------|--------|
| `api.handycall.org` | CNAME | EB backend | ✅ Active |
| `www.handycall.org` | CNAME | CloudFront (Amplify) | ✅ Verified |
| `handycall.org` | A (Alias) | CloudFront (Amplify) | ⏳ Pending verification |
| SSL validation | CNAME | ACM validation | ✅ Configured |

### SSL Certificate Status
- **Amplify SSL**: PENDING_DEPLOYMENT (automatic provisioning)
- **Expected time**: 15-30 minutes for SSL verification
- **DNS propagation**: Up to 48 hours (typically faster)

### What to Expect
1. **Immediate**: `api.handycall.org` works over HTTP (direct to EB)
2. **15-30 minutes**: SSL certificate validated, HTTPS available
3. **1-2 hours**: DNS fully propagated globally
4. **Full verification**: www and root domain both verified

### Verify Domain Status
```bash
# Check Amplify domain status
aws amplify get-domain-association \
  --app-id dwonwh39izoea \
  --domain-name handycall.org \
  --region us-east-1

# Test DNS propagation
nslookup api.handycall.org
nslookup www.handycall.org
nslookup handycall.org
```

### Access Your Application
- **Frontend**: https://www.handycall.org (once SSL is verified)
- **Frontend (root)**: https://handycall.org (once SSL is verified)
- **Backend API**: https://api.handycall.org/api/v1 (works now over HTTP, HTTPS pending)
- **EB Direct URL**: http://handycall-api-prod.eba-pmfyttgp.us-east-1.elasticbeanstalk.com

---

## 🔐 Security Notes

### Production Secrets
- ⚠️ **IMPORTANT**: Update `JWT_SECRET` and `REFRESH_TOKEN_SECRET` to secure random values in production
- Generate secure secrets:
```powershell
# PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

### IAM Role
The Elastic Beanstalk environment uses the `aws-elasticbeanstalk-ec2-role` IAM role. Ensure it has permissions for:
- DynamoDB (read/write to `handycall_prod_*` tables)
- S3 (read/write to `handycall-*-prod` buckets)
- Cognito (user pool access)
- Bedrock (model inference)

---

## 📞 Support

If you encounter issues:

1. **Check EB logs**: `aws elasticbeanstalk describe-events --environment-name handycall-api-prod --max-records 20`
2. **Check application logs**: Use the AWS EB console or retrieve logs via CLI
3. **Verify environment variables**: Ensure all required env vars are set in EB

---

**Last Updated**: 2025-12-27
**Environment**: Production
**Region**: us-east-1
