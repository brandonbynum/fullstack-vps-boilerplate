#!/bin/bash
set -euo pipefail

# Create New Project Script
# This script creates a new project from the boilerplate

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <project-name> [destination-dir]"
    echo ""
    echo "Example:"
    echo "  $0 my-awesome-app"
    echo "  $0 my-awesome-app /path/to/projects"
    exit 1
fi

PROJECT_NAME=$1
DEST_DIR=${2:-.}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOILERPLATE_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="${DEST_DIR}/${PROJECT_NAME}"

echo "=== Creating New Project: ${PROJECT_NAME} ==="
echo ""

# Check if destination already exists
if [[ -d "$PROJECT_DIR" ]]; then
    echo "Error: Directory ${PROJECT_DIR} already exists"
    exit 1
fi

# Copy boilerplate
echo "Copying boilerplate..."
mkdir -p "$PROJECT_DIR"
cp -r "$BOILERPLATE_DIR"/* "$PROJECT_DIR"
cp "$BOILERPLATE_DIR"/.gitignore "$PROJECT_DIR" 2>/dev/null || true
cp "$BOILERPLATE_DIR"/.env.example "$PROJECT_DIR" 2>/dev/null || true

cd "$PROJECT_DIR"

# Remove git history
rm -rf .git

# Update project name in package.json files
echo "Updating project name..."
if command -v sed &> /dev/null; then
    find . -name "package.json" -type f -exec sed -i "s/fullstack-boilerplate/${PROJECT_NAME}/g" {} \;
fi

# Generate secrets
echo "Generating secrets..."
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')

# Create .env file
echo "Creating .env file..."
cat > .env << EOF
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')
POSTGRES_DB=${PROJECT_NAME//-/_}

# JWT Secrets
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
MAGIC_LINK_EXPIRES_IN=5m

# URLs (update for production)
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000

# Email (configure for production)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=noreply@${PROJECT_NAME}.com

# Frontend
VITE_API_URL=http://localhost:4000
VITE_APP_NAME=${PROJECT_NAME}

# Domain (for production)
DOMAIN=${PROJECT_NAME}.com
EOF

# Copy .env for backend
cp .env apps/backend/.env
cat >> apps/backend/.env << EOF

# Backend specific
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://\${POSTGRES_USER}:\${POSTGRES_PASSWORD}@localhost:5432/\${POSTGRES_DB}?schema=public
EOF

# Copy .env for frontend
cat > apps/frontend/.env << EOF
VITE_API_URL=http://localhost:4000
VITE_APP_NAME=${PROJECT_NAME}
EOF

# Initialize git
echo "Initializing git repository..."
git init
git add .
git commit -m "Initial commit from fullstack-boilerplate"

echo ""
echo "=== Project Created Successfully! ==="
echo ""
echo "Project location: ${PROJECT_DIR}"
echo ""
echo "Next steps:"
echo "1. cd ${PROJECT_DIR}"
echo "2. Run ./scripts/setup-dev.sh to setup development environment"
echo "3. Start developing with: pnpm dev"
echo ""
echo "Important:"
echo "- Review and update .env files with your configuration"
echo "- Update README.md with your project information"
echo "- Configure email settings for magic link authentication"
echo ""
