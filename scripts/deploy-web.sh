#!/usr/bin/env bash
# =============================================================================
# HandyCall — Commit web changes + deploy to Elastic Beanstalk
# =============================================================================
# Usage:
#   bash scripts/deploy-web.sh                     # auto commit message
#   bash scripts/deploy-web.sh "my commit message" # custom message
#
# What it does:
#   1. Preflight checks (docker, aws, git)
#   2. Stages all modified files under packages/web/src/
#   3. Commits and pushes to the current branch
#   4. Calls packages/web/deploy.sh (Docker build → ECR → Elastic Beanstalk)
# =============================================================================

set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Resolve paths ─────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WEB_DIR="${REPO_ROOT}/packages/web"
DEPLOY_SCRIPT="${WEB_DIR}/deploy.sh"

COMMIT_MSG="${1:-"feat(web): redesign landing page — Sophiie-style layout with emerald theme"}"

echo ""
echo "========================================================"
echo "  HandyCall Web Deploy"
echo "========================================================"
echo "  Repo:    ${REPO_ROOT}"
echo "  Target:  handycall-web-lb  (handycall.org)"
echo "  Branch:  $(git -C "${REPO_ROOT}" rev-parse --abbrev-ref HEAD)"
echo "========================================================"
echo ""

# =============================================================================
# STEP 1 — Preflight checks
# =============================================================================
info "Checking prerequisites..."

command -v aws    >/dev/null 2>&1 || error "aws CLI not found. Install it: https://aws.amazon.com/cli/"
command -v docker >/dev/null 2>&1 || error "docker not found. Install Docker Desktop."
command -v git    >/dev/null 2>&1 || error "git not found."
[[ -f "${DEPLOY_SCRIPT}" ]]       || error "deploy.sh not found at ${DEPLOY_SCRIPT}"

aws sts get-caller-identity --region us-east-1 >/dev/null 2>&1 \
  || error "AWS credentials not configured or expired. Run 'aws configure' or refresh your session."

docker info >/dev/null 2>&1 \
  || error "Docker daemon is not running. Start Docker Desktop."

success "All prerequisites met."
echo ""

# =============================================================================
# STEP 2 — Git: stage web changes, commit, push
# =============================================================================
echo "========================================================"
echo "  STEP 1: Commit and push web changes"
echo "========================================================"

cd "${REPO_ROOT}"

BRANCH=$(git rev-parse --abbrev-ref HEAD)
REMOTE=$(git remote | head -1)
[[ -z "${REMOTE}" ]] && error "No git remote configured."

# Stage everything under packages/web/src (only tracked & modified files)
info "Staging changes under packages/web/src/ ..."
git add packages/web/src/

# Also pick up any other web-level files that are modified
for f in packages/web/package.json packages/web/next.config.js packages/web/tailwind.config.js; do
  if git diff --name-only HEAD -- "${f}" | grep -q . \
  || git diff --cached --name-only -- "${f}" | grep -q .; then
    git add "${f}"
    info "Staged: ${f}"
  fi
done

# Check if anything is actually staged
if git diff --cached --quiet; then
  warn "Nothing to commit — working tree is clean. Skipping git step."
else
  STAGED_FILES=$(git diff --cached --name-only | tr '\n' ' ')
  info "Staged files: ${STAGED_FILES}"

  git commit -m "$(cat <<EOF
${COMMIT_MSG}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
  success "Committed."

  info "Pushing '${BRANCH}' to ${REMOTE}..."
  git push "${REMOTE}" "${BRANCH}"
  success "Pushed to GitHub."
fi
echo ""

# =============================================================================
# STEP 2 — Docker build → ECR → Elastic Beanstalk
# =============================================================================
echo "========================================================"
echo "  STEP 2: Build Docker image and deploy to Elastic Beanstalk"
echo "========================================================"
echo ""

bash "${DEPLOY_SCRIPT}"

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "========================================================"
echo -e "  ${GREEN}Deploy complete!${NC}"
echo "========================================================"
echo ""
echo "  Branch:  ${BRANCH}"
echo "  Live at: https://handycall.org"
echo ""
echo "  Verify:"
echo "    curl -sI https://handycall.org | head -5"
echo ""
echo "  Monitor EB:"
echo "    aws elasticbeanstalk describe-environments \\"
echo "      --application-name handycall-web \\"
echo "      --environment-names handycall-web-lb \\"
echo "      --query 'Environments[0].{Status:Status,Health:Health,Version:VersionLabel}' \\"
echo "      --output table"
echo ""
