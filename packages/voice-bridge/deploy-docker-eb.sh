#!/usr/bin/env bash
set -e

APP_NAME="${VOICE_BRIDGE_EB_APP_NAME:-handycall-voice-bridge}"
ENV_NAME="${VOICE_BRIDGE_EB_ENV_NAME:-handycall-voice-bridge-alb}"
REGION="${VOICE_BRIDGE_AWS_REGION:-us-east-1}"
IMAGE_NAME="handycall-voice-bridge"

echo "========================================"
echo "HandyCall Voice Bridge Docker EB Deploy"
echo "========================================"
echo ""

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${IMAGE_NAME}"

echo "Ensuring ECR repo exists..."
if ! aws ecr describe-repositories --repository-names "${IMAGE_NAME}" --region "${REGION}" >/dev/null 2>&1; then
  aws ecr create-repository --repository-name "${IMAGE_NAME}" --region "${REGION}" >/dev/null
fi

echo "Logging into ECR..."
aws ecr get-login-password --region "${REGION}" | docker login --username AWS --password-stdin "${ECR_REPO}"

echo "Building Docker image..."
# Fix path reference -- the ps1 script was run from the root of the project.
# Since this script is in voice-bridge folder, if we run it from root, it works. Let's make sure it runs from root!
cd "$(dirname "$0")/../.." # go to project root
docker build -f packages/voice-bridge/Dockerfile -t "${IMAGE_NAME}:latest" .

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
IMAGE_TAG="${ECR_REPO}:${TIMESTAMP}"
IMAGE_LATEST="${ECR_REPO}:latest"

docker tag "${IMAGE_NAME}:latest" "${IMAGE_TAG}"
docker tag "${IMAGE_NAME}:latest" "${IMAGE_LATEST}"
docker push "${IMAGE_TAG}"
docker push "${IMAGE_LATEST}"

echo "Creating Dockerrun bundle..."
DEPLOY_DIR=".deploy/voice-bridge"
rm -rf "${DEPLOY_DIR}"
mkdir -p "${DEPLOY_DIR}"

cat <<EOF > "${DEPLOY_DIR}/Dockerrun.aws.json"
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "${IMAGE_TAG}",
    "Update": "true"
  },
  "Ports": [
    { "ContainerPort": 8080, "HostPort": 8080 }
  ]
}
EOF

ZIP_PATH="voice-bridge-deploy.zip"
rm -f "${ZIP_PATH}"

cd "${DEPLOY_DIR}"
zip -r "../../${ZIP_PATH}" Dockerrun.aws.json
cd ../..
if [ -d "packages/voice-bridge/.platform" ]; then
  cd "packages/voice-bridge"
  zip -r "../../${ZIP_PATH}" .platform
  cd ../..
fi

S3_BUCKET="elasticbeanstalk-${REGION}-${ACCOUNT_ID}"
S3_KEY="${APP_NAME}/deploy-docker-${TIMESTAMP}.zip"

if ! aws s3 ls "s3://${S3_BUCKET}" >/dev/null 2>&1; then
  aws s3 mb "s3://${S3_BUCKET}" --region "${REGION}"
fi

aws s3 cp "${ZIP_PATH}" "s3://${S3_BUCKET}/${S3_KEY}" --region "${REGION}"

VERSION_LABEL="docker-v-${TIMESTAMP}"
aws elasticbeanstalk create-application-version \
  --application-name "${APP_NAME}" \
  --version-label "${VERSION_LABEL}" \
  --source-bundle "S3Bucket=${S3_BUCKET},S3Key=${S3_KEY}" \
  --region "${REGION}" >/dev/null

aws elasticbeanstalk update-environment \
  --application-name "${APP_NAME}" \
  --environment-name "${ENV_NAME}" \
  --version-label "${VERSION_LABEL}" \
  --region "${REGION}" >/dev/null

echo "Deployment started for ${ENV_NAME} with version ${VERSION_LABEL}"
