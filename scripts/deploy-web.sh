#!/usr/bin/env bash
# Deploy HandyCall Next.js frontend → Vercel
#
# What this does:
#   1. Checks Vercel CLI is installed and authenticated
#   2. Runs `vercel --prod` from repo root (picks up .vercel/project.json)
#
# Requirements:
#   - Vercel CLI installed: `npm i -g vercel`
#   - Authenticated: `vercel login`
#   - Project linked: .vercel/project.json must exist at repo root
#     (If missing, run `vercel link` from repo root first)
#   - Env vars set in Vercel dashboard (see DEPLOY.md)
#
# Note: Vercel auto-deploys on push to the linked Git branch.
# Run this script for a manual / out-of-band production deploy.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

GREEN="\033[1;32m"
YELLOW="\033[1;33m"
RESET="\033[0m"

info()  { echo -e "${YELLOW}  $1${RESET}"; }
done_() { echo -e "${GREEN}✓ $1${RESET}"; }

# ── Preflight checks ──────────────────────────────────────────────────────────

if ! command -v vercel &>/dev/null; then
  info "Vercel CLI not found — installing..."
  npm install -g vercel@latest
fi

if ! vercel whoami &>/dev/null 2>&1; then
  echo "Not authenticated with Vercel. Run: vercel login"
  exit 1
fi

if [ ! -f "$REPO_ROOT/.vercel/project.json" ]; then
  echo "Project not linked. Run from repo root: vercel link"
  echo "Then re-run this script."
  exit 1
fi

# ── Deploy ────────────────────────────────────────────────────────────────────

info "Deploying to Vercel (production)..."
cd "$REPO_ROOT"
vercel --prod

echo ""
done_ "Web deployed → https://handycall.org"
echo ""
echo "  Dashboard: https://vercel.com/dashboard"
echo "  Logs:      vercel logs --follow"
