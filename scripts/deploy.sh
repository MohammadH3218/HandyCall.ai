#!/usr/bin/env bash
# HandyCall — master deploy script
# Referenced by root package.json: "deploy": "bash scripts/deploy.sh"
#
# Usage:
#   bash scripts/deploy.sh          # deploy everything (api + web)
#   bash scripts/deploy.sh api      # Fly.io only
#   bash scripts/deploy.sh web      # Vercel only
#   bash scripts/deploy.sh aws      # AWS infra setup (first-time / infra changes only)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS="$REPO_ROOT/scripts"
COMPONENT="${1:-all}"

GREEN="\033[1;32m"
RED="\033[1;31m"
BLUE="\033[1;34m"
RESET="\033[0m"

step()  { echo -e "\n${BLUE}▶ $1${RESET}"; }
done_() { echo -e "${GREEN}✓ $1${RESET}"; }
fail()  { echo -e "${RED}✗ $1${RESET}" >&2; exit 1; }

case "$COMPONENT" in
  api)
    step "Deploying API → Fly.io"
    bash "$SCRIPTS/deploy-api.sh"
    ;;

  web)
    step "Deploying Web → Vercel"
    bash "$SCRIPTS/deploy-web.sh"
    ;;

  aws)
    step "Setting up AWS infrastructure"
    bash "$SCRIPTS/setup-aws.sh"
    ;;

  all)
    step "Deploying API → Fly.io"
    bash "$SCRIPTS/deploy-api.sh"

    step "Deploying Web → Vercel"
    bash "$SCRIPTS/deploy-web.sh"

    done_ "All services deployed successfully"
    echo ""
    echo "  API → https://handycall-api.fly.dev"
    echo "  Web → https://handycall.org"
    ;;

  *)
    echo "Usage: $0 [all|api|web|aws]"
    echo ""
    echo "  all  — deploy API (Fly.io) then Web (Vercel)  [default]"
    echo "  api  — deploy NestJS backend to Fly.io"
    echo "  web  — deploy Next.js frontend to Vercel"
    echo "  aws  — provision AWS infra (DynamoDB, S3, SES)"
    exit 1
    ;;
esac
