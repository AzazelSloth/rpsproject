#!/usr/bin/env bash
# Script de configuration Nginx (optionnel)
# Utilisation: sudo bash setup-nginx.sh
#
# Ce script est OPTIONNEL si vous voulez acceder directement aux services:
#   - Backend: http://VPS_IP:3000
#   - Frontend: http://VPS_IP:3001
#
# Si vous preferez utiliser Nginx comme reverse proxy, executez ce script.

set -euo pipefail

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Verifier que nginx est installe
if ! command -v nginx >/dev/null 2>&1; then
  echo "Nginx n'est pas installe. Pour acceder directement sans Nginx:" >&2
  echo "  - Backend: http://VPS_IP:3000" >&2
  echo "  - Frontend: http://VPS_IP:3001" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_PATH="$SCRIPT_DIR/nginx.rps.conf"
TARGET_CONF="/etc/nginx/sites-available/rps.conf"

# 1. Copier la configuration Nginx
log "Configuration Nginx (HTTP sur port 80)..."
cp "$TEMPLATE_PATH" "$TARGET_CONF"
ln -sf "$TARGET_CONF" /etc/nginx/sites-enabled/rps.conf

# 2. Valider et activer
log "Validation de la syntaxe Nginx..."
nginx -t
systemctl reload nginx || systemctl start nginx

# 3. Verification
log "Configuration terminee!"
log "Acces frontend via Nginx: http://VPS_IP"
log "Acces API backend via Nginx: http://VPS_IP/api/*"
log ""
log "OU directement (sans Nginx):"
log "  - Backend: http://VPS_IP:3000"
log "  - Frontend: http://VPS_IP:3001"
log ""
log "Commandes utiles:"
log "  sudo systemctl status nginx"
log "  sudo tail -f /var/log/nginx/rps_access.log"
log "  sudo tail -f /var/log/nginx/rps_error.log"
