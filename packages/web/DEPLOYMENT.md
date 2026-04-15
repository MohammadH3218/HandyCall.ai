# Web Deployment Guide - Elastic Beanstalk with Docker

Last updated: 2026-03-10

## Live Production Target
- AWS region: `us-east-1`
- AWS account: `982081079378`
- Elastic Beanstalk application: `handycall-web`
- Elastic Beanstalk environment: `handycall-web-lb`
- ECR repository: `handycall-web`
- Public domain: `https://handycall.org`
- Public aliases: `handycall.org`, `www.handycall.org`

## Runtime Facts
- Dockerfile: `packages/web/Dockerfile`
- Container port: `3001`
- EB platform: `64bit Amazon Linux 2023 v4.9.0 running Docker`
- EB health check path: `/`
- Version label pattern: `web-outbound-YYYYMMDD-HHMMSS-amd64`

## One-Command Deploy
```bash
cd packages/web
bash ./deploy.sh
```

The script:
1. Builds the image from the monorepo root with `packages/web/Dockerfile`
2. Pushes versioned and `latest` tags to ECR
3. Generates a temporary `Dockerrun.aws.json`
4. Uploads the deployment bundle to `s3://elasticbeanstalk-us-east-1-982081079378/handycall-web/`
5. Creates a new Elastic Beanstalk application version
6. Updates `handycall-web-lb`
7. Waits for the environment update to finish

## Prerequisites
- Docker daemon running
- AWS CLI authenticated with permissions for ECR, S3, and Elastic Beanstalk
- Access to account `982081079378`

## Verification
```bash
aws elasticbeanstalk describe-environments \
  --application-name handycall-web \
  --environment-names handycall-web-lb \
  --region us-east-1
```

```bash
curl -I https://handycall.org
```

## Notes
- `amplify.yml` still exists in the repo, but it is legacy and not the current production deployment path.
- This script creates its deployment bundle in a temporary directory and does not need a tracked `Dockerrun.aws.json` in `packages/web`.
