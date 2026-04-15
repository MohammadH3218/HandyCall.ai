#!/usr/bin/env bash
# Deploy HandyCall NestJS backend → Fly.io
#
# What this does:
#   1. Builds shared package (backend depends on it)
#   2. Runs `fly deploy` from repo root (uses Dockerfile + fly.toml)
#   3. Waits for health check and prints status
#
# Requirements:
#   - fly CLI installed (https://fly.io/docs/getting-started/installing-flyctl/)
#   - Authenticated: `fly auth login`
#   - Secrets set on the app (see DEPLOY.md)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="handycall-api"

GREEN="\033[1;32m"
YELLOW="\033[1;33m"
RESET="\033[0m"

info()  { echo -e "${YELLOW}  $1${RESET}"; }
done_() { echo -e "${GREEN}✓ $1${RESET}"; }

# ── Preflight checks ──────────────────────────────────────────────────────────

if ! command -v fly &>/dev/null; then
  echo "fly CLI not found."
  echo "Install: curl -L https://fly.io/install.sh | sh"
  exit 1
fi

if ! fly auth whoami &>/dev/null 2>&1; then
  echo "Not authenticated with Fly.io. Run: fly auth login"
  exit 1
fi

# ── Build shared package ───────────────────────────────────────────────────────
# The Dockerfile handles this inside the container, but building locally
# first catches TypeScript errors before pushing to Fly.

info "Building @handycall/shared..."
(cd "$REPO_ROOT/packages/shared" && npm run build)
done_ "Shared package built"

# ── Deploy ────────────────────────────────────────────────────────────────────

info "Running fly deploy (this builds the Docker image and deploys)..."
cd "$REPO_ROOT"
fly deploy --app "$APP_NAME"

# ── Post-deploy ───────────────────────────────────────────────────────────────

echo ""
fly status --app "$APP_NAME"
echo ""
done_ "API deployed → https://$APP_NAME.fly.dev"
echo ""
echo "  Health check: https://$APP_NAME.fly.dev/api/v1/health"
echo "  Logs:         fly logs --app $APP_NAME"
echo "  SSH:          fly ssh console --app $APP_NAME"
