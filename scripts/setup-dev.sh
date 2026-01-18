#!/bin/bash
set -euo pipefail

# Development Environment Setup Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Development Environment Setup ==="
echo ""

cd "$APP_DIR"

# Check for required tools
echo "Checking required tools..."

if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required. Install from https://nodejs.org"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "pnpm not found. Installing..."
    npm install -g pnpm
fi

if ! command -v podman &> /dev/null; then
    echo "Warning: Podman not found. Install for containerized development."
    echo "Continuing without container support..."
    HAS_PODMAN=false
else
    HAS_PODMAN=true
fi

echo "Node: $(node --version)"
echo "pnpm: $(pnpm --version)"
if [[ "$HAS_PODMAN" == "true" ]]; then
    echo "Podman: $(podman --version)"
fi
echo ""

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Setup environment files
echo "Setting up environment files..."

if [[ ! -f .env ]]; then
    cp .env.example .env 2>/dev/null || echo "No .env.example found"
fi

if [[ ! -f apps/backend/.env ]]; then
    if [[ -f apps/backend/.env.example ]]; then
        cp apps/backend/.env.example apps/backend/.env
        echo "Created apps/backend/.env from example"
    fi
fi

if [[ ! -f apps/frontend/.env ]]; then
    if [[ -f apps/frontend/.env.example ]]; then
        cp apps/frontend/.env.example apps/frontend/.env
        echo "Created apps/frontend/.env from example"
    fi
fi

# Start database
if [[ "$HAS_PODMAN" == "true" ]]; then
    echo "Starting PostgreSQL database..."

    # Check if postgres container exists
    if podman ps -a --format "{{.Names}}" | grep -q "^fullstack-postgres$"; then
        echo "Starting existing postgres container..."
        podman start fullstack-postgres
    else
        echo "Creating new postgres container..."
        podman run -d \
            --name fullstack-postgres \
            -e POSTGRES_USER=postgres \
            -e POSTGRES_PASSWORD=postgres \
            -e POSTGRES_DB=fullstack \
            -p 5432:5432 \
            postgres:16-alpine
    fi

    # Wait for database
    echo "Waiting for database to be ready..."
    sleep 5

    for i in {1..30}; do
        if podman exec fullstack-postgres pg_isready -U postgres > /dev/null 2>&1; then
            echo "Database is ready!"
            break
        fi
        echo "Waiting... ($i/30)"
        sleep 1
    done
fi

# Generate Prisma client
echo "Generating Prisma client..."
pnpm --filter backend prisma:generate

# Run database migrations
echo "Running database migrations..."
pnpm --filter backend prisma:migrate

# Build validators package
echo "Building shared packages..."
pnpm --filter validators build

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "To start development:"
echo "  pnpm dev"
echo ""
echo "This will start:"
echo "  - Backend: http://localhost:4000"
echo "  - Frontend: http://localhost:3000"
echo ""
echo "Database:"
echo "  - PostgreSQL: localhost:5432"
echo "  - User: postgres"
echo "  - Password: postgres (default)"
echo "  - Database: fullstack"
echo ""
echo "To view database:"
echo "  pnpm --filter backend prisma:studio"
echo ""
