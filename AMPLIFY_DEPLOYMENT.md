# AWS Amplify Deployment Guide

## Current Issue: 404 Error

Your Amplify deployment is building successfully but showing a 404 error. This is because:
1. The `amplify.yml` configuration was missing
2. Environment variables need to be set

## ✅ What I Fixed

Created [amplify.yml](amplify.yml) with the correct configuration for the Next.js monorepo structure.

## 🚀 Deployment Steps

### 1. Set Environment Variables in Amplify Console

Go to your Amplify app → **Environment variables** and add:

**Frontend Environment Variables:**
```
NEXT_PUBLIC_API_URL=https://your-backend-api-url.com/api/v1
```

Replace `your-backend-api-url.com` with your actual backend API URL (e.g., API Gateway, EC2, or ECS endpoint).

**If you want to deploy the backend on the same Amplify:**
- You'll need to set up API routes or use a separate service for the NestJS backend
- Amplify Hosting is primarily for frontend apps

### 2. Commit and Push the amplify.yml File

```bash
git add amplify.yml
git commit -m "Add Amplify build configuration for Next.js monorepo"
git push origin master
```

This will trigger a new deployment with the correct configuration.

### 3. Verify Build Settings in Amplify Console

Go to your Amplify app → **Build settings** and verify:

- **App root directory**: Leave empty (uses repository root)
- **Build specification**: Uses `amplify.yml` from repository

### 4. Monitor the Deployment

After pushing:
1. Go to Amplify Console → Deployments
2. Watch the build logs
3. Ensure all phases complete successfully:
   - **Provision**: Sets up build environment
   - **Build**: Runs npm ci and npm run build
   - **Deploy**: Deploys the built files

## 🔧 Backend Deployment Options

Your NestJS backend needs to be deployed separately. Options:

### Option 1: AWS Elastic Beanstalk
```bash
# Install EB CLI
pip install awsebcli

# Initialize
cd packages/backend
eb init -p node.js --region us-east-1

# Create environment
eb create handycall-backend-prod

# Deploy
eb deploy
```

### Option 2: AWS ECS (Fargate)
1. Containerize the backend (create Dockerfile)
2. Push to ECR
3. Create ECS service with Fargate
4. Configure Application Load Balancer

### Option 3: AWS Lambda + API Gateway
- Convert NestJS to serverless
- Use AWS SAM or Serverless Framework
- Deploy as Lambda functions

### Option 4: EC2
- Launch EC2 instance
- Install Node.js and PM2
- Clone repo and run backend
- Set up NGINX as reverse proxy

## 📋 Environment Variables Checklist

### Frontend (Amplify Hosting)
- [ ] `NEXT_PUBLIC_API_URL` - Your backend API URL

### Backend (Wherever deployed)
All these should be in AWS SSM Parameter Store:
- [ ] Upload parameters: `./scripts/upload-params-to-ssm.sh production`
- [ ] Set `NODE_ENV=production`
- [ ] Set `AWS_REGION=us-east-1`
- [ ] Ensure IAM role has SSM access

## 🐛 Troubleshooting

### 404 Error Persists After Deployment
1. Check build logs in Amplify console
2. Verify `baseDirectory: packages/web` in amplify.yml
3. Ensure `npm run build` succeeds in build logs
4. Check that `.next` folder is created

### Build Fails
**Common issues:**
- **Missing dependencies**: Ensure `npm ci` runs at root level
- **TypeScript errors**: Fix type errors in code
- **Environment variables**: Check if build needs any variables

**Check build logs:**
```
Amplify Console → Your App → Deployments → View logs
```

### Frontend Loads But Can't Connect to Backend
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check CORS settings in backend
- Ensure backend is running and accessible

### CORS Errors
Update backend `.env` or SSM parameters:
```
CORS_ORIGINS=https://master.dwonwh39izoea.amplifyapp.com,https://www.yourdomain.com
```

## 🔒 Security Notes

### Before Production:
1. **Update CORS_ORIGINS** in backend to only allow your Amplify domain
2. **Use HTTPS** for all API calls
3. **Enable AWS WAF** for DDoS protection
4. **Set up CloudWatch** alarms
5. **Configure CloudFront** for CDN (Amplify does this automatically)

## 📦 Recommended Architecture

```
┌─────────────────────────────────────────┐
│  Users                                  │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  AWS Amplify (Frontend - Next.js)       │
│  - Serves static files                  │
│  - SSR for dynamic pages                │
│  - Auto SSL/HTTPS                       │
│  - CloudFront CDN                       │
└────────────┬────────────────────────────┘
             │ HTTPS API calls
             ▼
┌─────────────────────────────────────────┐
│  API Gateway + Lambda (Option 1)        │
│  OR                                     │
│  Application Load Balancer + ECS/EB     │
│  (Option 2)                             │
│                                         │
│  Backend - NestJS API                   │
│  - Reads config from SSM                │
│  - Connects to DynamoDB                 │
│  - Uses Cognito for auth                │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  AWS Services                           │
│  - DynamoDB (data)                      │
│  - Cognito (auth)                       │
│  - S3 (storage)                         │
│  - SSM (config)                         │
└─────────────────────────────────────────┘
```

## ✅ Next Steps

1. **Commit amplify.yml**:
   ```bash
   git add amplify.yml AMPLIFY_DEPLOYMENT.md
   git commit -m "Add Amplify deployment configuration"
   git push origin master
   ```

2. **Set Frontend Environment Variable**:
   - Go to Amplify Console
   - Environment variables
   - Add `NEXT_PUBLIC_API_URL`

3. **Wait for New Deployment**:
   - Amplify will auto-deploy after push
   - Monitor in console

4. **Deploy Backend**:
   - Choose deployment method
   - Follow setup guide for chosen method
   - Update `NEXT_PUBLIC_API_URL` with backend URL

5. **Test Everything**:
   - Visit Amplify URL
   - Try login flow
   - Check browser console for errors

## 🆘 Need Help?

If issues persist:
1. Share build logs from Amplify console
2. Check browser console for errors
3. Verify network requests in DevTools
4. Test API endpoints directly

The 404 should be resolved once you push the `amplify.yml` file and redeploy!
