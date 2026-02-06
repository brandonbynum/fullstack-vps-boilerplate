#!/bin/bash
set -euo pipefail

# Full-Stack App Deployment Script
# Run this script to deploy or update the application

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "=== Full-Stack App Deployment ==="
echo "App directory: $APP_DIR"
echo ""

cd "$APP_DIR"

# Check for .env file
if [[ ! -f .env ]]; then
    echo "Error: .env file not found"
    echo "Copy .env.example to .env and configure it"
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

# Stop existing containers
echo "Stopping existing containers..."
podman-compose -f infrastructure/podman/compose.yml -f infrastructure/podman/compose.prod.yml down 2>/dev/null || true

# Pull latest images
echo "Pulling latest base images..."
podman pull postgres:16-alpine
podman pull nginx:alpine

# Build containers sequentially to save space
echo "Building backend container..."
podman-compose -f infrastructure/podman/compose.yml -f infrastructure/podman/compose.prod.yml build --no-cache backend
podman system prune -f

echo "Building frontend container..."
podman-compose -f infrastructure/podman/compose.yml -f infrastructure/podman/compose.prod.yml build --no-cache frontend
podman system prune -f

# Start database first
echo "Starting database..."
podman-compose -f infrastructure/podman/compose.yml -f infrastructure/podman/compose.prod.yml up -d postgres

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 10

# Check database health
for i in {1..30}; do
    if podman exec fullstack-postgres pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-fullstack}" > /dev/null 2>&1; then
        echo "Database is ready!"
        break
    fi
    echo "Waiting for database... ($i/30)"
    sleep 2
done

# Sync database schema
echo "Syncing database schema..."
podman run --rm -e CI=true \
    --network podman_internal \
    -e DATABASE_URL="postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-fullstack}?schema=public" \
    -v "$APP_DIR:/app:Z" \
    -w /app/apps/backend \
    node:20-alpine \
    sh -c "npm install -g pnpm && pnpm install --no-frozen-lockfile && npx prisma@6 db push"

# Seed database (creates default admin if configured)
echo "Seeding database..."
podman run --rm -e CI=true \
    --network podman_internal \
    -e DATABASE_URL="postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-fullstack}?schema=public" \
    -e DEFAULT_ADMIN_EMAIL="${DEFAULT_ADMIN_EMAIL:-}" \
    -v "$APP_DIR:/app:Z" \
    -w /app/apps/backend \
    node:20-alpine \
    sh -c "npm install -g pnpm && pnpm install --no-frozen-lockfile && pnpm db:seed"

# Start all services
echo "Starting all services..."
podman-compose -f infrastructure/podman/compose.yml -f infrastructure/podman/compose.prod.yml up -d

# Wait for services to start
echo "Waiting for services to start..."
sleep 15

# Health check
echo "Running health checks..."

# Check backend
for i in {1..10}; do
    if podman exec fullstack-backend wget -qO- http://localhost:4000/health > /dev/null 2>&1; then
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

# Check frontend
for i in {1..10}; do
    if podman exec fullstack-frontend wget -qO- http://localhost:8080/health > /dev/null 2>&1; then
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
podman-compose -f infrastructure/podman/compose.yml -f infrastructure/podman/compose.prod.yml ps
echo ""
