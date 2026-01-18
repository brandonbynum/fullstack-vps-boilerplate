#!/bin/bash
set -euo pipefail

# Health Check Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "=== Health Check ==="
echo ""

cd "$APP_DIR"

# Load environment variables
if [[ -f .env ]]; then
    set -a
    source .env
    set +a
fi

ERRORS=0

# Check containers
echo "Container Status:"
echo "-----------------"
podman-compose -f infrastructure/podman/compose.yml -f infrastructure/podman/compose.prod.yml ps
echo ""

# Check database
echo "Database Health:"
echo "----------------"
if podman exec fullstack-postgres pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-fullstack}" > /dev/null 2>&1; then
    echo "PostgreSQL: OK"
else
    echo "PostgreSQL: FAILED"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check backend
echo "Backend Health:"
echo "---------------"
if curl -sf http://localhost:4000/health > /dev/null 2>&1; then
    echo "Backend API: OK"
else
    echo "Backend API: FAILED"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check frontend
echo "Frontend Health:"
echo "----------------"
if curl -sf http://localhost:80/health > /dev/null 2>&1; then
    echo "Frontend: OK"
else
    echo "Frontend: FAILED"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check disk space
echo "Disk Usage:"
echo "-----------"
df -h / | tail -1
echo ""

# Check memory
echo "Memory Usage:"
echo "-------------"
free -h
echo ""

# Summary
echo "======================="
if [[ $ERRORS -eq 0 ]]; then
    echo "All checks passed!"
    exit 0
else
    echo "FAILED: ${ERRORS} check(s) failed"
    exit 1
fi
