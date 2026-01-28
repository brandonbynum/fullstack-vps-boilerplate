# Environment Variables

Complete reference for all environment variables used in this application.

## Quick Start

```bash
# Generate secrets
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')

echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo "POSTGRES_PASSWORD=$DB_PASSWORD"
```

## Backend Variables

### Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `POSTGRES_USER` | Yes (compose) | postgres | Database username |
| `POSTGRES_PASSWORD` | Yes (compose) | - | Database password |
| `POSTGRES_DB` | Yes (compose) | fullstack | Database name |
| `DEFAULT_ADMIN_EMAIL` | No | - | Email for default admin user (created during seed) |

**Example:**
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/fullstack?schema=public
```

### JWT Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | - | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Yes | - | Secret for signing refresh tokens |
| `JWT_EXPIRES_IN` | No | 15m | Access token expiration |
| `JWT_REFRESH_EXPIRES_IN` | No | 7d | Refresh token expiration |
| `MAGIC_LINK_EXPIRES_IN` | No | 5m | Magic link validity period |

**Generating secrets:**
```bash
openssl rand -base64 64
```

### URLs & CORS

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTEND_URL` | Yes | - | Frontend application URL |
| `ALLOWED_ORIGINS` | No | - | Comma-separated CORS origins |

**Example:**
```bash
FRONTEND_URL=https://myapp.com
ALLOWED_ORIGINS=https://myapp.com,https://www.myapp.com
```

### Email Service

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMTP_HOST` | Yes* | - | SMTP server hostname |
| `SMTP_PORT` | No | 587 | SMTP server port |
| `SMTP_USER` | Yes* | - | SMTP username |
| `SMTP_PASSWORD` | Yes* | - | SMTP password |
| `EMAIL_FROM` | No | noreply@example.com | Sender email address |

*Required for production

**Example with Resend:**
```bash
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=re_xxxxx
EMAIL_FROM=noreply@myapp.com
```

**Example with Gmail:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=your@gmail.com
```

### Server

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | development | Environment mode |
| `PORT` | No | 4000 | Server port |

## Frontend Variables

All frontend variables must be prefixed with `VITE_` to be exposed to the browser.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | - | Backend API URL |
| `VITE_APP_NAME` | No | Full-Stack App | Application name |

**Example:**
```bash
# Development
VITE_API_URL=http://localhost:4000

# Production (with nginx proxy)
VITE_API_URL=/api
```

## Infrastructure Variables

Used in Podman Compose and deployment scripts.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DOMAIN` | Yes (prod) | - | Production domain |

## Development Configuration

### Backend (.env)

```bash
# Environment
NODE_ENV=development
PORT=4000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fullstack?schema=public

# Default Admin User (optional - for seeding)
DEFAULT_ADMIN_EMAIL=admin@example.com

# JWT (use simple values for development)
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
MAGIC_LINK_EXPIRES_IN=5m

# URLs
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000

# Email (optional in development - links printed to console)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=noreply@localhost
```

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:4000
VITE_APP_NAME=My App (Dev)
```

## Production Configuration

### Root (.env)

```bash
# Environment
NODE_ENV=production
DOMAIN=myapp.com

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=SECURE_PASSWORD_HERE
POSTGRES_DB=myapp

# Default Admin User (IMPORTANT - set this for first deployment)
DEFAULT_ADMIN_EMAIL=admin@myapp.com

# JWT
JWT_SECRET=LONG_SECURE_SECRET_HERE
JWT_REFRESH_SECRET=DIFFERENT_LONG_SECRET_HERE
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
MAGIC_LINK_EXPIRES_IN=5m

# URLs
FRONTEND_URL=https://myapp.com
ALLOWED_ORIGINS=https://myapp.com,https://www.myapp.com
VITE_API_URL=/api
VITE_APP_NAME=My App

# Email
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=re_xxxxx
EMAIL_FROM=noreply@myapp.com
```

## Security Best Practices

### Secret Generation
Always use cryptographically secure random values:
```bash
# For JWT secrets (64 bytes = 512 bits)
openssl rand -base64 64

# For database passwords (32 bytes)
openssl rand -base64 32
```

### Secret Storage
- **Development:** `.env` files (gitignored)
- **CI/CD:** GitHub Secrets
- **Production:** Environment files with `chmod 600`

### Never commit secrets
Ensure `.gitignore` includes:
```
.env
.env.local
.env.*.local
```

## Validation

The backend validates environment variables on startup using Zod:

```typescript
// apps/backend/src/config/env.ts
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  FRONTEND_URL: z.string().url(),
  // ...
})
```

If required variables are missing, the server will fail to start with a descriptive error.

## Checking Configuration

Run the environment check script:

```bash
./scripts/check-env.sh
```

This validates:
- All required variables are set
- Secrets meet minimum length
- URLs are properly formatted
