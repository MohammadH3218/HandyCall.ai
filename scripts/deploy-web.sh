#!/usr/bin/env bash
# Deploy HandyCall Next.js frontend → GitHub + Vercel
#
# What this does:
#   1. Commits any uncommitted changes and pushes to GitHub
#   2. Deploys to Vercel production via `vercel --prod`
#
# One-time GitHub auth setup (run once, then never again):
#   gh auth login
#   # Choose: GitHub.com → HTTPS → Login with a web browser
#
# Requirements:
#   - gh CLI installed and authenticated (see above)
#   - Vercel CLI installed: `npm i -g vercel`
#   - Vercel authenticated: `vercel login`
#   - Project linked: .vercel/project.json at repo root

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="deploy/local-sync-2026-03-06"

GREEN="\033[1;32m"
YELLOW="\033[1;33m"
RED="\033[1;31m"
RESET="\033[0m"

info()  { echo -e "${YELLOW}  $1${RESET}"; }
done_() { echo -e "${GREEN}✓ $1${RESET}"; }
warn()  { echo -e "${RED}  ⚠ $1${RESET}"; }

cd "$REPO_ROOT"

# ── 1. Git: commit + push ─────────────────────────────────────────────────────

if git rev-parse --git-dir &>/dev/null; then
  # Stage everything (respects .gitignore)
  git add -A

  if ! git diff --cached --quiet; then
    MSG="deploy: $(date '+%Y-%m-%d %H:%M') — web build"
    git commit -m "$MSG" 2>/dev/null || true
    info "Committed: $MSG"
  else
    info "Git: nothing new to commit"
  fi

  # Push to GitHub (requires gh auth or SSH key)
  if gh auth status &>/dev/null 2>&1; then
    info "Pushing to GitHub (${BRANCH})..."
    git push origin "$BRANCH" 2>&1 && done_ "Pushed to github.com/MohammadH3218/HandyCall.ai (${BRANCH})" \
      || warn "Push failed — check gh auth status"
  else
    warn "GitHub auth not set up — skipping push"
    warn "Run once to fix: gh auth login"
  fi
else
  warn "No git repo found at $REPO_ROOT — skipping GitHub push"
fi

# ── 2. Vercel: deploy to production ──────────────────────────────────────────

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
  exit 1
fi

info "Deploying to Vercel (production)..."
vercel --prod

echo ""
done_ "Web deployed → https://handycall.org"
echo ""
echo "  GitHub:    https://github.com/MohammadH3218/HandyCall.ai/tree/${BRANCH}"
echo "  Vercel:    https://vercel.com/dashboard"
