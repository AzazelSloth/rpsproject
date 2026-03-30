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
require_command curl

# Try to load nvm and set Node.js 20+ if available
# This handles cases where Node.js is installed via nvm but not in the default PATH
for nvm_dir in "$HOME/.nvm/versions/node/"*; do
  if [ -d "$nvm_dir" ]; then
    export PATH="$nvm_dir/bin:$PATH"
    log "Loaded Node.js from nvm: $(node -v)"
    break
  fi
done

# Also try to load from standard nvm locations
[ -s "$HOME/.nvm/nvm.sh" ] && source "$HOME/.nvm/nvm.sh" 2>/dev/null || true
[ -s "$HOME/.profile" ] && source "$HOME/.profile" 2>/dev/null || true
[ -s "$HOME/.bashrc" ] && source "$HOME/.bashrc" 2>/dev/null || true
[ -s "$HOME/.bash_profile" ] && source "$HOME/.bash_profile" 2>/dev/null || true

# Try to find node using which/command -v
NODE_BIN=$(command -v node 2>/dev/null || echo "")
if [ -n "$NODE_BIN" ]; then
  log "Found node at: $NODE_BIN"
else
  # Try common Node.js installation paths
  for path in /usr/local/bin/node /usr/bin/node "$HOME/.local/bin/node"; do
    if [ -x "$path" ]; then
      export PATH="$(dirname "$path"):$PATH"
      log "Found Node.js at: $path"
      break
    fi
  done
fi

# Check Node.js version
NODE_VERSION=$(node -v 2>/dev/null || echo "not found")
log "Node.js version: $NODE_VERSION"

NODE_MAJOR_VERSION=$(echo "$NODE_VERSION" | cut -d. -f1 | tr -d 'v' || echo "0")

if [ "$NODE_MAJOR_VERSION" = "0" ] || [ "$NODE_MAJOR_VERSION" = "" ]; then
  log "ERROR: Node.js not found in PATH"
  log "PATH was: $PATH"
  exit 1
fi

if [ "$NODE_MAJOR_VERSION" -lt 20 ]; then
  log "ERROR: Node.js 20+ is required but found v$NODE_MAJOR_VERSION"
  log "Current PATH: $PATH"
  log "Please upgrade Node.js on your VPS or configure PATH properly"
  exit 1
fi

log "Using Node.js version: $NODE_VERSION"

# Ensure npm is also using the correct version
NPM_VERSION=$(npm -v 2>/dev/null || echo "unknown")
log "Using npm version: $NPM_VERSION"

# Setup SSH for GitHub authentication using existing id_deploy key
# Configure Git to use id_deploy for all operations with verbose output
export GIT_SSH_COMMAND="ssh -v -i ~/.ssh/id_deploy"
log "Testing SSH connection to GitHub..."
ssh -v -T git@github.com 2>&1 || true

cd "$REPO_ROOT"

log "Deploying branch: $BRANCH"
log "Environment: $ENVIRONMENT"
log "Repository: $REPO_ROOT"

git fetch -v --all --prune
git checkout "$BRANCH"
git pull -v --ff-only origin "$BRANCH"

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
