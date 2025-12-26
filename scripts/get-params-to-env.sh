#!/bin/bash

# =============================================================================
# Download Parameters from SSM to .env format
# =============================================================================
# This script retrieves parameters from SSM and outputs them as .env format
# Usage: ./get-params-to-env.sh dev > ../packages/backend/.env
# =============================================================================

set -e

ENV=${1:-dev}
REGION=${AWS_REGION:-us-east-1}

# Retrieve all parameters and format as KEY=VALUE
aws ssm get-parameters-by-path \
  --path "/handycall/$ENV/" \
  --recursive \
  --with-decryption \
  --region "$REGION" \
  --query 'Parameters[*].[Name,Value]' \
  --output text | \
  while read -r name value; do
    # Extract key from path: /handycall/dev/KEY -> KEY
    key=$(echo "$name" | sed "s|^/handycall/$ENV/||")
    echo "$key=$value"
  done
