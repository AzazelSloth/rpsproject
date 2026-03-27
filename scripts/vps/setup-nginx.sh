#!/usr/bin/env bash
# Script de configuration Nginx (HTTP uniquement, addresse IP)
# Utilisation: sudo bash setup-nginx.sh

set -euo pipefail

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Verifier que nginx/certbot sont installes
if ! command -v nginx >/dev/null 2>&1; then
  echo "nginx n'est pas installe" >&2
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
log "Acces frontend: http://VPS_IP"
log "Acces API backend: http://VPS_IP/api/*"
log ""
log "Commandes utiles:"
log "  sudo systemctl status nginx"
log "  sudo tail -f /var/log/nginx/rps_access.log"
log "  sudo tail -f /var/log/nginx/rps_error.log"
