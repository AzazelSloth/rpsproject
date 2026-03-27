# Script de configuration Nginx + SSL Let's Encrypt (configuration uniquement)
# Utilisation: sudo bash setup-nginx.sh your-domain.com [email]

set -euo pipefail

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "Usage: sudo bash setup-nginx.sh your-domain.com [email]"
  exit 1
fi
EMAIL="${2:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_PATH="$SCRIPT_DIR/nginx.rps.conf"
TARGET_CONF="/etc/nginx/sites-available/rps.conf"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

if ! command -v nginx >/dev/null 2>&1; then
  echo "nginx is not installed" >&2
  exit 1
fi

if ! command -v certbot >/dev/null 2>&1; then
  echo "certbot is not installed" >&2
  exit 1
fi

# 1. Rendre la configuration Nginx avec le domaine
log "Rendering Nginx configuration for $DOMAIN..."
sed "s/__DOMAIN__/$DOMAIN/g" "$TEMPLATE_PATH" > "$TARGET_CONF"
ln -sf "$TARGET_CONF" /etc/nginx/sites-enabled/rps.conf

# 2. Valider et charger Nginx
log "Validating Nginx syntax..."
nginx -t
systemctl reload nginx

# 3. Creer le certificat si absent
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  log "Generating Let's Encrypt certificate for $DOMAIN..."
  if [ -n "$EMAIL" ]; then
    certbot certonly --nginx -d "$DOMAIN" -d "www.$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive
  else
    certbot certonly --nginx -d "$DOMAIN" -d "www.$DOMAIN" --agree-tos --register-unsafely-without-email --non-interactive
  fi
else
  log "Certificate already exists for $DOMAIN. Skipping certificate issuance."
fi

# 4. Recharger Nginx avec SSL actif
log "Validating and reloading Nginx with SSL..."
nginx -t
systemctl reload nginx

# 5. Configurer le renouvellement automatique
log "Setting up certificate auto-renewal..."
systemctl enable --now certbot.timer

# 6. Verification finale
log "Setup completed successfully!"
log "Domain: $DOMAIN"
log "Certificate valid until: $(openssl x509 -enddate -noout -in /etc/letsencrypt/live/$DOMAIN/cert.pem 2>/dev/null || echo 'unknown')"
log "Access frontend at: https://$DOMAIN"
log "Access API at: https://$DOMAIN/api/*"
