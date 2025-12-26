# AWS Systems Manager Parameter Store Setup Guide

## What Was Implemented

Your backend now supports **AWS Systems Manager Parameter Store** for secure configuration management. This is a production-ready approach for storing sensitive credentials and configuration.

### Changes Made

1. **✅ Added SSM Support**
   - Created `ParameterStoreService` to load parameters from AWS SSM
   - Updated `AppConfigModule` to use SSM when enabled
   - Added `@aws-sdk/client-ssm` dependency

2. **✅ Created Management Scripts**
   - `upload-params-to-ssm.sh` - Upload .env to SSM
   - `get-params-from-ssm.sh` - View parameters in SSM
   - `get-params-to-env.sh` - Download SSM parameters to .env

3. **✅ Maintained Backward Compatibility**
   - Still works with `.env` files for local development
   - Automatically uses SSM when `NODE_ENV=production` or `USE_SSM_PARAMETERS=true`

## Setup Steps

### 1. Configure AWS Credentials

First, ensure your AWS credentials are configured:

```bash
# Option 1: AWS CLI configure
aws configure

# Option 2: Environment variables
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_REGION=us-east-1

# Option 3: Use IAM role (recommended for EC2/ECS/Lambda)
# No configuration needed - automatically uses instance role
```

### 2. Upload Parameters to SSM

```bash
cd scripts

# Make scripts executable
chmod +x upload-params-to-ssm.sh
chmod +x get-params-from-ssm.sh
chmod +x get-params-to-env.sh

# Upload all .env parameters to SSM
./upload-params-to-ssm.sh dev

# For production environment
./upload-params-to-ssm.sh production
```

### 3. Verify Upload

```bash
# View all uploaded parameters
./get-params-from-ssm.sh dev

# Or using AWS CLI directly
aws ssm get-parameters-by-path \
  --path /handycall/dev/ \
  --recursive \
  --with-decryption \
  --region us-east-1
```

### 4. Configure Your Application

#### For Local Development (uses .env):
```bash
# No changes needed - continues using .env file
npm run dev
```

#### For Production (uses SSM):
```bash
# Set environment variables
export NODE_ENV=production
export AWS_REGION=us-east-1

# Run application - will automatically load from SSM
npm run start:prod
```

#### Force SSM in Development:
```bash
export USE_SSM_PARAMETERS=true
export NODE_ENV=dev
npm run dev
```

## AWS Amplify Deployment

### 1. Upload Parameters

```bash
# Upload to production environment in SSM
./upload-params-to-ssm.sh production
```

### 2. Configure Amplify Environment Variables

In AWS Amplify Console, add these environment variables:

```
NODE_ENV=production
AWS_REGION=us-east-1
```

### 3. Update IAM Role

Your Amplify service role needs SSM permissions. Add this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParametersByPath"
      ],
      "Resource": [
        "arn:aws:ssm:us-east-1:YOUR_ACCOUNT_ID:parameter/handycall/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "ssm.us-east-1.amazonaws.com"
        }
      }
    }
  ]
}
```

**To add this policy:**

1. Go to AWS IAM Console
2. Find your Amplify service role (usually `amplifyconsole-backend-role`)
3. Click "Add permissions" → "Create inline policy"
4. Paste the JSON above (replace `YOUR_ACCOUNT_ID`)
5. Name it `SSMParameterAccess`
6. Click "Create policy"

## Parameter Naming Convention

Parameters are stored with this structure:
```
/handycall/{environment}/{PARAMETER_NAME}
```

Examples:
```
/handycall/dev/JWT_SECRET
/handycall/dev/AWS_COGNITO_USERS_POOL_ID
/handycall/production/JWT_SECRET
/handycall/production/DATABASE_URL
```

## Security Features

- ✅ **Automatic Encryption**: Parameters containing `SECRET`, `PASSWORD`, or `KEY` are stored as `SecureString` (encrypted with KMS)
- ✅ **Access Control**: IAM policies control who can read parameters
- ✅ **Audit Trail**: CloudTrail logs all parameter access
- ✅ **Version History**: SSM keeps history of parameter changes
- ✅ **Centralized Management**: All environments in one place

## Troubleshooting

### Parameters Not Loading

**Check AWS credentials:**
```bash
aws sts get-caller-identity
```

**Check parameter exists:**
```bash
aws ssm get-parameter --name /handycall/dev/JWT_SECRET --with-decryption
```

**Check application logs:**
Look for these messages:
- `🔐 Loading configuration from AWS Systems Manager Parameter Store...`
- `✅ Loaded X parameters from /handycall/dev`
- `❌ Failed to load parameters from SSM:` (shows error)

### Upload Failed

**Common issues:**
1. **No AWS credentials** - Run `aws configure`
2. **No permissions** - Add `ssm:PutParameter` to your IAM user/role
3. **Invalid parameter value** - Check `.env` file format

**Test manually:**
```bash
aws ssm put-parameter \
  --name /handycall/dev/TEST \
  --value "test-value" \
  --type String \
  --overwrite
```

### Fallback to .env

If SSM fails, the application automatically falls back to `.env` file. This is expected behavior for development.

Check logs for: `⚠️  Falling back to .env file`

## Best Practices

### ✅ DO:
- Use SSM Parameter Store for production deployments
- Use different parameters for each environment (dev, staging, prod)
- Store all secrets in SecureString parameters
- Rotate secrets regularly
- Use IAM policies to control access
- Keep `.env` file for local development only

### ❌ DON'T:
- Commit `.env` files to git
- Store production secrets in `.env` files
- Share parameter values in chat/email
- Use same parameters across environments
- Grant broad SSM access permissions

## Migration Checklist

- [ ] Configure AWS credentials locally
- [ ] Run `./upload-params-to-ssm.sh dev` successfully
- [ ] Verify parameters in SSM with `./get-params-from-ssm.sh dev`
- [ ] Test local app with `USE_SSM_PARAMETERS=true`
- [ ] Upload production parameters with `./upload-params-to-ssm.sh production`
- [ ] Update Amplify IAM role with SSM permissions
- [ ] Set `NODE_ENV=production` in Amplify environment variables
- [ ] Deploy and verify application loads parameters from SSM

## Next Steps

1. **Configure AWS CLI** (if not done)
   ```bash
   aws configure
   ```

2. **Upload parameters**
   ```bash
   cd scripts
   ./upload-params-to-ssm.sh dev
   ```

3. **Commit changes**
   All SSM integration code is ready to commit and deploy

4. **Deploy to Amplify**
   Once pushed to master, Amplify will use SSM automatically

## Support

For issues or questions:
- Check [CONFIG_README.md](packages/backend/CONFIG_README.md)
- Review AWS SSM documentation
- Check application logs for detailed error messages
