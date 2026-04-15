# Deployment Handoff

Last updated: 2026-03-10

## GitHub
- Remote: `origin`
- URL: `https://github.com/MohammadH3218/HandyCall.ai.git`
- Default branch currently used locally: `master`

## Backend AWS Docker Deploy
Primary script:
- `packages/backend/deploy.sh`

What it does:
1. Builds Docker image from monorepo root using `packages/backend/Dockerfile`
2. Logs into ECR
3. Pushes versioned + `latest` image tags
4. Creates `Dockerrun.aws.json`
5. Creates zip bundle and uploads to S3
6. Creates EB app version and updates EB environment

Configured in script (verify before production deploy):
- Region: `us-east-1`
- AWS account: `982081079378`
- ECR repo: `handycall-backend`
- EB app: `handycall-api`
- EB environment: `handycall-api-lb`

## Web AWS Docker Deploy
Primary script:
- `packages/web/deploy.sh`

What it does:
1. Builds Docker image from monorepo root using `packages/web/Dockerfile`
2. Logs into ECR
3. Pushes versioned + `latest` image tags
4. Generates a temporary `Dockerrun.aws.json`
5. Creates zip bundle and uploads to S3 under the web app prefix
6. Creates EB app version and updates EB environment
7. Waits for the EB environment update to finish

Configured in script:
- Region: `us-east-1`
- AWS account: `982081079378`
- ECR repo: `handycall-web`
- EB app: `handycall-web`
- EB environment: `handycall-web-lb`
- Container port: `3001`
- Version label format: `web-outbound-YYYYMMDD-HHMMSS-amd64`

Live infra notes:
- `handycall.org` and `www.handycall.org` Route53 A records alias to the load balancer behind `handycall-web-lb`
- The web EB environment is `64bit Amazon Linux 2023 v4.9.0 running Docker`
- The current web health check path is `/`
- `amplify.yml` remains in the repo as legacy config and is not the live production deployment path

## Required Local State Before Deploy
- Docker engine running
- AWS CLI installed and authenticated
- IAM permissions for ECR, S3, Elastic Beanstalk

## Minimal Deploy Run
```bash
cd packages/backend
bash ./deploy.sh
```

```bash
cd packages/web
bash ./deploy.sh
```

## Post-Deploy Checks
```bash
aws elasticbeanstalk describe-environments \
  --application-name handycall-api \
  --environment-names handycall-api-lb \
  --region us-east-1
```

```bash
aws elasticbeanstalk describe-environments \
  --application-name handycall-web \
  --environment-names handycall-web-lb \
  --region us-east-1
```

```bash
curl -I https://handycall.org
```
