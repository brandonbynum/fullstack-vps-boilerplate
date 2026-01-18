#!/bin/bash
set -euo pipefail

# Database Backup Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
BACKUP_DIR="${APP_DIR}/backups"
DATE=$(date +%Y%m%d_%H%M%S)

echo "=== Database Backup ==="

cd "$APP_DIR"

# Load environment variables
if [[ -f .env ]]; then
    set -a
    source .env
    set +a
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
BACKUP_FILE="${BACKUP_DIR}/backup_${DATE}.sql.gz"
echo "Creating backup: ${BACKUP_FILE}"

podman exec fullstack-postgres pg_dump \
    -U "${POSTGRES_USER:-postgres}" \
    "${POSTGRES_DB:-fullstack}" | gzip > "$BACKUP_FILE"

# Check backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup size: ${BACKUP_SIZE}"

# Keep only last 7 daily backups
echo "Cleaning old backups..."
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete

# List remaining backups
echo ""
echo "Current backups:"
ls -lh "$BACKUP_DIR"

echo ""
echo "=== Backup Complete ==="
