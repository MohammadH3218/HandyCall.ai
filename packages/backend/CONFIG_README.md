# Configuration Management

This application supports two configuration methods:

## 1. Local Development (.env file)

For local development, use a `.env` file in the `packages/backend` directory.

```bash
# Copy the example
cp .env.example .env

# Edit with your values
nano .env
```

## 2. Production (AWS Systems Manager Parameter Store)

For production deployments, use AWS Systems Manager Parameter Store to securely store configuration.

### Upload Parameters to SSM

```bash
cd scripts

# Upload all .env parameters to SSM
chmod +x upload-params-to-ssm.sh
./upload-params-to-ssm.sh dev

# For production
./upload-params-to-ssm.sh production
```

### Environment Variable

Set this environment variable to enable SSM Parameter Store:

```bash
# Force use of SSM (optional for production, automatic for NODE_ENV=production)
USE_SSM_PARAMETERS=true

# Specify environment (determines SSM path: /handycall/{env}/)
NODE_ENV=production
```

### SSM Parameter Structure

Parameters are stored with the following structure:
```
/handycall/dev/JWT_SECRET
/handycall/dev/AWS_COGNITO_USERS_POOL_ID
/handycall/dev/DYNAMODB_ENDPOINT
...
```

### Retrieve Parameters from SSM

```bash
cd scripts

# View all parameters
chmod +x get-params-from-ssm.sh
./get-params-from-ssm.sh dev

# Download to .env file
chmod +x get-params-to-env.sh
./get-params-to-env.sh dev > ../packages/backend/.env
```

## Configuration Priority

The application loads configuration in this order:

1. **If `USE_SSM_PARAMETERS=true` or `NODE_ENV=production`:**
   - Load from AWS SSM Parameter Store
   - Fall back to `.env` file if SSM fails

2. **Otherwise:**
   - Load from `.env` file only

## AWS Amplify Deployment

When deploying to AWS Amplify:

1. **Upload parameters to SSM:**
   ```bash
   ./upload-params-to-ssm.sh production
   ```

2. **Set environment variables in Amplify console:**
   ```
   NODE_ENV=production
   AWS_REGION=us-east-1
   ```

3. **Grant IAM permissions** to Amplify service role:
   - `ssm:GetParameter`
   - `ssm:GetParametersByPath`

   Example IAM policy:
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
         "Resource": "arn:aws:ssm:us-east-1:*:parameter/handycall/*"
       }
     ]
   }
   ```

## Security Best Practices

- ✅ **DO** use SSM Parameter Store for production
- ✅ **DO** use `SecureString` type for sensitive values (automatic for keys/secrets/passwords)
- ✅ **DO** rotate secrets regularly
- ✅ **DO** use different parameters for each environment (dev, staging, production)
- ❌ **DON'T** commit `.env` files to git
- ❌ **DON'T** store production secrets in `.env` files

## Troubleshooting

**Parameters not loading from SSM:**
1. Check AWS credentials are configured
2. Verify IAM permissions for SSM
3. Check parameter path: `/handycall/{NODE_ENV}/`
4. Review application logs for error messages

**Application falls back to .env:**
- This is expected behavior if SSM fails
- Check console logs for SSM error messages
- Ensure `AWS_REGION` environment variable is set
