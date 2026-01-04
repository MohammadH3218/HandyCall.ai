#!/bin/bash

# HandyCall Backend Deployment Script
# Builds Docker image, pushes to ECR, and deploys to Elastic Beanstalk

set -e  # Exit on error

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="982081079378"
ECR_REPOSITORY="handycall-backend"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_NAME="${ECR_REGISTRY}/${ECR_REPOSITORY}"
EB_APP_NAME="handycall-backend"
EB_ENV_NAME="handycall-backend-env"  # Update this to your actual EB environment name

# Generate version tag with timestamp
VERSION_TAG=$(date +%Y%m%d-%H%M%S)-admin-role-fix
echo "Building version: ${VERSION_TAG}"

# Step 1: Build Docker image from monorepo root
echo "===== Building Docker image ====="
cd ../..  # Go to monorepo root
docker build -f packages/backend/Dockerfile -t ${ECR_REPOSITORY}:${VERSION_TAG} .
docker tag ${ECR_REPOSITORY}:${VERSION_TAG} ${ECR_REPOSITORY}:latest
cd packages/backend

# Step 2: Login to ECR
echo "===== Logging into ECR ====="
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

# Step 3: Tag and push to ECR
echo "===== Pushing to ECR ====="
docker tag ${ECR_REPOSITORY}:${VERSION_TAG} ${IMAGE_NAME}:${VERSION_TAG}
docker tag ${ECR_REPOSITORY}:${VERSION_TAG} ${IMAGE_NAME}:latest
docker push ${IMAGE_NAME}:${VERSION_TAG}
docker push ${IMAGE_NAME}:latest

# Step 4: Update Dockerrun.aws.json with new image tag
echo "===== Updating Dockerrun.aws.json ====="
cat > Dockerrun.aws.json <<EOF
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "${IMAGE_NAME}:${VERSION_TAG}",
    "Update": "true"
  },
  "Ports": [
    {
      "ContainerPort": 8080,
      "HostPort": 80
    }
  ],
  "Logging": "/var/log/nginx"
}
EOF

# Step 5: Create deployment package
echo "===== Creating deployment package ====="
zip -q backend-${VERSION_TAG}.zip Dockerrun.aws.json

# Step 6: Deploy to Elastic Beanstalk
echo "===== Deploying to Elastic Beanstalk ====="
aws elasticbeanstalk create-application-version \
  --application-name ${EB_APP_NAME} \
  --version-label ${VERSION_TAG} \
  --source-bundle S3Bucket="elasticbeanstalk-${AWS_REGION}-${AWS_ACCOUNT_ID}",S3Key="backend-${VERSION_TAG}.zip" \
  --region ${AWS_REGION}

# Upload to S3
aws s3 cp backend-${VERSION_TAG}.zip s3://elasticbeanstalk-${AWS_REGION}-${AWS_ACCOUNT_ID}/backend-${VERSION_TAG}.zip

# Update environment
echo "===== Updating environment ${EB_ENV_NAME} ====="
aws elasticbeanstalk update-environment \
  --application-name ${EB_APP_NAME} \
  --environment-name ${EB_ENV_NAME} \
  --version-label ${VERSION_TAG} \
  --region ${AWS_REGION}

echo ""
echo "===== Deployment initiated successfully! ====="
echo "Version: ${VERSION_TAG}"
echo "Image: ${IMAGE_NAME}:${VERSION_TAG}"
echo ""
echo "Monitor deployment status:"
echo "  aws elasticbeanstalk describe-environments --application-name ${EB_APP_NAME} --environment-names ${EB_ENV_NAME} --query 'Environments[0].Status'"
echo ""
echo "Or check in AWS Console:"
echo "  https://console.aws.amazon.com/elasticbeanstalk/home?region=${AWS_REGION}#/environment/dashboard?applicationName=${EB_APP_NAME}&environmentId=${EB_ENV_NAME}"
