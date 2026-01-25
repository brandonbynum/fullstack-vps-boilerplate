#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "=== Full-Stack App Deployment ==="
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

# Stop existing containers
echo "Stopping existing containers..."
podman-compose -f "$APP_DIR/infrastructure/podman/compose.yml" -f "$APP_DIR/infrastructure/podman/compose.prod.yml" down 2>/dev/null || true

# Pull latest images
echo "Pulling latest base images..."
podman pull postgres:16-alpine
podman pull nginx:alpine

# Build containers using direct podman build
echo "Building application containers..."
podman build -f apps/backend/Containerfile \
  -t fullstack-backend:latest .

podman build -f apps/frontend/Containerfile \
  --build-arg VITE_API_URL="${VITE_API_URL:-/api}" \
  --build-arg VITE_APP_NAME="${VITE_APP_NAME:-Full-Stack App}" \
  -t fullstack-frontend:latest .

# Start database
echo "Starting database..."
podman-compose -f "$APP_DIR/infrastructure/podman/compose.yml" -f "$APP_DIR/infrastructure/podman/compose.prod.yml" up -d postgres

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
    -e DATABASE_URL="postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-fullstack}?schema=public" \
    -v "$APP_DIR/apps/backend:/app:Z" \
    -w /app \
    node:20-alpine \
    sh -c "npm install -g pnpm && pnpm install --frozen-lockfile && npx prisma migrate deploy"

# Start all services
echo "Starting all services..."
podman-compose -f "$APP_DIR/infrastructure/podman/compose.yml" -f "$APP_DIR/infrastructure/podman/compose.prod.yml" up -d

# Wait for services
echo "Waiting for services to start..."
sleep 15

# Health checks
echo "Running health checks..."

for i in {1..10}; do
    if curl -sf http://localhost:4000/health > /dev/null 2>&1; then
        echo "Backend: OK"
        break
    fi
    if [[ $i -eq 10 ]]; then
        echo "Backend: FAILED"
        podman logs fullstack-backend
        exit 1
    fi
    sleep 2
done

for i in {1..10}; do
    if curl -sf http://localhost:80/health > /dev/null 2>&1; then
        echo "Frontend: OK"
        break
    fi
    if [[ $i -eq 10 ]]; then
        echo "Frontend: FAILED"
        podman logs fullstack-frontend
        exit 1
    fi
    sleep 2
done

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Services status:"
podman ps
echo ""
