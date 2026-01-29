#!/bin/bash
set -euo pipefail

# Setup script for elonpredictions.com domain
DOMAIN="elonpredictions.com"
ADMIN_EMAIL="admin@elonpredictions.com"

echo "=== Setting up ${DOMAIN} ==="
echo ""

# Generate secrets
echo "Generating secure secrets..."
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')

# Create .env file
echo "Creating production .env file..."
cat > .env << EOF
NODE_ENV=production
DOMAIN=${DOMAIN}

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=fullstack

# Admin User
DEFAULT_ADMIN_EMAIL=${ADMIN_EMAIL}

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
MAGIC_LINK_EXPIRES_IN=5m

# URLs
FRONTEND_URL=https://${DOMAIN}
ALLOWED_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}
VITE_API_URL=/api
VITE_APP_NAME="Elon Predictions"

# Email (configure with your provider)
# For Resend, get API key from https://resend.com
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=REPLACE_WITH_YOUR_RESEND_API_KEY
EMAIL_FROM=noreply@${DOMAIN}
EOF

chmod 600 .env

echo ""
echo "=== Environment file created ==="
echo ""
echo "IMPORTANT: Update the following in .env file:"
echo "  - SMTP_PASSWORD: Get a Resend API key from https://resend.com"
echo ""
echo "Next steps:"
echo "  1. Edit .env and add your email service credentials"
echo "  2. Run: ./infrastructure/scripts/setup-ssl.sh ${DOMAIN} ${ADMIN_EMAIL}"
echo "  3. Run: ./infrastructure/scripts/deploy.sh"
echo ""
