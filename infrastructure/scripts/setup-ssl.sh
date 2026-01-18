#!/bin/bash
set -euo pipefail

# SSL Setup Script using Let's Encrypt

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <domain> [email]"
    echo "Example: $0 example.com admin@example.com"
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-"admin@${DOMAIN}"}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "=== SSL Setup for ${DOMAIN} ==="
echo ""

cd "$APP_DIR"

# Create nginx config for domain
echo "Creating nginx configuration..."
sed "s/\${DOMAIN}/${DOMAIN}/g" \
    infrastructure/nginx/sites-available/app.conf.template \
    > infrastructure/nginx/sites-available/app.conf

# Initial nginx config for certificate acquisition (HTTP only)
cat > infrastructure/nginx/sites-available/app-initial.conf << EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'Setting up SSL...';
        add_header Content-Type text/plain;
    }
}
EOF

# Start nginx with initial config
echo "Starting nginx for certificate acquisition..."
podman run -d --rm \
    --name certbot-nginx \
    -p 80:80 \
    -v "$APP_DIR/infrastructure/nginx/sites-available/app-initial.conf:/etc/nginx/conf.d/default.conf:ro" \
    -v certbot_webroot:/var/www/certbot \
    nginx:alpine

# Wait for nginx to start
sleep 5

# Request certificate
echo "Requesting SSL certificate..."
podman run --rm \
    -v certbot_data:/etc/letsencrypt \
    -v certbot_webroot:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}"

# Stop temporary nginx
echo "Stopping temporary nginx..."
podman stop certbot-nginx || true

# Remove initial config
rm -f infrastructure/nginx/sites-available/app-initial.conf

echo ""
echo "=== SSL Setup Complete ==="
echo ""
echo "Certificate installed for ${DOMAIN}"
echo ""
echo "Next steps:"
echo "1. Run deployment: ./infrastructure/scripts/deploy.sh"
echo "2. Certificates will auto-renew via certbot container"
echo ""
