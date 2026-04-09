#!/usr/bin/env bash
# ==============================================================================
# RPS Deployment Script - Manual Deployment (SSH-based)
# ==============================================================================
# For manual deployment on VPS without GitHub Actions.
# Clones from Git and builds locally.
#
# Usage:
#   ./deploy.sh <branch>
#   Example: ./deploy.sh main
# ==============================================================================

set -euo pipefail

# Script directory and repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# GitHub repository name (auto-detected or override)
REPO_NAME="${REPO_NAME:-$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null | sed 's|.*github.com/||' | sed 's|\.git$||')}"

# Arguments
BRANCH="${1:-main}"

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

clone_or_update() {
    log "INFO" "Cloning/updating repository..."

    mkdir -p "$APP_DIR"
    cd "$APP_DIR"

    if [ -d ".git" ]; then
        log "INFO" "Updating existing repository..."
        git remote set-url origin git@github.com:"$REPO_NAME".git 2>/dev/null || true
        git fetch origin "$BRANCH"
        git reset --hard "origin/$BRANCH"
    else
        log "INFO" "Cloning repository..."
        export GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=no -i $HOME/.ssh/id_deploy"
        git clone -b "$BRANCH" git@github.com:"$REPO_NAME".git .
    fi

    log "INFO" "Repository updated to branch: $BRANCH"
}

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
NEXT_PUBLIC_API_URL=/api
API_URL=http://127.0.0.1:3000/api
NEXT_PUBLIC_STRAPI_URL=
STRAPI_API_TOKEN=
EOF
    log "INFO" "Frontend .env.local configured"
}

build_backend() {
    log "INFO" "Building backend..."

    # Ensure Node.js v24.14.1 is available
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/versions/node/v24.14.1/bin/node" ] && export PATH="$NVM_DIR/versions/node/v24.14.1/bin:$PATH"
    log "INFO" "Node version: $(node -v)"

    cd "$APP_DIR/rps-backend"

    # Install ALL dependencies (dev dependencies needed for build)
    npm ci

    # Build
    npm run build

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

    # Apply database migrations on every deployment
    npm run migration:run
    log "INFO" "Database migrations applied"

    log "INFO" "Backend built successfully"
}

build_frontend() {
    log "INFO" "Building frontend..."

    # Ensure Node.js v24.14.1 is available
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/versions/node/v24.14.1/bin/node" ] && export PATH="$NVM_DIR/versions/node/v24.14.1/bin:$PATH"
    log "INFO" "Node version: $(node -v)"

    cd "$APP_DIR/rps-frontend/nextjs-app"

    # Install ALL dependencies (dev dependencies needed for build)
    npm ci

    # Build
    npm run build

    log "INFO" "Frontend built successfully"
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
    log "INFO" "Nginx configuration step skipped (disabled to prevent overwriting server config)"
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
    log "INFO" "RPS Deployment - Starting"
    log "INFO" "Branch: $BRANCH"
    log "INFO" "Environment: $ENVIRONMENT"
    log "INFO" "=============================================="

    # Prerequisites
    require_command git
    require_command npm

    # Setup environment
    setup_node

    # Database check (optional)
    if [ -n "${DB_HOST:-}" ]; then
        check_database
    fi

    # Setup SSH
    setup_ssh_for_github

    # Clone/Update repository
    clone_or_update

    # Configure environment
    configure_environment

    # Build applications
    build_backend
    build_frontend

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
