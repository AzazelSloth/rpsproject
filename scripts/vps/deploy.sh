#!/usr/bin/env bash
# ==============================================================================
# RPS Deployment Script - Uses CI Artifacts for Guaranteed Latest Build
# ==============================================================================
# This script downloads build artifacts from GitHub Actions to ensure the
# deployed version is EXACTLY what was built and tested in CI.
#
# Tools used:
#   - GitHub Actions API (artifact download)
#   - Node.js LTS (runtime)
#   - npm (package manager)
#   - PM2 (process manager)
#   - PostgreSQL (database - external)
#   - Nginx (reverse proxy)
#   - Certbot (SSL - prepared for future)
#   - Docker/Docker Compose (optional - for future n8n)
#
# Usage:
#   ./deploy.sh <github-token> <branch>
#   Example: ./deploy.sh ghp_xxxx main
# ==============================================================================

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# GitHub configuration
GITHUB_TOKEN="${1:-}"
BRANCH="${2:-main}"
REPO_OWNER="AzazelSloth"  # Update with your GitHub username
REPO_NAME="rpsproject"  # Update with your repository name

# Validate GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
    echo "ERROR: GitHub token is required. Usage: ./deploy.sh <github-token> [branch]"
    echo "Get a token from: https://github.com/settings/tokens"
    exit 1
fi

# Determine environment based on branch (matching workflow logic)
if [ "$BRANCH" = "main" ]; then
    ENVIRONMENT="rps_dev"
else
    ENVIRONMENT="development"
fi

# Configuration
APP_DIR="$HOME/rps-$ENVIRONMENT"
LOG_FILE="$APP_DIR/deployment.log"
BACKEND_SCRIPT="dist/main.js"
ARTIFACTS_DIR="/tmp/rps-artifacts-$$"

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Error handler
error_handler() {
    log "ERROR" "Error at line ${LINENO}: ${BASH_COMMAND}"
    exit 1
}

trap 'error_handler' ERR

# ==============================================================================
# Utility Functions
# ==============================================================================

require_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        log "ERROR" "Missing required command: $1"
        exit 1
    fi
    log "INFO" "Found $1 at: $(command -v "$1")"
}

setup_node() {
    log "INFO" "Setting up Node.js environment..."

    # Try to load nvm if available
    if [ -s "$HOME/.nvm/nvm.sh" ]; then
        # shellcheck disable=SC1090
        source "$HOME/.nvm/nvm.sh" 2>/dev/null || true
        log "INFO" "Loaded Node.js: $(node -v)"
    fi

    # Check common Node.js installation paths
    local node_paths=(
        "$HOME/.nvm/versions/node/"*/bin/node
        "/usr/local/bin/node"
        "/usr/bin/node"
        "$HOME/.local/bin/node"
    )

    for node_path in "${node_paths[@]}"; do
        if [ -x "$node_path" ]; then
            export PATH="$(dirname "$node_path"):$PATH"
            log "INFO" "Found Node.js at: $node_path ($(node -v))"
            break
        fi
    done

    # Verify Node.js version
    local node_version
    node_version=$(node -v 2>/dev/null || echo "not found")
    local major_version

    if [ "$node_version" = "not found" ]; then
        log "ERROR" "Node.js not found in PATH"
        exit 1
    fi

    major_version=$(echo "$node_version" | cut -d. -f1 | tr -d 'v')

    if [ "$major_version" -lt 20 ] || [ "$major_version" -gt 24 ]; then
        log "ERROR" "Node.js 20-24 required, found: $node_version"
        exit 1
    fi

    log "INFO" "Node.js version: $node_version"
    log "INFO" "npm version: $(npm -v)"
}

# ==============================================================================
# Artifact Download Functions
# ==============================================================================

download_artifacts() {
    log "INFO" "=============================================="
    log "INFO" "Downloading CI Artifacts from GitHub Actions"
    log "INFO" "Repository: $REPO_OWNER/$REPO_NAME"
    log "INFO" "Branch: $BRANCH"
    log "INFO" "=============================================="

    mkdir -p "$ARTIFACTS_DIR"
    cd "$ARTIFACTS_DIR"

    # Get the latest successful workflow run for the branch
    log "INFO" "Fetching latest workflow run for branch: $BRANCH..."
    
    local workflow_runs
    workflow_runs=$(curl -s -L \
        -H "Accept: application/vnd.github+json" \
        -H "Authorization: Bearer $GITHUB_TOKEN" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/workflows/rps_deployment.yml/runs?branch=$BRANCH&status=success&per_page=1")

    # Extract workflow run ID
    local workflow_id
    workflow_id=$(echo "$workflow_runs" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)

    if [ -z "$workflow_id" ]; then
        log "ERROR" "No successful workflow run found for branch: $BRANCH"
        log "ERROR" "Ensure the CI workflow has completed successfully"
        exit 1
    fi

    log "INFO" "Latest successful workflow run ID: $workflow_id"

    # Get commit SHA for verification
    local commit_sha
    commit_sha=$(echo "$workflow_runs" | grep -o '"head_sha":"[^"]*"' | head -1 | cut -d'"' -f4)
    log "INFO" "Deploying commit: ${commit_sha:0:8}"

    # List and download artifacts for this workflow run
    log "INFO" "Listing artifacts for workflow run..."
    
    local artifacts_list
    artifacts_list=$(curl -s -L \
        -H "Accept: application/vnd.github+json" \
        -H "Authorization: Bearer $GITHUB_TOKEN" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/runs/$workflow_id/artifacts")

    # Find backend artifact ID
    local backend_artifact_id
    backend_artifact_id=$(echo "$artifacts_list" | grep -o '"id":[0-9]*,"name":"rps-backend"' | head -1 | cut -d: -f2 | cut -d, -f1)

    if [ -z "$backend_artifact_id" ]; then
        log "ERROR" "Backend artifact not found in workflow run"
        exit 1
    fi

    log "INFO" "Backend artifact ID: $backend_artifact_id"

    # Find frontend artifact ID
    local frontend_artifact_id
    frontend_artifact_id=$(echo "$artifacts_list" | grep -o '"id":[0-9]*,"name":"rps-frontend"' | head -1 | cut -d: -f2 | cut -d, -f1)

    if [ -z "$frontend_artifact_id" ]; then
        log "ERROR" "Frontend artifact not found in workflow run"
        exit 1
    fi

    log "INFO" "Frontend artifact ID: $frontend_artifact_id"

    # Download backend artifact
    log "INFO" "Downloading backend artifact..."
    curl -s -L \
        -H "Accept: application/vnd.github+json" \
        -H "Authorization: Bearer $GITHUB_TOKEN" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        -o backend-artifact.zip \
        "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/artifacts/$backend_artifact_id/zip"

    if [ ! -f "backend-artifact.zip" ] || [ ! -s "backend-artifact.zip" ]; then
        log "ERROR" "Failed to download backend artifact"
        exit 1
    fi

    # Download frontend artifact
    log "INFO" "Downloading frontend artifact..."
    curl -s -L \
        -H "Accept: application/vnd.github+json" \
        -H "Authorization: Bearer $GITHUB_TOKEN" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        -o frontend-artifact.zip \
        "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/artifacts/$frontend_artifact_id/zip"

    if [ ! -f "frontend-artifact.zip" ] || [ ! -s "frontend-artifact.zip" ]; then
        log "ERROR" "Failed to download frontend artifact"
        exit 1
    fi

    # Extract artifacts
    log "INFO" "Extracting artifacts..."
    mkdir -p "$ARTIFACTS_DIR/backend"
    mkdir -p "$ARTIFACTS_DIR/frontend"
    
    unzip -q backend-artifact.zip -d "$ARTIFACTS_DIR/backend/" || {
        log "ERROR" "Failed to extract backend artifact"
        exit 1
    }

    unzip -q frontend-artifact.zip -d "$ARTIFACTS_DIR/frontend/" || {
        log "ERROR" "Failed to extract frontend artifact"
        exit 1
    }

    # Verify artifacts
    if [ ! -d "$ARTIFACTS_DIR/backend" ] || [ -z "$(ls -A "$ARTIFACTS_DIR/backend" 2>/dev/null)" ]; then
        log "ERROR" "Backend artifact is empty or missing"
        exit 1
    fi

    if [ ! -d "$ARTIFACTS_DIR/frontend" ] || [ -z "$(ls -A "$ARTIFACTS_DIR/frontend" 2>/dev/null)" ]; then
        log "ERROR" "Frontend artifact is empty or missing"
        exit 1
    fi

    log "INFO" "Artifacts downloaded and extracted successfully"
}

deploy_artifacts() {
    log "INFO" "Deploying artifacts to: $APP_DIR"

    # Backup current deployment
    if [ -d "$APP_DIR" ]; then
        log "INFO" "Backing up current deployment..."
        mv "$APP_DIR" "${APP_DIR}.backup.$(date +%Y%m%d%H%M%S)"
    fi

    # Create application directories
    mkdir -p "$APP_DIR/rps-backend"
    mkdir -p "$APP_DIR/rps-frontend/nextjs-app"

    # Deploy backend (copy built dist/ and source files)
    log "INFO" "Deploying backend..."
    
    # We need to copy the source files too for npm to work, plus the built dist/
    # Clone minimal source code for dependencies
    local temp_source="/tmp/rps-source-$$"
    mkdir -p "$temp_source"
    
    git clone --depth 1 --branch "$BRANCH" \
        "https://github.com/$REPO_OWNER/$REPO_NAME.git" \
        "$temp_source"

    # Copy backend source (package.json, tsconfig, src/)
    if [ -d "$temp_source/rps-backend" ]; then
        cp -r "$temp_source/rps-backend/"* "$APP_DIR/rps-backend/"
        cp "$temp_source/rps-backend/.env" "$APP_DIR/rps-backend/" 2>/dev/null || true
    fi

    # Replace dist/ with built artifact
    rm -rf "$APP_DIR/rps-backend/dist"
    cp -r "$ARTIFACTS_DIR/backend/" "$APP_DIR/rps-backend/dist/"

    # Copy frontend source
    if [ -d "$temp_source/rps-frontend/nextjs-app" ]; then
        cp -r "$temp_source/rps-frontend/nextjs-app/"* "$APP_DIR/rps-frontend/nextjs-app/"
        cp "$temp_source/rps-frontend/nextjs-app/.env.local" "$APP_DIR/rps-frontend/nextjs-app/" 2>/dev/null || true
    fi

    # Replace .next/ with built artifact
    rm -rf "$APP_DIR/rps-frontend/nextjs-app/.next"
    cp -r "$ARTIFACTS_DIR/frontend/" "$APP_DIR/rps-frontend/nextjs-app/.next/"

    # Clean up temp source
    rm -rf "$temp_source"

    # Verify deployment
    if [ ! -f "$APP_DIR/rps-backend/package.json" ]; then
        log "ERROR" "Backend package.json missing after deployment"
        exit 1
    fi

    if [ ! -d "$APP_DIR/rps-backend/dist" ]; then
        log "ERROR" "Backend dist/ missing after deployment"
        exit 1
    fi

    if [ ! -d "$APP_DIR/rps-frontend/nextjs-app/.next" ]; then
        log "ERROR" "Frontend .next/ missing after deployment"
        exit 1
    fi

    log "INFO" "Artifacts deployed successfully"
}

cleanup_artifacts() {
    rm -rf "$ARTIFACTS_DIR"
}

setup_ssh_for_github() {
    log "INFO" "Setting up SSH for GitHub..."
    
    # Start SSH agent
    eval "$(ssh-agent -s)" >/dev/null 2>&1
    
    # Add SSH key
    ssh-add "$HOME/.ssh/id_deploy" 2>/dev/null || true
    
    # Add GitHub to known hosts
    mkdir -p "$HOME/.ssh"
    chmod 700 "$HOME/.ssh"
    ssh-keyscan -H github.com >> "$HOME/.ssh/known_hosts" 2>/dev/null || true
    chmod 644 "$HOME/.ssh/known_hosts"
    
    # Configure Git SSH
    export GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=no -i $HOME/.ssh/id_deploy"
    
    log "INFO" "SSH configured for GitHub"
}

# ==============================================================================
# Database Functions
# ==============================================================================

check_database() {
    log "INFO" "Checking PostgreSQL database..."

    if ! command -v psql >/dev/null 2>&1; then
        log "WARN" "psql not found - skipping database check"
        return 0
    fi

    # Check if database is accessible
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" >/dev/null 2>&1; then
        log "INFO" "Database connection successful"
    else
        log "WARN" "Database connection failed - will use application defaults"
    fi
}

# ==============================================================================
# Deployment Functions
# ==============================================================================

configure_environment() {
    log "INFO" "Configuring environment variables..."

    # Backend environment
    cd "$APP_DIR/rps-backend"
    cat > .env << EOF
NODE_ENV=production
PORT=3000
JWT_SECRET=$JWT_SECRET
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
DB_SYNCHRONIZE=false
DB_LOGGING=false
SWAGGER_ENABLED=true
SWAGGER_PATH=api-docs
EOF
    log "INFO" "Backend .env configured"

    # Frontend environment
    cd "$APP_DIR/rps-frontend/nextjs-app"
    cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://127.0.0.1:3000/api
API_URL=http://127.0.0.1:3000/api
NEXT_PUBLIC_STRAPI_URL=
STRAPI_API_TOKEN=
EOF
    log "INFO" "Frontend .env.local configured"
}

detect_backend_entrypoint() {
    log "INFO" "Detecting backend entrypoint..."

    cd "$APP_DIR/rps-backend"

    # Detect backend entrypoint generated by Nest build (layout can vary)
    local detected_script
    detected_script="$(find dist -type f -name main.js | head -n 1 || true)"
    if [ -z "$detected_script" ]; then
        log "ERROR" "No main.js found under dist/ after backend build"
        ls -la dist/ 2>/dev/null || true
        exit 1
    fi

    BACKEND_SCRIPT="$detected_script"
    log "INFO" "Detected backend entrypoint: $BACKEND_SCRIPT"
}

setup_pm2() {
    log "INFO" "Configuring PM2..."
    
    # Check if PM2 is installed
    if ! command -v pm2 >/dev/null 2>&1; then
        log "INFO" "Installing PM2..."
        sudo npm install -g pm2
    fi
    
    # Create ecosystem config
    cd "$APP_DIR"
        cat > ecosystem.config.cjs << EOF
module.exports = {
  apps: [
    {
      name: "rps-backend",
      cwd: "./rps-backend",
            script: "$BACKEND_SCRIPT",
            interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        PATH: "/root/.nvm/versions/node/v24.14.1/bin:/usr/local/bin:/usr/bin:/bin"
      },
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "500M",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      kill_timeout: 5000,
      listen_timeout: 10000,
      error_file: "./logs/backend-error.log",
      out_file: "./logs/backend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z"
    },
    {
      name: "rps-frontend",
      cwd: "./rps-frontend/nextjs-app",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001",
            interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        PATH: "/root/.nvm/versions/node/v24.14.1/bin:/usr/local/bin:/usr/bin:/bin"
      },
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "500M",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      kill_timeout: 5000,
      listen_timeout: 10000,
      error_file: "./logs/frontend-error.log",
      out_file: "./logs/frontend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z"
    }
  ]
};
EOF

    # Create logs directory
    mkdir -p "$APP_DIR/logs"
    
    # Use correct Node.js version from NVM
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/versions/node/v24.14.1/bin/node" ] && export PATH="$NVM_DIR/versions/node/v24.14.1/bin:$PATH"
    log "INFO" "Node version: $(node -v)"
    
    # Check if PM2 is installed
    if ! command -v pm2 >/dev/null 2>&1; then
        log "INFO" "Installing PM2..."
        sudo npm install -g pm2
    fi
    
    # Stop existing processes to ensure clean start
    pm2 delete all 2>/dev/null || true
    
    # Start PM2
    pm2 start ecosystem.config.cjs
    pm2 save

    # Ensure PM2 restarts applications after server reboot.
    sudo env PATH="$PATH" "$(command -v pm2)" startup systemd -u "$USER" --hp "$HOME" >/dev/null 2>&1 || true
    pm2 save
    
    # Verify services are running
    log "INFO" "PM2 Status:"
    pm2 status
    pm2 logs --lines 10 --nostream
    
    log "INFO" "PM2 configured successfully"
}

configure_nginx() {
    log "INFO" "Configuring Nginx..."
    
    local nginx_config="$SCRIPT_DIR/nginx.rps.conf"
    local nginx_target="/etc/nginx/sites-available/rps"
    local nginx_enabled="/etc/nginx/sites-enabled/rps"
    
    # Check if Nginx config exists
    if [ -f "$nginx_config" ]; then
        # Backup existing config
        if [ -f "$nginx_target" ]; then
            sudo cp "$nginx_target" "$nginx_target.backup.$(date +%Y%m%d)"
        fi
        
        # Copy new config
        sudo cp "$nginx_config" "$nginx_target"
        
        # Enable site
        sudo ln -sf "$nginx_target" "$nginx_enabled"
        
        # Test and reload
        sudo nginx -t && sudo systemctl reload nginx
        
        log "INFO" "Nginx configured successfully"
    else
        log "WARN" "Nginx config not found: $nginx_config"
    fi
}

# ==============================================================================
# Docker Compose Functions (for future n8n)
# ==============================================================================

create_docker_compose() {
    log "INFO" "Creating Docker Compose configuration..."
    
    cd "$APP_DIR"
    
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # PostgreSQL is external on the server
  # This file is prepared for future n8n integration

  n8n:
    # n8n will be added in a future version
    image: n8nio/n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USER:-admin}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - N8N_HOST=${N8N_HOST:-localhost}
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=${DB_HOST}
      - DB_POSTGRESDB_PORT=${DB_PORT}
      - DB_POSTGRESDB_DATABASE=${DB_NAME}
      - DB_POSTGRESDB_USER=${DB_USER}
      - DB_POSTGRESDB_PASSWORD=${DB_PASSWORD}
    volumes:
      - n8n_data:/home/node/.n8n
    networks:
      - rps_network

volumes:
  n8n_data:
    driver: local

networks:
  rps_network:
    driver: bridge
EOF

    log "INFO" "Docker Compose configuration created (n8n ready for future)"
}

# ==============================================================================
# SSL Functions (prepared for Certbot)
# ==============================================================================

setup_ssl() {
    log "INFO" "SSL setup is prepared for Certbot..."
    log "INFO" "Run 'sudo certbot --nginx -d your-domain.com' to enable SSL"
}

# ==============================================================================
# Main Deployment
# ==============================================================================

main() {
    log "INFO" "=============================================="
    log "INFO" "RPS Deployment from CI Artifacts - Starting"
    log "INFO" "Branch: $BRANCH"
    log "INFO" "Environment: $ENVIRONMENT"
    log "INFO" "=============================================="

    # Prerequisites
    require_command curl
    require_command unzip
    require_command npm

    # Setup environment
    setup_node

    # Database check (optional)
    if [ -n "${DB_HOST:-}" ]; then
        check_database
    fi

    # Download CI artifacts
    download_artifacts

    # Deploy artifacts
    deploy_artifacts

    # Configure environment
    configure_environment

    # Detect backend entrypoint
    detect_backend_entrypoint

    # PM2 setup
    # Ensure Node.js v24.14.1 is available
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/versions/node/v24.14.1/bin/node" ] && export PATH="$NVM_DIR/versions/node/v24.14.1/bin:$PATH"

    setup_pm2

    # Nginx configuration
    configure_nginx

    # Docker Compose (prepared for n8n)
    create_docker_compose

    # Cleanup
    cleanup_artifacts

    # Show status
    log "INFO" "=============================================="
    log "INFO" "PM2 Status:"
    pm2 status
    pm2 logs --lines 20 --nostream

    log "INFO" "=============================================="
    log "INFO" "Deployment completed successfully!"
    log "INFO" "Backend API: http://localhost:3000/api"
    log "INFO" "Frontend: http://localhost:3001"
    log "INFO" "=============================================="
}

# Run main
main "$@"
