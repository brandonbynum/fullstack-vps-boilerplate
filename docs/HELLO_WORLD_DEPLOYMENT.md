# Hello World E2E Example - Deployment Guide

This guide covers deploying the updated fullstack boilerplate with the Hello World example to a Hetzner VPS.

## Prerequisites

- [ ] Hetzner VPS provisioned (or any VPS with Ubuntu 22.04/Debian 12)
- [ ] Domain name (e.g., `yourdomain.com`)
- [ ] Domain DNS A record pointing to VPS IP
- [ ] SSH access to the VPS
- [ ] Local machine with `ssh`, `git`, and `ssh-keygen` installed

## Quick Deployment Checklist

### Phase 1: VPS Setup (First Time Only)

```bash
# 1. SSH into your Hetzner VPS
ssh root@your-vps-ip

# 2. Upload setup script
# (On your local machine)
scp infrastructure/scripts/setup-vps.sh root@your-vps-ip:/root/

# 3. Run setup script on server
ssh root@your-vps-ip
chmod +x /root/setup-vps.sh
/root/setup-vps.sh

# 4. Follow prompts and wait for setup to complete (5-10 minutes)
```

**What the setup script does:**
- Installs Ubuntu updates
- Installs Podman and Podman Compose
- Configures UFW firewall
- Sets up fail2ban (DDoS protection)
- Creates `appuser` for deployments
- Creates systemd service for auto-restart

### Phase 2: Application Deployment

#### 2.1 Clone Repository

```bash
# SSH into server as root
ssh root@your-vps-ip

# Clone the boilerplate with Hello World
git clone https://github.com/yourusername/fullstack-vps-boilerplate.git /opt/app
cd /opt/app

# Change ownership to appuser
chown -R appuser:appuser /opt/app
```

#### 2.2 Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit configuration
nano .env
```

**Key settings for Hetzner deployment:**

```env
# Production environment
NODE_ENV=production

# Database (use strong password)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=generate-with-openssl-rand-base64-32

# JWT Secrets (generate with: openssl rand -base64 64)
JWT_SECRET=long-random-string-minimum-32-chars
JWT_REFRESH_SECRET=another-long-random-string

# URLs - Replace with your domain
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com
VITE_API_URL=https://yourdomain.com/api

# Email (use your SMTP provider)
SMTP_HOST=smtp.provider.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com

# App branding
VITE_APP_NAME=My App

# Optional: Hetzner DNS (if using Hetzner DNS)
# DOMAIN=yourdomain.com
```

**Generate secure secrets:**
```bash
openssl rand -base64 64  # For JWT_SECRET
openssl rand -base64 64  # For JWT_REFRESH_SECRET
```

#### 2.3 Deploy Application

```bash
# Switch to appuser
su - appuser
cd /opt/app

# Run deployment script
./infrastructure/scripts/deploy.sh
```

**What the deployment script does:**
1. Validates `.env` file exists
2. Stops existing containers
3. Pulls latest base images
4. Builds application containers
5. Starts PostgreSQL
6. Waits for database readiness
7. Runs Prisma migrations
8. Starts all services
9. Performs health checks

**Expected output:**
```
=== Full-Stack App Deployment ===
...
Stopping existing containers...
Building application containers...
Starting database...
Waiting for database to be ready...
Database is ready!
Running database migrations...
Starting all services...
Waiting for services to start...
Running health checks...
Backend: OK
Frontend: OK
=== Deployment Complete ===
```

#### 2.4 Verify Deployment

```bash
# Check container status
podman-compose -f infrastructure/podman/compose.yml -f infrastructure/podman/compose.prod.yml ps

# Should show:
# - fullstack-postgres (healthy)
# - fullstack-backend (running)
# - fullstack-frontend (running)
# - fullstack-nginx (running)
```

### Phase 3: SSL/HTTPS Setup

#### 3.1 Configure Nginx and Let's Encrypt

```bash
# Switch to root
sudo su -

# Upload SSL setup script
scp infrastructure/scripts/setup-ssl.sh appuser@your-vps-ip:/tmp/

# Run SSL setup
ssh appuser@your-vps-ip
chmod +x /tmp/setup-ssl.sh
/tmp/setup-ssl.sh

# Follow prompts to:
# 1. Enter your domain
# 2. Enter email for Let's Encrypt
# 3. Accept terms
```

**What the SSL setup does:**
- Installs Certbot
- Obtains Let's Encrypt certificate
- Configures Nginx for HTTPS
- Sets up auto-renewal (runs daily)

#### 3.2 Verify HTTPS

```bash
# Visit your domain in browser
https://yourdomain.com

# You should see:
- [ ] No SSL warnings
- [ ] Green padlock in browser
- [ ] Hello World example visible on homepage
- [ ] Fetch buttons work without CORS errors
```

### Phase 4: Final Verification

#### 4.1 Test Hello World Example

1. Open https://yourdomain.com in browser
2. Scroll down to "Hello World Example" section
3. Click "Fetch Hello Message"
   - [ ] Green response box appears with message
   - [ ] Counter increments to 1
4. Click again
   - [ ] Request completes instantly (React Query cache)
5. Enter your name in "Personalized Greeting"
   - [ ] Custom message appears
   - [ ] Counter increments to 2
6. Click "Increment Counter (Client Only)"
   - [ ] Counter increments to 3
   - [ ] No API call (check Network tab in DevTools)
7. Click "Reset Everything"
   - [ ] All state clears

#### 4.2 Check Logs

```bash
# Backend logs
podman logs fullstack-backend | tail -50

# Frontend logs
podman logs fullstack-frontend | tail -50

# Nginx logs
podman logs fullstack-nginx | tail -50

# Database logs
podman logs fullstack-postgres | tail -50
```

#### 4.3 Run Health Check Script

```bash
# Interactive health check
./infrastructure/scripts/health-check.sh

# Expected output:
# ✓ Backend responding to requests
# ✓ Frontend serving assets
# ✓ Database connection OK
# ✓ SSL certificate valid
```

## Troubleshooting Deployment

### Issue: Database Migration Fails

**Symptoms:**
```
Error: P1001: Can't reach database server
```

**Solution:**
```bash
# Check database container
podman logs fullstack-postgres

# Ensure network exists
podman network ls | grep fullstack

# Recreate if needed
podman-compose -f infrastructure/podman/compose.yml down
podman network rm fullstack-app_internal 2>/dev/null || true
```

### Issue: Backend Cannot Connect to Database

**Symptoms:**
```
error: database does not exist
```

**Solution:**
```bash
# SSH into Postgres container
podman exec -it fullstack-postgres psql -U postgres

# Check databases
\l

# If database doesn't exist:
# (Exit first with \q)

# Re-run migrations
podman-compose -f infrastructure/podman/compose.yml -f infrastructure/podman/compose.prod.yml run --rm backend npx prisma migrate deploy
```

### Issue: Frontend Shows Blank Page

**Symptoms:**
- Page loads but shows nothing
- Browser console shows CORS errors

**Solution:**
1. Check `.env` VITE_API_URL is correct
2. Check ALLOWED_ORIGINS includes your domain
3. Verify backend is responding:
   ```bash
   curl https://yourdomain.com/trpc/hello.getHello
   ```
4. Check Nginx config:
   ```bash
   podman exec fullstack-nginx nginx -t
   ```

### Issue: SSL Certificate Not Valid

**Symptoms:**
- Browser shows "Not Secure"
- SSL errors in console

**Solution:**
```bash
# Check certificate status
curl -vI https://yourdomain.com 2>&1 | grep "Server certificate"

# Force certificate renewal
certbot renew --force-renewal

# Restart Nginx
podman exec fullstack-nginx nginx -s reload
```

### Issue: Out of Disk Space

**Symptoms:**
```
No space left on device
```

**Solution:**
```bash
# Check disk usage
df -h

# Clean up old containers
podman system prune -a

# Clean up images
podman image prune -a

# Backup and remove old database
podman exec fullstack-postgres pg_dump -U postgres fullstack | gzip > ~/backup.sql.gz
```

## Updating Deployment

### Deploy New Changes

```bash
# On your local machine
git push origin master

# On VPS
ssh appuser@your-vps-ip
cd /opt/app
git pull origin master
./infrastructure/scripts/deploy.sh
```

### Rollback Previous Version

```bash
# View commit history
git log --oneline

# Rollback to specific commit
git checkout <commit-hash>

# Redeploy
./infrastructure/scripts/deploy.sh
```

## Backup & Restore

### Automated Backups

```bash
# Setup automated daily backups
chmod +x infrastructure/scripts/backup-db.sh
# Edit crontab on VPS:
# crontab -e
# Add: 0 2 * * * /opt/app/infrastructure/scripts/backup-db.sh
```

### Manual Backup

```bash
# Backup database
podman exec fullstack-postgres pg_dump -U postgres fullstack | gzip > ~/backup-$(date +%Y%m%d).sql.gz

# Backup everything
tar -czf ~/app-backup-$(date +%Y%m%d).tar.gz /opt/app/

# List backups
ls -lh ~/*.sql.gz
```

### Restore from Backup

```bash
# Restore database
gunzip < ~/backup-20240118.sql.gz | podman exec -i fullstack-postgres psql -U postgres -d fullstack

# Verify restoration
podman exec fullstack-postgres psql -U postgres -c "SELECT COUNT(*) FROM users;"
```

## Performance Tuning

### Monitor Resource Usage

```bash
# Real-time monitoring
podman stats

# Expected on CPX11 (2vCPU, 4GB RAM):
# - Memory: 200-400 MB
# - CPU: <10% at idle
```

### Database Query Optimization

```bash
# Check slow queries
podman exec fullstack-postgres psql -U postgres fullstack -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

## Security Checklist

- [ ] SSH key-based authentication only (no password)
- [ ] Fail2ban configured and running
- [ ] UFW firewall allowing only needed ports (80, 443, 22)
- [ ] SSL certificate auto-renewing
- [ ] Database backups automated
- [ ] `.env` not committed to git
- [ ] Strong database password (32+ chars)
- [ ] JWT secrets are random (64+ chars)
- [ ] ALLOWED_ORIGINS set to your domain only
- [ ] Regular system updates scheduled

## Maintenance

### Daily Tasks
- Monitor health check: `./infrastructure/scripts/health-check.sh`
- Check logs: `podman logs fullstack-backend`

### Weekly Tasks
- Review error logs for patterns
- Test backup restoration
- Verify SSL certificate renewal

### Monthly Tasks
- Update system packages: `apt update && apt upgrade`
- Review Hetzner console for issues
- Update application dependencies

## Getting Help

1. Check logs: `podman-compose logs -f`
2. Check [Troubleshooting](./TROUBLESHOOTING.md)
3. Check [Hello World Example](./HELLO_WORLD.md) for local testing
4. SSH to server and debug directly

## Next Steps

After successful deployment:

1. Share your domain with users
2. Monitor performance and logs
3. Set up additional features (email notifications, etc.)
4. Add custom branding
5. Implement your business logic
6. Consider CDN for static assets (Cloudflare)
7. Set up monitoring alerts

## Resources

- [Hetzner VPS Documentation](https://docs.hetzner.com/)
- [Podman Documentation](https://podman.io/docs)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Deployment Guide](./DEPLOYMENT.md) - Full deployment reference
- [Hello World Example](./HELLO_WORLD.md) - E2E example reference
