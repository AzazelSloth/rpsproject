#!/usr/bin/env bash
# ==============================================================================
# RPS Platform - SSL/TLS Setup Script with Certbot
# ==============================================================================
# This script configures HTTPS for the RPS platform using Let's Encrypt
#
# Prerequisites:
#   - Domain name pointing to your VPS IP
#   - Nginx running with the RPS configuration
#   - Certbot installed: sudo apt install certbot python3-certbot-nginx
#
# Usage:
#   ./setup-ssl.sh <domain> <email>
#   Example: ./setup-ssl.sh rps.example.com admin@example.com
# ==============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Arguments
DOMAIN="${1:-}"
EMAIL="${2:-}"

# Configuration
NGINX_CONFIG="/etc/nginx/sites-available/rps"
NGINX_ENABLED="/etc/nginx/sites-enabled/rps"
CERT_PATH="/etc/letsencrypt/live"

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "INFO")
            echo -e "${GREEN}[$timestamp] [$level] $message${NC}"
            ;;
        "WARN")
            echo -e "${YELLOW}[$timestamp] [$level] $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}[$timestamp] [$level] $message${NC}"
            ;;
        *)
            echo "[$timestamp] [$level] $message"
            ;;
    esac
}

check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    # Check for root privileges
    if [ "$EUID" -ne 0 ]; then
        log "ERROR" "This script must be run as root (use sudo)"
        exit 1
    fi
    
    # Check if domain is provided
    if [ -z "$DOMAIN" ]; then
        log "ERROR" "Domain name is required"
        echo "Usage: $0 <domain> [email]"
        echo "Example: $0 rps.example.com admin@example.com"
        exit 1
    fi
    
    # Check if Certbot is installed
    if ! command -v certbot >/dev/null 2>&1; then
        log "WARN" "Certbot not found. Installing..."
        apt update
        apt install -y certbot python3-certbot-nginx
    fi
    
    # Check if Nginx is installed
    if ! command -v nginx >/dev/null 2>&1; then
        log "ERROR" "Nginx not found. Please install Nginx first."
        exit 1
    fi
    
    # Check if Nginx config exists
    if [ ! -f "$NGINX_CONFIG" ]; then
        log "ERROR" "Nginx config not found at $NGINX_CONFIG"
        log "INFO" "Please configure Nginx first using nginx.rps.conf"
        exit 1
    fi
    
    # Check if port 80 is accessible
    if ! nc -z 127.0.0.1 80 2>/dev/null; then
        log "ERROR" "Port 80 is not accessible. Ensure Nginx is running."
        exit 1
    fi
    
    log "INFO" "Prerequisites check passed"
}

verify_domain() {
    log "INFO" "Verifying domain DNS configuration..."
    
    # Get the VPS IP from DNS
    local resolved_ip
    resolved_ip=$(dig +short "$DOMAIN" | tail -n 1)
    
    # Get local IP
    local local_ip
    local_ip=$(hostname -I | awk '{print $1}')
    
    if [ -z "$resolved_ip" ]; then
        log "ERROR" "Domain $DOMAIN does not resolve to any IP"
        log "INFO" "Please configure DNS A record to point to: $local_ip"
        exit 1
    fi
    
    if [ "$resolved_ip" != "$local_ip" ]; then
        log "WARN" "DNS resolution mismatch!"
        log "WARN" "  Domain resolves to: $resolved_ip"
        log "WARN" "  This server IP: $local_ip"
        log "INFO" "Please update your DNS A record to point to: $local_ip"
        
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log "INFO" "Domain DNS verified: $DOMAIN -> $local_ip"
}

obtain_ssl_certificate() {
    log "INFO" "Obtaining SSL certificate for $DOMAIN..."
    
    # Set up email (use provided or prompt)
    local certbot_email="${EMAIL:-}"
    if [ -z "$certbot_email" ]; then
        read -p "Enter email for Let's Encrypt notifications: " certbot_email
    fi
    
    # Stop Nginx temporarily (required for standalone mode)
    log "INFO" "Stopping Nginx temporarily..."
    systemctl stop nginx
    
    # Obtain certificate
    certbot certonly \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email "$certbot_email" \
        -d "$DOMAIN"
    
    # Start Nginx
    log "INFO" "Starting Nginx..."
    systemctl start nginx
    
    log "INFO" "SSL certificate obtained successfully"
}

configure_nginx_ssl() {
    log "INFO" "Configuring Nginx with SSL..."
    
    # Check if certificate exists
    if [ ! -d "$CERT_PATH/$DOMAIN" ]; then
        log "ERROR" "SSL certificate not found at $CERT_PATH/$DOMAIN"
        exit 1
    fi
    
    # Generate DH parameters (for better security)
    local dh_params="/etc/ssl/certs/dhparam.pem"
    if [ ! -f "$dh_params" ]; then
        log "INFO" "Generating DH parameters (this may take a while)..."
        openssl dhparam -out "$dh_params" 2048
    fi
    
    # Create SSL-enabled Nginx config
    cat > "$NGINX_CONFIG" << EOF
# RPS Platform - Nginx Configuration with SSL
# Generated by setup-ssl.sh

upstream rps_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

upstream rps_frontend {
    server 127.0.0.1:3001;
    keepalive 64;
}

# Redirect HTTP to HTTPS
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $DOMAIN;

    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }

    # Redirect to HTTPS
    return 301 https://\$server_name\$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name $DOMAIN;

    # SSL Certificate
    ssl_certificate $CERT_PATH/$DOMAIN/fullchain.pem;
    ssl_certificate_key $CERT_PATH/$DOMAIN/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # DH parameters
    ssl_dhparam /etc/ssl/certs/dhparam.pem;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend (Next.js)
    location / {
        proxy_pass http://rps_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_read_timeout 86400;
    }

    # API Backend (NestJS)
    location /api/ {
        proxy_pass http://rps_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check
    location /health {
        proxy_pass http://rps_backend/api;
        access_log off;
    }

    # Static files caching (Next.js)
    location /_next/static/ {
        proxy_pass http://rps_frontend;
        proxy_cache_valid 30d;
        add_header Cache-Control "public, immutable";
        expires 30d;
        access_log off;
    }

    # Client files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://rps_frontend;
        proxy_cache_valid 7d;
        add_header Cache-Control "public, max-age=604800";
        expires 7d;
    }

    access_log /var/log/nginx/rps_ssl_access.log;
    error_log /var/log/nginx/rps_ssl_error.log warn;
}
EOF

    # Enable the site
    ln -sf "$NGINX_CONFIG" "$NGINX_ENABLED"
    
    # Test and reload Nginx
    nginx -t && systemctl reload nginx
    
    log "INFO" "Nginx configured with SSL"
}

setup_auto_renewal() {
    log "INFO" "Setting up automatic certificate renewal..."
    
    # Create renewal cron job
    local cron_job="0 0 * * * sudo certbot renew --quiet --deploy-hook 'sudo systemctl reload nginx'"
    
    # Check if cron job exists
    if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
        # Add to crontab
        (crontab -l 2>/dev/null || true; echo "$cron_job") | crontab -
        log "INFO" "Auto-renewal cron job added"
    else
        log "INFO" "Auto-renewal already configured"
    fi
    
    # Test renewal (dry run)
    log "INFO" "Testing certificate renewal (dry run)..."
    certbot renew --dry-run && log "INFO" "Renewal test passed" || log "WARN" "Renewal test failed"
}

main() {
    log "INFO" "=============================================="
    log "INFO" "RPS SSL/TLS Setup - Starting"
    log "INFO" "Domain: $DOMAIN"
    log "INFO" "=============================================="
    
    # Run checks
    check_prerequisites
    verify_domain
    
    # Obtain SSL certificate
    obtain_ssl_certificate
    
    # Configure Nginx
    configure_nginx_ssl
    
    # Setup auto-renewal
    setup_auto_renewal
    
    log "INFO" "=============================================="
    log "INFO" "SSL/TLS setup completed successfully!"
    log "INFO" "=============================================="
    log "INFO" "Your RPS platform is now accessible at:"
    log "INFO" "  HTTPS: https://$DOMAIN"
    log "INFO" "  HTTP:  http://$DOMAIN (redirects to HTTPS)"
    log "INFO" "=============================================="
    log "INFO" "Certificate will auto-renew. Check with:"
    log "INFO" "  sudo certbot certificates"
    log "INFO" "=============================================="
}

main "$@"
