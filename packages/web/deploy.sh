#!/bin/bash

# HandyCall Web Deployment Script
# Builds Docker image, pushes to ECR, and deploys to Elastic Beanstalk

set -euo pipefail

AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="982081079378"
ECR_REPOSITORY="handycall-web"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_NAME="${ECR_REGISTRY}/${ECR_REPOSITORY}"
EB_APP_NAME="handycall-web"
EB_ENV_NAME="handycall-web-lb"
S3_BUCKET="elasticbeanstalk-${AWS_REGION}-${AWS_ACCOUNT_ID}"
S3_PREFIX="handycall-web"
BUILD_PLATFORM="linux/amd64"
CONTAINER_PORT="3001"
HOST_PORT="80"

VERSION_TAG="web-outbound-$(date +%Y%m%d-%H%M%S)-amd64"
echo "Building version: ${VERSION_TAG}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TMP_DIR="$(mktemp -d)"
ZIP_FILE="${TMP_DIR}/${VERSION_TAG}.zip"

cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

echo "===== Building Docker image ====="
cd "${REPO_ROOT}"
docker build \
  --platform "${BUILD_PLATFORM}" \
  -f packages/web/Dockerfile \
  -t "${ECR_REPOSITORY}:${VERSION_TAG}" \
  .
docker tag "${ECR_REPOSITORY}:${VERSION_TAG}" "${ECR_REPOSITORY}:latest"

echo "===== Logging into ECR ====="
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

echo "===== Ensuring ECR repository exists ====="
aws ecr describe-repositories --repository-names "${ECR_REPOSITORY}" --region "${AWS_REGION}" >/dev/null 2>&1 || \
  aws ecr create-repository --repository-name "${ECR_REPOSITORY}" --region "${AWS_REGION}" >/dev/null

echo "===== Pushing Docker images ====="
docker tag "${ECR_REPOSITORY}:${VERSION_TAG}" "${IMAGE_NAME}:${VERSION_TAG}"
docker tag "${ECR_REPOSITORY}:${VERSION_TAG}" "${IMAGE_NAME}:latest"
docker push "${IMAGE_NAME}:${VERSION_TAG}"
docker push "${IMAGE_NAME}:latest"

echo "===== Creating Dockerrun bundle ====="
cat > "${TMP_DIR}/Dockerrun.aws.json" <<EOF
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "${IMAGE_NAME}:${VERSION_TAG}",
    "Update": "true"
  },
  "Ports": [
    {
      "ContainerPort": ${CONTAINER_PORT},
      "HostPort": ${HOST_PORT}
    }
  ],
  "Logging": "/var/log/nginx"
}
EOF

mkdir -p "${TMP_DIR}/.platform/nginx/conf.d"
cat > "${TMP_DIR}/.platform/nginx/conf.d/proxy_buffers.conf" <<'NGINX'
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;
NGINX

(
  cd "${TMP_DIR}"
  zip -q "${ZIP_FILE}" Dockerrun.aws.json
  zip -qr "${ZIP_FILE}" .platform/
)

echo "===== Uploading bundle to S3 ====="
S3_KEY="${S3_PREFIX}/${VERSION_TAG}.zip"
aws s3 cp "${ZIP_FILE}" "s3://${S3_BUCKET}/${S3_KEY}"

echo "===== Creating Elastic Beanstalk application version ====="
aws elasticbeanstalk create-application-version \
  --application-name "${EB_APP_NAME}" \
  --version-label "${VERSION_TAG}" \
  --source-bundle "S3Bucket=${S3_BUCKET},S3Key=${S3_KEY}" \
  --region "${AWS_REGION}"

for i in {1..10}; do
  if aws elasticbeanstalk describe-application-versions \
    --application-name "${EB_APP_NAME}" \
    --version-labels "${VERSION_TAG}" \
    --region "${AWS_REGION}" \
    --query "ApplicationVersions[0].VersionLabel" \
    --output text 2>/dev/null | grep -q "${VERSION_TAG}"; then
    break
  fi
  sleep 2
done

echo "===== Updating Elastic Beanstalk environment ${EB_ENV_NAME} ====="
aws elasticbeanstalk update-environment \
  --application-name "${EB_APP_NAME}" \
  --environment-name "${EB_ENV_NAME}" \
  --version-label "${VERSION_TAG}" \
  --region "${AWS_REGION}"

echo "===== Waiting for environment update ====="
aws elasticbeanstalk wait environment-updated \
  --application-name "${EB_APP_NAME}" \
  --environment-names "${EB_ENV_NAME}" \
  --region "${AWS_REGION}"

echo ""
echo "===== Web deployment completed ====="
echo "Version: ${VERSION_TAG}"
echo "Image: ${IMAGE_NAME}:${VERSION_TAG}"
echo "Environment: ${EB_ENV_NAME}"
echo ""
aws elasticbeanstalk describe-environments \
  --application-name "${EB_APP_NAME}" \
  --environment-names "${EB_ENV_NAME}" \
  --region "${AWS_REGION}" \
  --query "Environments[0].{Status:Status,Health:Health,VersionLabel:VersionLabel,CNAME:CNAME}" \
  --output table
