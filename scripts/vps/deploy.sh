#!/usr/bin/env bash
set -euo pipefail

# Guard against double-sourcing
if [ -n "${RPS_DEPLOY_SCRIPT_SOURCED:-}" ]; then
  echo "Deploy script already sourced, skipping..."
  return 0 2>/dev/null || exit 0
fi

export RPS_DEPLOY_SCRIPT_SOURCED=1

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BRANCH="${1:-main}"
ENVIRONMENT="${2:-production}"

# Source scripts
for script in "$REPO_ROOT/scripts/"*.sh; do
  [ -f "$script" ] && source "$script"
done

log() {
  printf "[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_command git
require_command npm

# Setup SSH for GitHub authentication using existing id_deploy key
# Configure Git to use id_deploy for all operations
export GIT_SSH_COMMAND="ssh -i ~/.ssh/id_deploy -o StrictHostKeyChecking=no"
ssh -T git@github.com 2>&1 || true

cd "$REPO_ROOT"

log "Deploying branch: $BRANCH"
log "Environment: $ENVIRONMENT"
log "Repository: $REPO_ROOT"

git fetch --all --prune
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [ ! -f "rps-backend/rps-backend/.env" ]; then
  cp "rps-backend/rps-backend/.env.example" "rps-backend/rps-backend/.env"
  log "Created rps-backend/rps-backend/.env from .env.example (adjust DB credentials)."
fi

if [ ! -f "rps-frontend/nextjs-app/.env.local" ]; then
  cat > "rps-frontend/nextjs-app/.env.local" <<'EOF'
NEXT_PUBLIC_API_URL=http://127.0.0.1:3000
API_URL=http://127.0.0.1:3000
NEXT_PUBLIC_STRAPI_URL=
STRAPI_API_TOKEN=
EOF
  log "Created rps-frontend/nextjs-app/.env.local with default values."
fi

log "Installing and building backend"
cd "$REPO_ROOT/rps-backend/rps-backend"
npm ci
npm run build

log "Installing and building frontend"
cd "$REPO_ROOT/rps-frontend/nextjs-app"
npm ci
npm run build

if ! command -v pm2 >/dev/null 2>&1; then
  log "PM2 not found. Installing PM2 globally"
  sudo npm install -g pm2
fi

cd "$REPO_ROOT"
log "Starting/reloading applications with PM2"
pm2 startOrReload scripts/vps/ecosystem.config.cjs --update-env
pm2 save

log "Deployment completed successfully"
