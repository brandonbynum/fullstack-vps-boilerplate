#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "=== Full-Stack App Deployment (Production) ==="
echo "App directory: $APP_DIR"
echo ""

cd "$APP_DIR"

# Check for .env file
if [[ ! -f .env ]]; then
    echo "Error: .env file not found"
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

echo "Stopping existing containers..."
podman rm -f fullstack-postgres fullstack-backend fullstack-frontend fullstack-nginx 2>/dev/null || true

echo "Creating network..."
podman network rm fullstack-app_internal 2>/dev/null || true || sleep 2
podman network create fullstack-app_internal 2>/dev/null || true

echo "Creating volumes..."
podman volume create postgres_data 2>/dev/null || true
podman volume create certbot_data 2>/dev/null || true
podman volume create certbot_webroot 2>/dev/null || true

# Start PostgreSQL
echo "Starting PostgreSQL database..."
podman run -d \
  --name fullstack-postgres \
  --network fullstack-app_internal \
  -e POSTGRES_USER="${POSTGRES_USER:-postgres}" \
  -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
  -e POSTGRES_DB="${POSTGRES_DB:-fullstack}" \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:16-alpine

# Wait for database
echo "Waiting for database to be ready..."
sleep 10

for i in {1..30}; do
    if podman exec fullstack-postgres pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-fullstack}" > /dev/null 2>&1; then
        echo "Database is ready!"
        break
    fi
    echo "Waiting for database... ($i/30)"
    sleep 2
done

# Run migrations
echo "Running database migrations..."
podman run --rm \
    --network fullstack-app_internal \
    -e DATABASE_URL="postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@fullstack-postgres:5432/${POSTGRES_DB:-fullstack}?schema=public" \
    -v "$APP_DIR/apps/backend:/app:Z" \
    -w /app \
    node:20-alpine \
    sh -c "npm install -g pnpm && pnpm install --no-frozen-lockfile && npx prisma@6 migrate deploy" || true

# Start Backend
echo "Starting backend..."
podman run -d \
  --name fullstack-backend \
  --network fullstack-app_internal \
  -e NODE_ENV=production \
  -e PORT=4000 \
  -e DATABASE_URL="postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@fullstack-postgres:5432/${POSTGRES_DB:-fullstack}?schema=public" \
  -e JWT_SECRET="${JWT_SECRET}" \
  -e JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}" \
  -e JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-15m}" \
  -e JWT_REFRESH_EXPIRES_IN="${JWT_REFRESH_EXPIRES_IN:-7d}" \
  -e MAGIC_LINK_EXPIRES_IN="${MAGIC_LINK_EXPIRES_IN:-5m}" \
  -e FRONTEND_URL="${FRONTEND_URL}" \
  -e ALLOWED_ORIGINS="${ALLOWED_ORIGINS}" \
  -e SMTP_HOST="${SMTP_HOST:-}" \
  -e SMTP_PORT="${SMTP_PORT:-587}" \
  -e SMTP_USER="${SMTP_USER:-}" \
  -e SMTP_PASSWORD="${SMTP_PASSWORD:-}" \
  -e EMAIL_FROM="${EMAIL_FROM:-noreply@example.com}" \
  localhost/fullstack-backend:latest

# Start Frontend
echo "Starting frontend..."
podman run -d \
  --name fullstack-frontend \
  --network fullstack-app_internal \
  localhost/fullstack-frontend:latest

# Wait for services to start
echo "Waiting for services to start..."
sleep 10

# Start Nginx
echo "Starting nginx reverse proxy..."
podman run -d \
  --name fullstack-nginx \
  --network fullstack-app_internal \
  -p 80:80 \
  -p 443:443 \
  -v "$APP_DIR/infrastructure/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" \
  -v "$APP_DIR/infrastructure/nginx/sites-available:/etc/nginx/sites-available:ro" \
  -v "$APP_DIR/infrastructure/nginx/snippets:/etc/nginx/snippets:ro" \
  -v certbot_data:/etc/letsencrypt:ro \
  -v certbot_webroot:/var/www/certbot:ro \
  nginx:alpine

# Wait a bit more
sleep 5

# Health checks
echo "Running health checks..."
BACKEND_OK=false
FRONTEND_OK=false
POSTGRES_OK=false

for i in {1..10}; do
    if podman exec fullstack-postgres pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-fullstack}" > /dev/null 2>&1; then
        echo "✓ Database: OK"
        POSTGRES_OK=true
        break
    fi
    echo "  Checking database... ($i/10)"
    sleep 2
done

for i in {1..10}; do
    if podman exec fullstack-backend curl -sf http://localhost:4000/health > /dev/null 2>&1; then
        echo "✓ Backend: OK"
        BACKEND_OK=true
        break
    fi
    echo "  Checking backend... ($i/10)"
    sleep 2
done

for i in {1..10}; do
    if curl -sf http://localhost:80/health > /dev/null 2>&1; then
        echo "✓ Frontend: OK"
        FRONTEND_OK=true
        break
    fi
    echo "  Checking frontend... ($i/10)"
    sleep 2
done

echo ""
echo "=== Deployment Status ==="
podman ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"

echo ""
if [[ "$BACKEND_OK" == "true" ]] && [[ "$FRONTEND_OK" == "true" ]] && [[ "$POSTGRES_OK" == "true" ]]; then
    echo "✓ Deployment successful!"
    echo ""
    echo "Your application is running at:"
    echo "  HTTP:  http://${DOMAIN}"
    echo "  HTTPS: https://${DOMAIN}"
else
    echo "⚠ Some services may not be healthy"
    echo "Check logs:"
    echo "  Backend: podman logs fullstack-backend"
    echo "  Frontend: podman logs fullstack-frontend"
    echo "  Nginx: podman logs fullstack-nginx"
    echo "  Database: podman logs fullstack-postgres"
fi

echo ""
