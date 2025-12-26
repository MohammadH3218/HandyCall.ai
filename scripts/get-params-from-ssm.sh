#!/bin/bash

# =============================================================================
# Retrieve Parameters from AWS Systems Manager Parameter Store
# =============================================================================
# This script retrieves all parameters for a specific environment
# =============================================================================

set -e

ENV=${1:-dev}
REGION=${AWS_REGION:-us-east-1}

echo "=================================================="
echo "Retrieving Parameters from AWS SSM"
echo "=================================================="
echo "Environment: $ENV"
echo "Region: $REGION"
echo "Parameter Path: /handycall/$ENV/"
echo "=================================================="
echo ""

# Retrieve all parameters
aws ssm get-parameters-by-path \
  --path "/handycall/$ENV/" \
  --recursive \
  --with-decryption \
  --region "$REGION" \
  --query 'Parameters[*].[Name,Value,Type]' \
  --output table

echo ""
echo "=================================================="
echo "To create a .env file from these parameters:"
echo "./get-params-to-env.sh $ENV > ../packages/backend/.env"
echo "=================================================="
