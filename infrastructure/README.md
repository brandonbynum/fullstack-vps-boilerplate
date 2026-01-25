# Infrastructure Documentation

Complete infrastructure for deploying the fullstack application to a VPS with Podman containers.

## Overview

This infrastructure supports:
- **Containerized deployment** using Podman
- **SSL/HTTPS** via Let's Encrypt
- **Reverse proxy** with Nginx
- **Database** with PostgreSQL 16
- **Auto-start** via systemd
- **Security** with UFW firewall and fail2ban
- **Monitoring** with health checks
- **Backups** with automated daily backups

## Directory Structure

```
infrastructure/
├── nginx/                      # Nginx configuration
│   ├── nginx.conf             # Main nginx config
│   ├── sites-available/
│   │   └── app.conf.template  # Application vhost template
│   └── snippets/
│       ├── proxy-params.conf  # Proxy headers
│       ├── security-headers.conf  # Security headers
│       └── ssl-params.conf    # SSL configuration
├── podman/                     # Container orchestration
│   ├── compose.yml            # Base compose file
│   ├── compose.dev.yml        # Development overrides
│   └── compose.prod.yml       # Production overrides
├── scripts/                    # Deployment scripts
│   ├── setup-vps.sh           # Initial VPS setup
│   ├── setup-ssl.sh           # SSL certificate setup
│   ├── deploy.sh              # Application deployment
│   ├── health-check.sh        # Health monitoring
│   └── backup-db.sh           # Database backup
└── systemd/                    # Systemd service
    └── fullstack-app.service  # Application service
```

## Components

### 1. Podman Compose Files

#### `compose.yml` (Base)
- PostgreSQL 16 database
- Backend Node.js application
- Frontend static files (nginx)
- Shared internal network
- Volume management

#### `compose.prod.yml` (Production)
- Nginx reverse proxy
- SSL certificate integration
- Certbot for auto-renewal
- Resource limits
- Port exposure (80, 443)

#### `compose.dev.yml` (Development)
- Port forwarding for local access
- Development environment variables
- Hot reload support

### 2. Nginx Configuration

#### Main Config (`nginx.conf`)
- Worker processes optimization
- Gzip compression
- Rate limiting zones:
  - API: 10 requests/second
  - Auth: 1 request/second
- Security hardening

#### Application Config (`app.conf.template`)
- HTTP to HTTPS redirect
- Let's Encrypt challenge handling
- Backend API proxy (`/api/*`)
- Frontend static files (`/`)
- Health check endpoint
- SSL certificate configuration

#### Snippets
- **proxy-params.conf**: Reverse proxy headers
- **security-headers.conf**: Security headers (CSP, HSTS, etc.)
- **ssl-params.conf**: SSL/TLS configuration

### 3. Deployment Scripts

#### `setup-vps.sh`
**Purpose:** Initial VPS setup (run once)

**Actions:**
- Updates system packages
- Installs Podman and podman-compose
- Configures UFW firewall
- Sets up fail2ban
- Creates `appuser` user
- Creates application directory
- Installs systemd service
- Configures log rotation

**Usage:**
```bash
scp infrastructure/scripts/setup-vps.sh root@VPS_IP:/root/
ssh root@VPS_IP "./setup-vps.sh"
```

#### `setup-ssl.sh`
**Purpose:** Obtain Let's Encrypt SSL certificates

**Requirements:**
- DNS must be propagated
- Ports 80/443 must be open

**Actions:**
- Generates nginx configuration
- Starts temporary nginx server
- Requests SSL certificates for domain and www subdomain
- Configures auto-renewal

**Usage:**
```bash
./infrastructure/scripts/setup-ssl.sh yourdomain.com admin@yourdomain.com
```

#### `deploy.sh`
**Purpose:** Deploy/update application

**Actions:**
1. Validates .env file exists
2. Stops existing containers
3. Pulls latest base images
4. Builds backend and frontend containers
5. Starts database
6. Waits for database health
7. Runs Prisma migrations
8. Starts all services
9. Runs health checks

**Usage:**
```bash
cd /opt/fullstack-app
./infrastructure/scripts/deploy.sh
```

#### `health-check.sh`
**Purpose:** Monitor application health

**Checks:**
- Container status
- Database connectivity
- Backend API health
- Frontend availability
- Disk usage
- Memory usage

**Usage:**
```bash
./infrastructure/scripts/health-check.sh
```

#### `backup-db.sh`
**Purpose:** Backup PostgreSQL database

**Actions:**
- Creates compressed SQL dump
- Stores in `backups/` directory
- Retains last 7 days of backups
- Reports backup size

**Usage:**
```bash
# Manual backup
./infrastructure/scripts/backup-db.sh

# Automated (cron)
0 3 * * * /opt/fullstack-app/infrastructure/scripts/backup-db.sh
```

### 4. Systemd Service

**File:** `fullstack-app.service`

**Features:**
- Auto-start on boot
- Auto-restart on failure
- Runs as `appuser` (non-root)
- Environment file support
- Security hardening:
  - NoNewPrivileges
  - ProtectSystem
  - ProtectHome
  - ReadWritePaths

**Management:**
```bash
# Enable auto-start
sudo systemctl enable fullstack-app

# Start service
sudo systemctl start fullstack-app

# Check status
sudo systemctl status fullstack-app

# View logs
journalctl -u fullstack-app -f
```

## Container Architecture

```
┌─────────────────────────────────────────┐
│          Internet (Port 80/443)         │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Nginx Reverse Proxy             │
│  - SSL Termination                      │
│  - Rate Limiting                        │
│  - Security Headers                     │
└─────────┬──────────────────┬────────────┘
          │                  │
          │ /api/*          │ / (static)
          │                  │
┌─────────▼──────────┐  ┌───▼─────────────┐
│   Backend (4000)   │  │  Frontend (80)  │
│  - Node.js         │  │  - Static files │
│  - tRPC API        │  │  - React SPA    │
│  - Prisma ORM      │  │  - Nginx serve  │
└─────────┬──────────┘  └─────────────────┘
          │
          │ Database queries
          │
┌─────────▼──────────┐  ┌─────────────────┐
│  PostgreSQL (5432) │  │  Certbot        │
│  - Internal only   │  │  - Auto-renew   │
│  - Volume persist  │  │  - Every 12h    │
└────────────────────┘  └─────────────────┘

Network: fullstack-app_internal (bridge)
```

## Security Features

### Firewall (UFW)
```bash
Port 22  (SSH)   - Allowed
Port 80  (HTTP)  - Allowed (redirects to HTTPS)
Port 443 (HTTPS) - Allowed
All others       - Denied
```

### fail2ban
- Monitors SSH login attempts
- Bans IPs after 3 failed attempts
- Ban duration: 1 hour

### Nginx Security Headers
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: enabled
- Content-Security-Policy: restricted
- Strict-Transport-Security (HSTS)
- Permissions-Policy: restricted

### SSL/TLS Configuration
- TLS 1.2 and 1.3 only
- Strong cipher suites
- OCSP stapling enabled
- Session security

### Container Security
- Non-root users in containers
- Read-only volumes where possible
- Network isolation
- Resource limits

## Environment Variables

Required variables (see `.env.production.example`):

```bash
# Environment
NODE_ENV=production
DOMAIN=yourdomain.com

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<secure-password>
POSTGRES_DB=fullstack

# JWT Secrets
JWT_SECRET=<64-byte-secret>
JWT_REFRESH_SECRET=<64-byte-secret>

# URLs
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Vite (Build time)
VITE_API_URL=/api
VITE_APP_NAME=My App

# Email (Optional)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=<api-key>
EMAIL_FROM=noreply@yourdomain.com
```

## Resource Requirements

### Minimum
- 2 GB RAM
- 2 vCPU
- 20 GB disk

### Recommended
- 4 GB RAM
- 2 vCPU
- 40 GB disk

### Container Resource Limits (Production)

```yaml
Backend:
  CPU: 0.25-1 core
  Memory: 256-512 MB

Frontend:
  CPU: 0.1-0.5 core
  Memory: 128-256 MB

Database:
  CPU: No limit (burstable)
  Memory: No limit (uses available)
```

## Monitoring

### Health Endpoints

```bash
# Overall health
https://yourdomain.com/health

# Backend API health
https://yourdomain.com/api/health

# Database health
podman exec fullstack-postgres pg_isready
```

### Logs

```bash
# Application logs
journalctl -u fullstack-app -f

# Container logs
podman logs -f fullstack-backend
podman logs -f fullstack-frontend
podman logs -f fullstack-nginx

# System logs
journalctl -f
```

### Metrics

```bash
# Container resource usage
podman stats

# Disk usage
df -h

# Memory usage
free -h

# Database size
podman exec fullstack-postgres psql -U postgres -d fullstack -c "\dt+"
```

## Backup & Recovery

### Automated Backups

```bash
# Setup daily backups at 3 AM
crontab -e
0 3 * * * /opt/fullstack-app/infrastructure/scripts/backup-db.sh
```

### Backup Location
```
/opt/fullstack-app/backups/
├── backup_20240115_030000.sql.gz
├── backup_20240116_030000.sql.gz
└── backup_20240117_030000.sql.gz
```

### Restore Backup

```bash
# List backups
ls -lah /opt/fullstack-app/backups/

# Restore
gunzip -c backups/backup_YYYYMMDD_HHMMSS.sql.gz | \
  podman exec -i fullstack-postgres psql -U postgres -d fullstack
```

## Deployment Workflow

### Initial Deployment

1. **VPS Setup** → `setup-vps.sh`
2. **Upload Code** → `rsync`
3. **Configure Environment** → `.env`
4. **SSL Setup** → `setup-ssl.sh`
5. **Deploy** → `deploy.sh`
6. **Enable Service** → `systemctl enable`

### Updates

1. **Sync Code** → `rsync`
2. **Redeploy** → `deploy.sh`

### Rollback

1. **Stop** → `systemctl stop`
2. **Restore Backup** → `backup-db.sh`
3. **Deploy Previous Version** → `deploy.sh`

## Troubleshooting

### Common Issues

**Containers won't start:**
```bash
podman logs <container-name>
```

**Database connection failed:**
```bash
podman exec fullstack-postgres pg_isready -U postgres
```

**502 Bad Gateway:**
```bash
podman restart fullstack-backend
```

**SSL certificate error:**
```bash
podman run --rm -v certbot_data:/etc/letsencrypt certbot/certbot certificates
```

**Out of disk space:**
```bash
podman system prune -af
```

### Getting Help

1. Check logs: `podman logs <container>`
2. Run health check: `./infrastructure/scripts/health-check.sh`
3. Check service status: `systemctl status fullstack-app`
4. Review documentation: `DEPLOYMENT.md`

## Maintenance

### Daily
- Automated database backups (cron)
- Log rotation (logrotate)
- SSL renewal checks (certbot)

### Weekly
- Health check review
- Log analysis
- Disk space check

### Monthly
- System updates: `apt update && apt upgrade`
- Image updates: `podman pull`
- Backup verification

### Quarterly
- Security audit
- Dependency updates
- Performance review

## Related Documentation

- **DEPLOYMENT.md** - Complete deployment guide
- **QUICK-REFERENCE.md** - Common commands
- **.env.production.example** - Environment template
- **README.md** - Project overview

---

**Infrastructure Version:** 1.0.0
**Last Updated:** 2024-01-17
**Maintained By:** Application Team
