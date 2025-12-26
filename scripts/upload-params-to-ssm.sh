#!/bin/bash

# =============================================================================
# Upload Environment Variables to AWS Systems Manager Parameter Store
# =============================================================================
# This script reads from .env file and uploads all parameters to SSM
# Parameters are stored with prefix: /handycall/{env}/
# =============================================================================

set -e

ENV=${1:-dev}
REGION=${AWS_REGION:-us-east-1}
ENV_FILE="../packages/backend/.env"

echo "=================================================="
echo "Uploading Parameters to AWS SSM Parameter Store"
echo "=================================================="
echo "Environment: $ENV"
echo "Region: $REGION"
echo "Parameter Prefix: /handycall/$ENV/"
echo "=================================================="

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Error: .env file not found at $ENV_FILE"
  exit 1
fi

# Function to upload a parameter
upload_param() {
  local key=$1
  local value=$2
  local param_name="/handycall/$ENV/$key"

  # Skip empty values
  if [ -z "$value" ]; then
    echo "⏭️  Skipping empty parameter: $key"
    return
  fi

  # Determine parameter type (SecureString for sensitive data)
  local param_type="String"
  if [[ $key == *"SECRET"* ]] || [[ $key == *"PASSWORD"* ]] || [[ $key == *"KEY"* ]]; then
    param_type="SecureString"
  fi

  echo "📤 Uploading: $param_name (Type: $param_type)"

  aws ssm put-parameter \
    --name "$param_name" \
    --value "$value" \
    --type "$param_type" \
    --region "$REGION" \
    --overwrite \
    --tier "Standard" \
    2>/dev/null || echo "⚠️  Warning: Failed to upload $param_name"
}

# Read .env file and upload parameters
echo ""
echo "Reading from: $ENV_FILE"
echo ""

while IFS='=' read -r key value; do
  # Skip comments and empty lines
  if [[ $key =~ ^#.*$ ]] || [[ -z $key ]]; then
    continue
  fi

  # Remove leading/trailing whitespace
  key=$(echo "$key" | xargs)
  value=$(echo "$value" | xargs)

  # Remove quotes from value if present
  value="${value%\"}"
  value="${value#\"}"

  upload_param "$key" "$value"

done < "$ENV_FILE"

echo ""
echo "=================================================="
echo "✅ Parameters uploaded successfully!"
echo "=================================================="
echo ""
echo "To view all parameters:"
echo "aws ssm get-parameters-by-path --path /handycall/$ENV/ --region $REGION --recursive"
echo ""
echo "To use in your application:"
echo "Set NODE_ENV=$ENV and the app will automatically fetch from SSM"
echo "=================================================="
