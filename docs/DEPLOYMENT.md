# Deployment Guide

This guide covers deploying the application to a VPS using Podman containers.

## Prerequisites

- VPS with Ubuntu 22.04 or Debian 12
- Minimum: 2 vCPU, 2 GB RAM
- Domain name pointed to your VPS IP
- SSH access to the server

## Recommended VPS Providers

| Provider | Plan | Price | Notes |
|----------|------|-------|-------|
| Hetzner | CPX11 | ~$4/mo | Best value for EU |
| DigitalOcean | Basic | ~$6/mo | Good for US |
| Vultr | Cloud Compute | ~$6/mo | Global locations |
| Linode | Nanode | ~$5/mo | Good performance |

## VPS Setup

### 1. Initial Server Setup

SSH into your server and run the setup script:

```bash
# Upload setup script
scp infrastructure/scripts/setup-vps.sh root@your-server:/root/

# Run on server
ssh root@your-server
chmod +x setup-vps.sh
./setup-vps.sh
```

This script:
- Updates system packages
- Installs Podman and Podman Compose
- Configures firewall (UFW)
- Sets up fail2ban
- Creates app user
- Creates systemd service

### 2. Create App User SSH Access

```bash
# On your local machine
ssh-copy-id appuser@your-server
```

### 3. Upload Application

```bash
# From your local machine
rsync -avz --exclude 'node_modules' --exclude '.git' \
  ./ appuser@your-server:/opt/fullstack-app/
```

## SSL Setup

### 1. Point Domain to VPS

Add DNS records:
- A record: `yourdomain.com` → VPS IP
- A record: `www.yourdomain.com` → VPS IP

Wait for DNS propagation (5-30 minutes).

### 2. Request SSL Certificate

```bash
ssh appuser@your-server
cd /opt/fullstack-app
./infrastructure/scripts/setup-ssl.sh yourdomain.com admin@yourdomain.com
```

## Configuration

### 1. Create Environment File

```bash
ssh appuser@your-server
cd /opt/fullstack-app

# Generate secrets
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')

cat > .env << EOF
NODE_ENV=production
DOMAIN=yourdomain.com

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=fullstack

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
MAGIC_LINK_EXPIRES_IN=5m

# URLs
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
VITE_API_URL=/api
VITE_APP_NAME=Your App Name

# Email (configure with your provider)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=your-resend-api-key
EMAIL_FROM=noreply@yourdomain.com
EOF

chmod 600 .env
```

### 2. Verify Configuration

```bash
./scripts/check-env.sh
```

## Deploy Application

### 1. Run Deployment Script

```bash
cd /opt/fullstack-app
./infrastructure/scripts/deploy.sh
```

### 2. Verify Deployment

```bash
# Check health
./infrastructure/scripts/health-check.sh

# Check container status
podman-compose -f infrastructure/podman/compose.yml \
  -f infrastructure/podman/compose.prod.yml ps

# View logs
podman logs fullstack-backend
podman logs fullstack-frontend
podman logs fullstack-nginx
```

### 3. Access Application

Open https://yourdomain.com in your browser.

## Automated Deployments (CI/CD)

### GitHub Actions Setup

1. Go to repository Settings → Secrets and variables → Actions

2. Add the following secrets:

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | Your VPS IP or hostname |
| `VPS_USER` | SSH username (e.g., appuser) |
| `VPS_SSH_KEY` | Private SSH key for deployment |
| `DOMAIN` | Your domain name |
| `POSTGRES_USER` | Database username |
| `POSTGRES_PASSWORD` | Database password |
| `POSTGRES_DB` | Database name |
| `JWT_SECRET` | JWT signing secret |
| `JWT_REFRESH_SECRET` | Refresh token secret |
| `FRONTEND_URL` | Frontend URL (https://yourdomain.com) |
| `ALLOWED_ORIGINS` | CORS allowed origins |
| `SMTP_HOST` | Email SMTP host |
| `SMTP_PORT` | Email SMTP port |
| `SMTP_USER` | Email SMTP username |
| `SMTP_PASSWORD` | Email SMTP password |
| `EMAIL_FROM` | From email address |

3. Push to `main` branch to trigger deployment

## Maintenance

### Database Backups

```bash
# Manual backup
./infrastructure/scripts/backup-db.sh

# Automatic backups (add to crontab)
crontab -e
# Add: 0 3 * * * /opt/fullstack-app/infrastructure/scripts/backup-db.sh
```

### View Logs

```bash
# All containers
podman-compose -f infrastructure/podman/compose.yml \
  -f infrastructure/podman/compose.prod.yml logs

# Specific container
podman logs -f fullstack-backend
```

### Restart Services

```bash
# Using systemd
sudo systemctl restart fullstack-app

# Using Podman Compose
cd /opt/fullstack-app
podman-compose -f infrastructure/podman/compose.yml \
  -f infrastructure/podman/compose.prod.yml restart
```

### Update Application

```bash
# From local machine
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.env' \
  ./ appuser@your-server:/opt/fullstack-app/

# On server
ssh appuser@your-server
cd /opt/fullstack-app
./infrastructure/scripts/deploy.sh
```

## Rollback

If deployment fails:

```bash
# Stop containers
podman-compose -f infrastructure/podman/compose.yml \
  -f infrastructure/podman/compose.prod.yml down

# Restore previous version from backup
# Deploy previous version

# Start containers
podman-compose -f infrastructure/podman/compose.yml \
  -f infrastructure/podman/compose.prod.yml up -d
```

## Scaling

For higher traffic:

1. **Vertical scaling**: Upgrade VPS (more CPU/RAM)
2. **Database**: Use managed PostgreSQL (e.g., Neon, Supabase)
3. **CDN**: Add Cloudflare for static assets
4. **Monitoring**: Add Prometheus + Grafana

## Troubleshooting

See [Troubleshooting Guide](./TROUBLESHOOTING.md) for common issues.
