#!/usr/bin/env bash
# ==============================================================================
# RPS Quick Deploy Script
# ==============================================================================
# Simplified deployment script that uses a GitHub Personal Access Token
# Usage: ./quick-deploy.sh [branch]
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
BRANCH="${1:-main}"

# Get GitHub token from environment or prompt
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

if [ -z "$GITHUB_TOKEN" ]; then
    echo "GitHub Personal Access Token required for artifact download."
    echo ""
    echo "Create a token at: https://github.com/settings/tokens"
    echo "Required scopes: repo (to access private repositories)"
    echo ""
    echo "Option 1: Set GITHUB_TOKEN environment variable"
    echo "  export GITHUB_TOKEN=ghp_xxxxx"
    echo ""
    echo "Option 2: Enter token now (will not be saved):"
    read -rs -p "Token: " GITHUB_TOKEN
    echo ""
fi

if [ -z "$GITHUB_TOKEN" ]; then
    echo "ERROR: No GitHub token provided"
    exit 1
fi

echo "=============================================="
echo "RPS Quick Deployment"
echo "Branch: $BRANCH"
echo "=============================================="
echo ""

# Run the deployment script
bash "$SCRIPT_DIR/deploy.sh" "$GITHUB_TOKEN" "$BRANCH"
