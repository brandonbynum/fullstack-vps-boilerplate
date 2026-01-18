#!/bin/bash
set -euo pipefail

# Environment Check Script
# Validates that all required environment variables are set

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Environment Check ==="
echo ""

cd "$APP_DIR"

ERRORS=0

# Required variables for production
REQUIRED_VARS=(
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "POSTGRES_DB"
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
    "FRONTEND_URL"
    "DOMAIN"
)

# Optional but recommended
OPTIONAL_VARS=(
    "SMTP_HOST"
    "SMTP_PORT"
    "SMTP_USER"
    "SMTP_PASSWORD"
    "EMAIL_FROM"
    "ALLOWED_ORIGINS"
)

# Load .env file
if [[ -f .env ]]; then
    set -a
    source .env
    set +a
    echo "Loaded .env file"
else
    echo "Warning: No .env file found"
fi
echo ""

# Check required variables
echo "Required Variables:"
echo "-------------------"
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        echo "  $var: MISSING"
        ERRORS=$((ERRORS + 1))
    else
        # Mask sensitive values
        if [[ "$var" == *"SECRET"* ]] || [[ "$var" == *"PASSWORD"* ]]; then
            echo "  $var: ******* (set)"
        else
            echo "  $var: ${!var}"
        fi
    fi
done
echo ""

# Check optional variables
echo "Optional Variables:"
echo "-------------------"
for var in "${OPTIONAL_VARS[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        echo "  $var: not set"
    else
        if [[ "$var" == *"PASSWORD"* ]]; then
            echo "  $var: ******* (set)"
        else
            echo "  $var: ${!var}"
        fi
    fi
done
echo ""

# Validate JWT secrets length
echo "Security Checks:"
echo "----------------"
if [[ -n "${JWT_SECRET:-}" ]] && [[ ${#JWT_SECRET} -lt 32 ]]; then
    echo "  JWT_SECRET: Too short (minimum 32 characters)"
    ERRORS=$((ERRORS + 1))
else
    echo "  JWT_SECRET length: OK"
fi

if [[ -n "${JWT_REFRESH_SECRET:-}" ]] && [[ ${#JWT_REFRESH_SECRET} -lt 32 ]]; then
    echo "  JWT_REFRESH_SECRET: Too short (minimum 32 characters)"
    ERRORS=$((ERRORS + 1))
else
    echo "  JWT_REFRESH_SECRET length: OK"
fi
echo ""

# Summary
echo "===================="
if [[ $ERRORS -eq 0 ]]; then
    echo "All checks passed!"
    exit 0
else
    echo "FAILED: ${ERRORS} issue(s) found"
    echo ""
    echo "Fix the issues above and run this script again."
    exit 1
fi
