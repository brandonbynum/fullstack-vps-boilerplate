# Hetzner VPS Deployment Guide

Complete guide for deploying the fullstack boilerplate to a Hetzner VPS with SSL certificates.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Deployment Steps](#detailed-deployment-steps)
  - [Phase 1: Domain Setup](#phase-1-domain-setup)
  - [Phase 2: VPS Initial Setup](#phase-2-vps-initial-setup)
  - [Phase 3: Upload Application](#phase-3-upload-application)
  - [Phase 4: SSL Certificates](#phase-4-ssl-certificates)
  - [Phase 5: Environment Configuration](#phase-5-environment-configuration)
  - [Phase 6: Deploy Application](#phase-6-deploy-application)
  - [Phase 7: Verification](#phase-7-verification)
  - [Phase 8: Post-Deployment](#phase-8-post-deployment)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

---

## Overview

This guide will help you deploy your application to a Hetzner VPS with:
- Podman containers for isolation and easy management
- Let's Encrypt SSL certificates for HTTPS
- Nginx reverse proxy with security headers
- PostgreSQL database with automatic backups
- Systemd service for automatic startup
- UFW firewall and fail2ban for security

**Deployment time:** Approximately 45-60 minutes for first-time setup

---

## Prerequisites

Before starting, ensure you have:

- ✅ **Hetzner VPS** running Ubuntu 22.04 or Debian 12
- ✅ **SSH access** to your VPS as root
- ✅ **Domain name** (purchase from Namecheap, Cloudflare, or similar)
- ✅ **Local machine** with this codebase

**VPS Minimum Requirements:**
- 2 GB RAM
- 2 vCPU
- 40 GB SSD
- Ubuntu 22.04 LTS or Debian 12

**Recommended VPS:** Hetzner CPX11 or CPX21 (~€5-10/month)

---

## Quick Start

For experienced users, here's the condensed version:

```bash
# 1. Point your domain to VPS IP
# Add A records for @ and www to your VPS IP

# 2. Setup VPS (on VPS as root)
scp infrastructure/scripts/setup-vps.sh root@YOUR_VPS_IP:/root/
ssh root@YOUR_VPS_IP
./setup-vps.sh
passwd appuser
ssh-copy-id appuser@YOUR_VPS_IP

# 3. Upload code (from local machine)
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  ./ appuser@YOUR_VPS_IP:/opt/fullstack-app/

# 4. Configure environment (on VPS as appuser)
ssh appuser@YOUR_VPS_IP
cd /opt/fullstack-app
cp .env.production.example .env
# Edit .env with your secrets and domain

# 5. Setup SSL (on VPS as appuser)
./infrastructure/scripts/setup-ssl.sh yourdomain.com admin@yourdomain.com

# 6. Deploy (on VPS as appuser)
./infrastructure/scripts/deploy.sh

# 7. Enable auto-start (on VPS)
sudo systemctl enable fullstack-app
sudo systemctl start fullstack-app
```

---

## Detailed Deployment Steps

### Phase 1: Domain Setup

**Time: 15-30 minutes (including DNS propagation)**

#### 1.1 Purchase Domain

Choose a domain registrar:
- **Namecheap** - $8-12/year, easy DNS management
- **Cloudflare** - $9/year, includes CDN
- **Porkbun** - $7-10/year, privacy included
- **Google Domains** - $12/year, simple interface

#### 1.2 Get Your VPS IP Address

```bash
# SSH into your VPS
ssh root@YOUR_VPS_IP

# Get the public IP
ip addr show | grep "inet " | grep -v 127.0.0.1
```

Note the public IPv4 address (e.g., `123.45.67.89`)

#### 1.3 Configure DNS Records

In your domain registrar's DNS settings, add:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_VPS_IP | 300 |
| A | www | YOUR_VPS_IP | 300 |

**Example for domain `example.com` with VPS IP `123.45.67.89`:**
```
A     @       123.45.67.89
A     www     123.45.67.89
```

#### 1.4 Verify DNS Propagation

```bash
# Check from your local machine
dig yourdomain.com +short
# Should return: YOUR_VPS_IP

dig www.yourdomain.com +short
# Should return: YOUR_VPS_IP
```

If DNS isn't propagated yet, wait 15-30 minutes and check again.

---

### Phase 2: VPS Initial Setup

**Time: 10-15 minutes**

#### 2.1 Upload Setup Script

From your local machine:

```bash
cd /path/to/fullstack-vps-boilerplate
scp infrastructure/scripts/setup-vps.sh root@YOUR_VPS_IP:/root/
```

#### 2.2 Run VPS Setup

SSH into your VPS and execute the setup script:

```bash
ssh root@YOUR_VPS_IP
cd /root
chmod +x setup-vps.sh
./setup-vps.sh
```

This script will:
- ✅ Update system packages
- ✅ Install Podman and podman-compose
- ✅ Configure UFW firewall (allow only SSH, HTTP, HTTPS)
- ✅ Setup fail2ban for SSH protection
- ✅ Create `appuser` with sudo privileges
- ✅ Create `/opt/fullstack-app` directory
- ✅ Setup systemd service
- ✅ Configure log rotation

**Expected output:**
```
=== Full-Stack App VPS Setup ===
Updating system packages...
Installing essential packages...
Installing Podman...
Configuring firewall...
Creating app user...
=== VPS Setup Complete ===
```

#### 2.3 Set Password for appuser

```bash
passwd appuser
# Enter a strong password when prompted
```

#### 2.4 Setup SSH Key for appuser

From your local machine:

```bash
# Copy your SSH key to appuser
ssh-copy-id appuser@YOUR_VPS_IP

# Test login
ssh appuser@YOUR_VPS_IP
# Should log in without password
```

#### 2.5 Verify Installation

```bash
# Check Podman
podman --version
# Output: podman version 4.x.x

podman-compose --version
# Output: podman-compose version 1.x.x

# Check firewall
sudo ufw status
# Output should show:
# Status: active
# To                         Action      From
# --                         ------      ----
# 22/tcp                     ALLOW       Anywhere
# 80/tcp                     ALLOW       Anywhere
# 443/tcp                    ALLOW       Anywhere

# Check appuser exists
id appuser
# Output: uid=1000(appuser) gid=1000(appuser) groups=1000(appuser),27(sudo)
```

---

### Phase 3: Upload Application

**Time: 2-5 minutes**

#### 3.1 Sync Application Files

From your local machine in the project directory:

```bash
# Sync all files except node_modules and .env
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude 'apps/backend/.env' \
  --exclude 'apps/frontend/.env' \
  ./ appuser@YOUR_VPS_IP:/opt/fullstack-app/
```

**Options explained:**
- `-a` - Archive mode (preserves permissions, timestamps)
- `-v` - Verbose output
- `-z` - Compress during transfer
- `--progress` - Show progress bar
- `--exclude` - Skip specified files/directories

#### 3.2 Verify Upload

```bash
ssh appuser@YOUR_VPS_IP
ls -la /opt/fullstack-app

# Should see:
# - apps/
# - infrastructure/
# - packages/
# - package.json
# - turbo.json
# - etc.
```

---

### Phase 4: SSL Certificates

**Time: 5-10 minutes**

**Prerequisites:**
- ✅ DNS must be fully propagated (verified with `dig`)
- ✅ Ports 80 and 443 must be open (UFW configured in Phase 2)

#### 4.1 Verify DNS Propagation

```bash
# From local machine or VPS
dig yourdomain.com +short
# Must return your VPS IP address
```

If not propagated, **STOP** and wait. Let's Encrypt will fail if DNS isn't working.

#### 4.2 Run SSL Setup Script

```bash
ssh appuser@YOUR_VPS_IP
cd /opt/fullstack-app

# Replace with your actual domain and email
./infrastructure/scripts/setup-ssl.sh yourdomain.com admin@yourdomain.com
```

**What this script does:**
1. Generates nginx configuration from template
2. Starts temporary nginx server
3. Requests Let's Encrypt SSL certificates
4. Configures auto-renewal via certbot container

**Expected output:**
```
=== SSL Setup for yourdomain.com ===
Creating nginx configuration...
Starting nginx for certificate acquisition...
Requesting SSL certificate...
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/yourdomain.com/fullchain.pem
Key is saved at: /etc/letsencrypt/live/yourdomain.com/privkey.pem
=== SSL Setup Complete ===
```

#### 4.3 Verify Certificates

```bash
# Check if certificates were issued
sudo podman volume inspect certbot_data

# Test certificate renewal (dry run)
podman run --rm \
  -v certbot_data:/etc/letsencrypt \
  certbot/certbot renew --dry-run
```

---

### Phase 5: Environment Configuration

**Time: 5-10 minutes**

#### 5.1 Generate Secure Secrets

```bash
ssh appuser@YOUR_VPS_IP
cd /opt/fullstack-app

# Generate secrets
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')

# Display them (SAVE THESE SOMEWHERE SAFE!)
echo "==== SAVE THESE SECRETS ===="
echo "JWT_SECRET=$JWT_SECRET"
echo ""
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo ""
echo "DB_PASSWORD=$DB_PASSWORD"
echo "============================"
```

**IMPORTANT:** Copy these values to a secure location (password manager, encrypted file, etc.)

#### 5.2 Create Production .env File

```bash
cd /opt/fullstack-app

# Copy template
cp .env.production.example .env

# Edit with your favorite editor
vim .env
# or
nano .env
```

#### 5.3 Update Environment Variables

Replace these placeholders in `.env`:

```bash
# Update domain
DOMAIN=yourdomain.com

# Update database password
POSTGRES_PASSWORD=paste_your_DB_PASSWORD_here

# Update JWT secrets
JWT_SECRET=paste_your_JWT_SECRET_here
JWT_REFRESH_SECRET=paste_your_JWT_REFRESH_SECRET_here

# Update URLs
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Update app name (optional)
VITE_APP_NAME=My Awesome App
```

**Email Configuration (Optional - can skip for now):**

If you want email functionality (magic links, notifications), configure SMTP:

```bash
# For Resend (recommended - free tier: 3000 emails/month)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=re_your_api_key_here
EMAIL_FROM=noreply@yourdomain.com
```

To get Resend API key:
1. Sign up at https://resend.com
2. Verify your domain
3. Create an API key
4. Use it as SMTP_PASSWORD

#### 5.4 Secure the .env File

```bash
# Set restrictive permissions (only owner can read)
chmod 600 .env

# Verify permissions
ls -la .env
# Should show: -rw------- 1 appuser appuser
```

#### 5.5 Verify Configuration

```bash
# Check no placeholders remain
grep "REPLACE" .env
# Should return nothing

grep "yourdomain" .env
# Should show your actual domain

# Verify required variables are set
grep -E "^(JWT_SECRET|JWT_REFRESH_SECRET|POSTGRES_PASSWORD|DOMAIN)=" .env
# Should show all four variables with actual values
```

---

### Phase 6: Deploy Application

**Time: 10-15 minutes (includes build time)**

#### 6.1 Run Deployment Script

```bash
ssh appuser@YOUR_VPS_IP
cd /opt/fullstack-app

# Run deployment
./infrastructure/scripts/deploy.sh
```

**What happens during deployment:**

1. ✅ Stops any existing containers
2. ✅ Pulls latest base images (postgres, nginx)
3. ✅ Builds backend container (~2-3 minutes)
4. ✅ Builds frontend container (~2-3 minutes)
5. ✅ Starts PostgreSQL database
6. ✅ Waits for database to be healthy
7. ✅ Runs Prisma migrations
8. ✅ Starts all services (backend, frontend, nginx, certbot)
9. ✅ Runs health checks

**Expected output:**
```
=== Full-Stack App Deployment ===
App directory: /opt/fullstack-app

Stopping existing containers...
Pulling latest base images...
Building application containers...
[+] Building 180.5s (34/34) FINISHED

Starting database...
Waiting for database to be ready...
Database is ready!

Running database migrations...
Migration applied successfully

Starting all services...
Running health checks...
Backend: OK
Frontend: OK

=== Deployment Complete ===

Services status:
CONTAINER ID  IMAGE                               COMMAND               CREATED        STATUS            PORTS                                     NAMES
abc123def456  localhost/fullstack-backend:latest  node dist/server.js   1 minute ago   Up 1 minute ago                                             fullstack-backend
def456ghi789  localhost/fullstack-frontend:latest nginx -g daemon off  1 minute ago   Up 1 minute ago                                             fullstack-frontend
ghi789jkl012  docker.io/library/postgres:16-alpine postgres            1 minute ago   Up 1 minute ago                                             fullstack-postgres
jkl012mno345  docker.io/library/nginx:alpine      nginx -g daemon off  1 minute ago   Up 1 minute ago   0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp fullstack-nginx
mno345pqr678  docker.io/certbot/certbot           /bin/sh -c...        1 minute ago   Up 1 minute ago                                             fullstack-certbot
```

#### 6.2 Monitor Logs (Optional)

If you want to watch the logs:

```bash
# Backend logs
podman logs -f fullstack-backend

# Frontend logs
podman logs -f fullstack-frontend

# Nginx logs
podman logs -f fullstack-nginx

# All logs (in separate terminal windows)
podman-compose -f infrastructure/podman/compose.yml -f infrastructure/podman/compose.prod.yml logs -f
```

#### 6.3 Enable Auto-Start on Boot

```bash
# Enable systemd service
sudo systemctl enable fullstack-app

# Start the service
sudo systemctl start fullstack-app

# Check status
sudo systemctl status fullstack-app
# Should show: active (running)
```

---

### Phase 7: Verification

**Time: 5-10 minutes**

#### 7.1 Run Health Check Script

```bash
ssh appuser@YOUR_VPS_IP
cd /opt/fullstack-app
./infrastructure/scripts/health-check.sh
```

**Expected output:**
```
=== Health Check ===

Container Status:
-----------------
[All 5 containers running]

Database Health:
----------------
PostgreSQL: OK

Backend Health:
---------------
Backend API: OK

Frontend Health:
----------------
Frontend: OK

Disk Usage:
-----------
/dev/sda1       40G  8.5G   29G  23% /

Memory Usage:
-------------
              total        used        free      shared  buff/cache   available
Mem:          2.0Gi       1.2Gi       400Mi       8.0Mi       400Mi       700Mi

=======================
All checks passed!
```

#### 7.2 Test HTTPS Access

From your local machine:

```bash
# Test HTTPS redirect
curl -I http://yourdomain.com
# Should return: HTTP/1.1 301 Moved Permanently
# Location: https://yourdomain.com

# Test HTTPS
curl -I https://yourdomain.com
# Should return: HTTP/2 200

# Test www subdomain
curl -I https://www.yourdomain.com
# Should return: HTTP/2 200
```

#### 7.3 Test API Endpoints

```bash
# Health check
curl https://yourdomain.com/health
# Output: healthy

# Backend health
curl https://yourdomain.com/api/health
# Output: {"status":"ok","timestamp":"2024-01-XX..."}

# Hello World endpoint
curl "https://yourdomain.com/api/trpc/hello.getHello?batch=1"
# Output: JSON with message "Hello World from tRPC!"
```

#### 7.4 Test in Browser

1. **Open https://yourdomain.com**
   - Should load without SSL warnings
   - Green padlock should appear in address bar

2. **Check SSL Certificate**
   - Click padlock icon
   - Verify certificate is from "Let's Encrypt"
   - Verify expiration date (~90 days from now)

3. **Test Hello World Component**
   - Click "Fetch Hello" button
   - Should display server message
   - Enter your name and click "Get Custom Greeting"
   - Increment counter - Zustand state should update

4. **Check Browser Console**
   - Open Developer Tools (F12)
   - Console tab should have no errors
   - Network tab should show successful API calls

#### 7.5 Test Auto-Start

```bash
ssh appuser@YOUR_VPS_IP

# Restart the server to test auto-start
sudo systemctl restart fullstack-app

# Wait 30 seconds
sleep 30

# Verify application is running
./infrastructure/scripts/health-check.sh
```

---

### Phase 8: Post-Deployment

**Can be done immediately or later**

#### 8.1 Setup Database Backups

```bash
ssh appuser@YOUR_VPS_IP

# Test backup script
cd /opt/fullstack-app
./infrastructure/scripts/backup-db.sh

# Setup daily backups at 3 AM
crontab -e

# Add this line:
0 3 * * * /opt/fullstack-app/infrastructure/scripts/backup-db.sh

# Verify cron is set
crontab -l
```

**Backup retention:** Keeps last 7 days of backups automatically.

**Backup location:** `/opt/fullstack-app/backups/`

#### 8.2 Configure Email Service (Optional)

If you skipped email configuration earlier:

```bash
ssh appuser@YOUR_VPS_IP
cd /opt/fullstack-app

# Edit .env
vim .env

# Update SMTP settings
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=re_your_api_key
EMAIL_FROM=noreply@yourdomain.com

# Restart application
sudo systemctl restart fullstack-app
```

#### 8.3 Setup Monitoring (Recommended)

**Free uptime monitoring services:**

1. **UptimeRobot** (https://uptimerobot.com)
   - Free tier: 50 monitors, 5-minute intervals
   - Setup: Add https://yourdomain.com/health

2. **Better Uptime** (https://betteruptime.com)
   - Free tier: 10 monitors, 3-minute intervals
   - Email and Slack notifications

3. **Healthchecks.io** (https://healthchecks.io)
   - Free tier: 20 checks
   - Cron monitoring included

**Setup example (UptimeRobot):**
1. Sign up at https://uptimerobot.com
2. Add new monitor:
   - Monitor Type: HTTPS
   - URL: https://yourdomain.com/health
   - Monitoring Interval: 5 minutes
3. Add notification channels (email, Slack, etc.)

#### 8.4 Review Security

```bash
ssh appuser@YOUR_VPS_IP

# Check firewall rules
sudo ufw status verbose

# Check fail2ban status
sudo fail2ban-client status sshd

# Review SSH configuration (optional - disable password auth)
sudo vim /etc/ssh/sshd_config
# Set: PasswordAuthentication no
# Restart: sudo systemctl restart sshd
```

---

## Troubleshooting

### DNS Issues

**Problem:** DNS not propagating

```bash
# Check DNS from multiple locations
dig @8.8.8.8 yourdomain.com +short
dig @1.1.1.1 yourdomain.com +short

# Check DNS propagation globally
# Visit: https://www.whatsmydns.net/#A/yourdomain.com
```

**Solution:** Wait 15-30 more minutes. DNS can take up to 48 hours but usually propagates within 30 minutes.

---

### SSL Certificate Issues

**Problem:** Certificate request fails

```bash
# Check port 80 is accessible
curl -I http://yourdomain.com/.well-known/acme-challenge/test

# Check certbot logs
podman logs fullstack-certbot
```

**Common causes:**
- DNS not propagated yet
- Firewall blocking port 80
- Domain pointing to wrong IP

**Solution:**
```bash
# Verify DNS first
dig yourdomain.com +short

# Check firewall
sudo ufw status | grep 80

# Retry SSL setup
cd /opt/fullstack-app
./infrastructure/scripts/setup-ssl.sh yourdomain.com admin@yourdomain.com
```

---

### Container Issues

**Problem:** Containers won't start

```bash
# Check container logs
podman logs fullstack-backend
podman logs fullstack-frontend
podman logs fullstack-postgres

# Check container status
podman ps -a
```

**Problem:** Backend fails to start

```bash
# Check backend logs
podman logs fullstack-backend

# Common issues:
# 1. Database connection failed
podman exec fullstack-postgres pg_isready -U postgres

# 2. Missing environment variables
grep "JWT_SECRET" /opt/fullstack-app/.env

# 3. Build errors - rebuild
cd /opt/fullstack-app
podman-compose -f infrastructure/podman/compose.yml -f infrastructure/podman/compose.prod.yml build backend --no-cache
```

---

### Database Issues

**Problem:** Database migrations fail

```bash
# Check database is running
podman ps | grep postgres

# Check database logs
podman logs fullstack-postgres

# Manually run migrations
podman exec -it fullstack-backend sh
cd /app
npx prisma migrate deploy
```

**Problem:** Database connection refused

```bash
# Verify DATABASE_URL in .env
grep DATABASE_URL /opt/fullstack-app/.env

# Check postgres is healthy
podman exec fullstack-postgres pg_isready -U postgres -d fullstack

# Check network
podman network inspect fullstack-app_internal
```

---

### Application Issues

**Problem:** 502 Bad Gateway

**Cause:** Backend not responding

```bash
# Check backend health
curl http://localhost:4000/health

# Check backend logs
podman logs fullstack-backend

# Restart backend
podman restart fullstack-backend
```

**Problem:** Frontend not loading

```bash
# Check frontend logs
podman logs fullstack-frontend

# Check nginx logs
podman logs fullstack-nginx

# Rebuild frontend
cd /opt/fullstack-app
podman-compose -f infrastructure/podman/compose.yml -f infrastructure/podman/compose.prod.yml build frontend --no-cache
```

---

### Port Conflicts

**Problem:** Port 443 already in use

```bash
# Check what's using port 443
sudo lsof -i :443

# Kill the process
sudo kill <PID>

# Or use a different port
# Edit infrastructure/podman/compose.prod.yml
# Change "443:443" to "8443:443"
```

---

### Performance Issues

**Problem:** High memory usage

```bash
# Check memory
free -h

# Check container resource usage
podman stats

# Restart containers
sudo systemctl restart fullstack-app
```

**Problem:** Slow database queries

```bash
# Check database size
podman exec fullstack-postgres psql -U postgres -d fullstack -c "\dt+"

# Optimize database (if needed)
podman exec fullstack-postgres vacuumdb -U postgres -d fullstack --analyze
```

---

## Maintenance

### Regular Tasks

**Daily (Automated):**
- Database backups (via cron)
- Log rotation (via logrotate)
- SSL certificate renewal checks (via certbot container)

**Weekly:**
```bash
# Check application health
ssh appuser@YOUR_VPS_IP
cd /opt/fullstack-app
./infrastructure/scripts/health-check.sh

# Check disk space
df -h

# Review logs
podman logs fullstack-backend --tail 100
podman logs fullstack-nginx --tail 100
```

**Monthly:**
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Podman images
cd /opt/fullstack-app
podman pull postgres:16-alpine
podman pull nginx:alpine

# Rebuild and deploy
./infrastructure/scripts/deploy.sh

# Clean up old images
podman image prune -f
```

**Quarterly:**
- Review security updates
- Check SSL certificate expiration (auto-renews but verify)
- Review and update dependencies
- Check backup integrity (restore test backup)

---

### Updating Application

When you make changes to your code:

```bash
# 1. From local machine, sync changes
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  ./ appuser@YOUR_VPS_IP:/opt/fullstack-app/

# 2. On VPS, redeploy
ssh appuser@YOUR_VPS_IP
cd /opt/fullstack-app
./infrastructure/scripts/deploy.sh
```

---

### Restoring from Backup

If you need to restore the database:

```bash
ssh appuser@YOUR_VPS_IP
cd /opt/fullstack-app

# List available backups
ls -lah backups/

# Restore from backup
gunzip -c backups/backup_YYYYMMDD_HHMMSS.sql.gz | \
  podman exec -i fullstack-postgres psql -U postgres -d fullstack

# Verify restoration
podman exec fullstack-postgres psql -U postgres -d fullstack -c "\dt"
```

---

### Rollback Deployment

If a deployment fails:

```bash
# 1. Stop all containers
cd /opt/fullstack-app
podman-compose -f infrastructure/podman/compose.yml -f infrastructure/podman/compose.prod.yml down

# 2. Check logs for errors
podman logs fullstack-backend
podman logs fullstack-frontend

# 3. Fix issues and redeploy
./infrastructure/scripts/deploy.sh

# 4. If database is corrupted, restore from backup
gunzip -c backups/backup_latest.sql.gz | \
  podman exec -i fullstack-postgres psql -U postgres -d fullstack
```

---

## Success Checklist

- ✅ VPS setup completed without errors
- ✅ Domain DNS points to VPS IP
- ✅ SSL certificates issued and HTTPS works
- ✅ All 5 containers running (postgres, backend, frontend, nginx, certbot)
- ✅ Health checks pass for all services
- ✅ Application accessible via https://yourdomain.com
- ✅ Hello World example works in browser
- ✅ No SSL warnings in browser
- ✅ Systemd service enabled for auto-start on reboot
- ✅ Firewall configured (only SSH, HTTP, HTTPS allowed)
- ✅ Database backups configured
- ✅ Monitoring setup (optional)
- ✅ Email service configured (optional)

---

## Additional Resources

- **Hetzner Docs:** https://docs.hetzner.com
- **Podman Docs:** https://docs.podman.io
- **Let's Encrypt:** https://letsencrypt.org/docs/
- **Nginx Docs:** https://nginx.org/en/docs/

---

## Getting Help

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review container logs: `podman logs <container-name>`
3. Run health check: `./infrastructure/scripts/health-check.sh`
4. Check system logs: `journalctl -u fullstack-app -n 100`

---

**Deployment Complete!** 🚀

Your application is now running at https://yourdomain.com
