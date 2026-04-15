#!/usr/bin/env bash
# Provision / verify HandyCall AWS infrastructure
#
# Run this once for a fresh environment, or after infra changes.
# Safe to re-run — all steps are idempotent.
#
# Covers:
#   - S3 bucket (media storage)
#   - S3 CORS policy (browser uploads)
#   - DynamoDB tables (calls create-marketplace-tables.sh)
#   - SES sender identity verification
#   - SSM Parameter Store secrets (interactive prompt)
#
# Required env vars (or set via aws configure):
#   AWS_REGION            — default: me-central-1 (Saudi Arabia, for DynamoDB + PDPL)
#   S3_REGION             — default: us-east-1  (S3 is global, bucket lives here)
#   S3_BUCKET             — default: handycall-media-prod-982081079378
#   DYNAMODB_TABLE_PREFIX — default: handycall_prod_
#   SES_FROM_EMAIL        — default: no-reply@handycall.org
#   ENV                   — default: prod (used for SSM path: /handycall/{ENV}/...)
#
# Usage:
#   bash scripts/setup-aws.sh
#   ENV=staging bash scripts/setup-aws.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Configurable defaults — all match fly.toml production values
AWS_REGION="${AWS_REGION:-me-central-1}"
S3_REGION="${S3_REGION:-us-east-1}"
S3_BUCKET="${S3_BUCKET:-handycall-media-prod-982081079378}"
DYNAMODB_TABLE_PREFIX="${DYNAMODB_TABLE_PREFIX:-handycall_prod_}"
SES_FROM_EMAIL="${SES_FROM_EMAIL:-no-reply@handycall.org}"
ENV="${ENV:-prod}"
SSM_PATH="/handycall/$ENV"

GREEN="\033[1;32m"
YELLOW="\033[1;33m"
BLUE="\033[1;34m"
RED="\033[1;31m"
RESET="\033[0m"

section() { echo -e "\n${BLUE}── $1 ─────────────────────────────────────${RESET}"; }
info()    { echo -e "${YELLOW}  $1${RESET}"; }
done_()   { echo -e "${GREEN}  ✓ $1${RESET}"; }
warn()    { echo -e "${RED}  ⚠ $1${RESET}"; }

# ── Preflight ─────────────────────────────────────────────────────────────────

if ! command -v aws &>/dev/null; then
  echo "AWS CLI not found."
  echo "Install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
  exit 1
fi

echo ""
info "Verifying AWS credentials..."
CALLER=$(aws sts get-caller-identity --output json 2>/dev/null) || {
  echo "AWS credentials not configured or expired."
  echo "Run: aws configure  (or set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY)"
  exit 1
}
ACCOUNT_ID=$(echo "$CALLER" | grep -o '"Account": "[^"]*"' | cut -d'"' -f4)
done_ "Authenticated as account $ACCOUNT_ID"

echo ""
echo "  Region (DynamoDB): $AWS_REGION"
echo "  Region (S3):       $S3_REGION"
echo "  S3 bucket:         $S3_BUCKET"
echo "  Table prefix:      $DYNAMODB_TABLE_PREFIX"
echo "  SES from:          $SES_FROM_EMAIL"
echo "  SSM path:          $SSM_PATH"
echo ""
read -rp "Continue? [y/N] " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

# ── S3 Bucket ─────────────────────────────────────────────────────────────────

section "S3 Media Bucket"

if aws s3api head-bucket --bucket "$S3_BUCKET" --region "$S3_REGION" 2>/dev/null; then
  done_ "Bucket already exists: s3://$S3_BUCKET"
else
  info "Creating bucket $S3_BUCKET in $S3_REGION..."
  if [ "$S3_REGION" = "us-east-1" ]; then
    # us-east-1 does not accept LocationConstraint
    aws s3api create-bucket \
      --bucket "$S3_BUCKET" \
      --region "$S3_REGION"
  else
    aws s3api create-bucket \
      --bucket "$S3_BUCKET" \
      --region "$S3_REGION" \
      --create-bucket-configuration LocationConstraint="$S3_REGION"
  fi
  done_ "Bucket created"
fi

# Block all public access
info "Applying public-access block..."
aws s3api put-public-access-block \
  --bucket "$S3_BUCKET" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --region "$S3_REGION"
done_ "Public access blocked"

# Enable versioning
info "Enabling versioning..."
aws s3api put-bucket-versioning \
  --bucket "$S3_BUCKET" \
  --versioning-configuration Status=Enabled \
  --region "$S3_REGION"
done_ "Versioning enabled"

# CORS for browser-side presigned uploads
info "Setting CORS policy..."
aws s3api put-bucket-cors \
  --bucket "$S3_BUCKET" \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedOrigins": ["https://handycall.org", "https://www.handycall.org", "http://localhost:3001"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders":  ["ETag"],
      "MaxAgeSeconds":  3600
    }]
  }' \
  --region "$S3_REGION"
done_ "CORS configured"

# ── DynamoDB Tables ───────────────────────────────────────────────────────────

section "DynamoDB Tables (region: $AWS_REGION)"

if [ -f "$REPO_ROOT/scripts/create-marketplace-tables.sh" ]; then
  export AWS_REGION="$AWS_REGION"
  export DYNAMODB_TABLE_PREFIX="$DYNAMODB_TABLE_PREFIX"
  bash "$REPO_ROOT/scripts/create-marketplace-tables.sh"
else
  warn "create-marketplace-tables.sh not found — skipping DynamoDB setup"
fi

# ── SES Email Identity ────────────────────────────────────────────────────────

section "SES Email Identity (region: us-east-1)"

SES_STATUS=$(aws sesv2 get-email-identity \
  --email-identity "$SES_FROM_EMAIL" \
  --region us-east-1 \
  --query 'VerificationStatus' \
  --output text 2>/dev/null || echo "NOT_FOUND")

case "$SES_STATUS" in
  SUCCESS)
    done_ "SES identity verified: $SES_FROM_EMAIL"
    ;;
  PENDING)
    warn "SES identity is pending verification. Check your email."
    ;;
  NOT_FOUND)
    info "Registering SES identity $SES_FROM_EMAIL..."
    aws sesv2 create-email-identity \
      --email-identity "$SES_FROM_EMAIL" \
      --region us-east-1 || true
    warn "Verification email sent to $SES_FROM_EMAIL — click the link to verify."
    ;;
  *)
    warn "SES status: $SES_STATUS — check AWS console."
    ;;
esac

# If account is in SES sandbox, note it
info "Checking SES sandbox status..."
SANDBOX=$(aws sesv2 get-account --region us-east-1 --query 'ProductionAccessEnabled' --output text 2>/dev/null || echo "unknown")
if [ "$SANDBOX" = "False" ]; then
  warn "SES account is in SANDBOX mode — only verified addresses can receive email."
  warn "Request production access in the AWS console: SES → Account dashboard."
fi

# ── SSM Parameter Store (secrets) ─────────────────────────────────────────────

section "SSM Parameter Store (region: $AWS_REGION)"
echo ""
echo "  The following secrets must be stored in SSM Parameter Store."
echo "  Path convention: $SSM_PATH/<KEY>"
echo ""
echo "  Run the commands below for each secret you haven't set yet:"
echo ""

SSM_SECRETS=(
  "JWT_SECRET:Random 64-char string for signing JWTs"
  "AWS_ACCESS_KEY_ID:IAM key used by the Fly.io container"
  "AWS_SECRET_ACCESS_KEY:IAM secret used by the Fly.io container"
  "HYPERPAY_ACCESS_TOKEN:HyperPay payment gateway token"
  "HYPERPAY_ENTITY_ID_MADA:HyperPay entity ID for Mada"
  "HYPERPAY_ENTITY_ID_VISA:HyperPay entity ID for Visa/MC"
  "COGNITO_CLIENT_SECRET:AWS Cognito app client secret"
  "NEXTAUTH_SECRET:Random 32-char string for NextAuth sessions"
)

for secret in "${SSM_SECRETS[@]}"; do
  KEY="${secret%%:*}"
  DESC="${secret#*:}"
  # Check if already set
  EXISTS=$(aws ssm get-parameter --name "$SSM_PATH/$KEY" \
    --region "$AWS_REGION" --query 'Parameter.Name' --output text 2>/dev/null || echo "")
  if [ -n "$EXISTS" ]; then
    done_ "$KEY already set in SSM"
  else
    echo "  # $DESC"
    echo "  aws ssm put-parameter \\"
    echo "    --name \"$SSM_PATH/$KEY\" \\"
    echo "    --value \"<YOUR_VALUE>\" \\"
    echo "    --type SecureString \\"
    echo "    --region $AWS_REGION"
    echo ""
  fi
done

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}── AWS setup complete ──────────────────────────────${RESET}"
echo ""
echo "  Next steps:"
echo "  1. Set any missing SSM secrets shown above"
echo "  2. Set Fly.io secrets:  bash scripts/deploy-api.sh  (or see DEPLOY.md)"
echo "  3. Set Vercel env vars in the Vercel dashboard (see DEPLOY.md)"
echo ""
