#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
APP_NAME="${WEB_EB_APP_NAME:-handycall-web}"
ENV_NAME="${WEB_EB_ENV_NAME:-handycall-web-lb}"
IMAGE_NAME="${WEB_ECR_REPOSITORY:-handycall-web}"
CONTAINER_PORT="${WEB_CONTAINER_PORT:-3001}"
HOST_PORT="${WEB_HOST_PORT:-80}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text --region "${AWS_REGION}")"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
ECR_URI="${ECR_REGISTRY}/${IMAGE_NAME}"
S3_BUCKET="elasticbeanstalk-${AWS_REGION}-${ACCOUNT_ID}"
VERSION_TAG="web-$(date +%Y%m%d-%H%M%S)"

aws ecr describe-repositories --repository-names "${IMAGE_NAME}" --region "${AWS_REGION}" >/dev/null 2>&1 || \
  aws ecr create-repository --repository-name "${IMAGE_NAME}" --region "${AWS_REGION}" >/dev/null

aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

docker build --platform linux/amd64 -f packages/web/Dockerfile -t "${IMAGE_NAME}:${VERSION_TAG}" .
docker tag "${IMAGE_NAME}:${VERSION_TAG}" "${ECR_URI}:${VERSION_TAG}"
docker tag "${IMAGE_NAME}:${VERSION_TAG}" "${ECR_URI}:latest"
docker push "${ECR_URI}:${VERSION_TAG}"
docker push "${ECR_URI}:latest"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "${WORK_DIR}"' EXIT

cat > "${WORK_DIR}/Dockerrun.aws.json" <<JSON
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "${ECR_URI}:${VERSION_TAG}",
    "Update": "true"
  },
  "Ports": [
    {
      "ContainerPort": ${CONTAINER_PORT},
      "HostPort": ${HOST_PORT}
    }
  ]
}
JSON

(cd "${WORK_DIR}" && zip -q "${VERSION_TAG}.zip" Dockerrun.aws.json)
aws s3 cp "${WORK_DIR}/${VERSION_TAG}.zip" "s3://${S3_BUCKET}/${APP_NAME}/${VERSION_TAG}.zip" --region "${AWS_REGION}"

aws elasticbeanstalk create-application-version \
  --application-name "${APP_NAME}" \
  --version-label "${VERSION_TAG}" \
  --source-bundle "S3Bucket=${S3_BUCKET},S3Key=${APP_NAME}/${VERSION_TAG}.zip" \
  --region "${AWS_REGION}" >/dev/null

aws elasticbeanstalk update-environment \
  --application-name "${APP_NAME}" \
  --environment-name "${ENV_NAME}" \
  --version-label "${VERSION_TAG}" \
  --region "${AWS_REGION}" >/dev/null

echo "Deployed ${APP_NAME}/${ENV_NAME} version ${VERSION_TAG}"
