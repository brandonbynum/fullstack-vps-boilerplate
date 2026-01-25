# Quick Reference Guide

Essential commands for managing your deployed application.

## Initial Deployment

```bash
# 1. Setup VPS (run once)
scp infrastructure/scripts/setup-vps.sh root@YOUR_VPS_IP:/root/
ssh root@YOUR_VPS_IP "./setup-vps.sh"

# 2. Upload code
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.env' \
  ./ appuser@YOUR_VPS_IP:/opt/fullstack-app/

# 3. Setup SSL (run once)
ssh appuser@YOUR_VPS_IP
cd /opt/fullstack-app
./infrastructure/scripts/setup-ssl.sh yourdomain.com admin@yourdomain.com

# 4. Deploy
./infrastructure/scripts/deploy.sh
```

## Daily Operations

### Check Application Health
```bash
ssh appuser@YOUR_VPS_IP
cd /opt/fullstack-app
./infrastructure/scripts/health-check.sh
```

### View Logs
```bash
# Backend logs
podman logs fullstack-backend --tail 100 -f

# Frontend logs
podman logs fullstack-frontend --tail 100 -f

# Nginx logs
podman logs fullstack-nginx --tail 100 -f

# All logs
podman-compose -f infrastructure/podman/compose.yml \
  -f infrastructure/podman/compose.prod.yml logs -f
```

### Restart Services
```bash
# Restart everything
sudo systemctl restart fullstack-app

# Restart individual container
podman restart fullstack-backend
podman restart fullstack-frontend
podman restart fullstack-nginx
```

### Stop/Start Application
```bash
# Stop
sudo systemctl stop fullstack-app

# Start
sudo systemctl start fullstack-app

# Status
sudo systemctl status fullstack-app
```

## Updating Application

### Deploy Code Changes
```bash
# 1. From local machine - sync code
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.env' \
  ./ appuser@YOUR_VPS_IP:/opt/fullstack-app/

# 2. On VPS - redeploy
ssh appuser@YOUR_VPS_IP
cd /opt/fullstack-app
./infrastructure/scripts/deploy.sh
```

### Update Environment Variables
```bash
ssh appuser@YOUR_VPS_IP
cd /opt/fullstack-app

# Edit .env
vim .env

# Restart to apply changes
sudo systemctl restart fullstack-app
```

## Database Operations

### Manual Backup
```bash
ssh appuser@YOUR_VPS_IP
cd /opt/fullstack-app
./infrastructure/scripts/backup-db.sh
```

### List Backups
```bash
ssh appuser@YOUR_VPS_IP
ls -lah /opt/fullstack-app/backups/
```

### Restore from Backup
```bash
ssh appuser@YOUR_VPS_IP
cd /opt/fullstack-app

gunzip -c backups/backup_YYYYMMDD_HHMMSS.sql.gz | \
  podman exec -i fullstack-postgres psql -U postgres -d fullstack
```

### Database Console
```bash
# Access PostgreSQL
podman exec -it fullstack-postgres psql -U postgres -d fullstack

# Common queries
\dt                    # List tables
\d users              # Describe users table
SELECT * FROM users;  # Query users
\q                    # Quit
```

### Run Migrations
```bash
ssh appuser@YOUR_VPS_IP
cd /opt/fullstack-app

# Via temporary container
podman run --rm \
  --network fullstack-app_internal \
  -e DATABASE_URL="postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/fullstack?schema=public" \
  -v "$PWD/apps/backend:/app:Z" \
  -w /app \
  node:20-alpine \
  sh -c "npm install -g pnpm && pnpm install && npx prisma migrate deploy"
```

## Container Management

### List Containers
```bash
podman ps
podman ps -a  # Include stopped containers
```

### Container Stats (Resource Usage)
```bash
podman stats
```

### Stop All Containers
```bash
cd /opt/fullstack-app
podman-compose -f infrastructure/podman/compose.yml \
  -f infrastructure/podman/compose.prod.yml down
```

### Start All Containers
```bash
cd /opt/fullstack-app
podman-compose -f infrastructure/podman/compose.yml \
  -f infrastructure/podman/compose.prod.yml up -d
```

### Rebuild Specific Container
```bash
cd /opt/fullstack-app

# Rebuild backend
podman-compose -f infrastructure/podman/compose.yml \
  -f infrastructure/podman/compose.prod.yml build backend --no-cache

# Rebuild frontend
podman-compose -f infrastructure/podman/compose.yml \
  -f infrastructure/podman/compose.prod.yml build frontend --no-cache
```

### Clean Up
```bash
# Remove unused images
podman image prune -f

# Remove unused volumes (BE CAREFUL - will delete data!)
podman volume prune -f

# Remove unused containers
podman container prune -f
```

## SSL Certificate Management

### Check Certificate Expiration
```bash
podman run --rm \
  -v certbot_data:/etc/letsencrypt \
  certbot/certbot certificates
```

### Renew Certificate (Manual)
```bash
podman run --rm \
  -v certbot_data:/etc/letsencrypt \
  -v certbot_webroot:/var/www/certbot \
  certbot/certbot renew
```

### Test Certificate Renewal
```bash
podman run --rm \
  -v certbot_data:/etc/letsencrypt \
  -v certbot_webroot:/var/www/certbot \
  certbot/certbot renew --dry-run
```

## System Monitoring

### Check Disk Space
```bash
df -h
du -sh /opt/fullstack-app/*
```

### Check Memory Usage
```bash
free -h
```

### Check CPU Usage
```bash
htop
# or
top
```

### System Logs
```bash
# Application service logs
journalctl -u fullstack-app -n 100 -f

# System logs
journalctl -n 100 -f
```

## Firewall Management

### Check Firewall Status
```bash
sudo ufw status verbose
```

### Allow New Port
```bash
sudo ufw allow 8080/tcp comment 'Custom service'
```

### Remove Rule
```bash
sudo ufw status numbered
sudo ufw delete [number]
```

## Security

### Check fail2ban Status
```bash
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

### Unban IP
```bash
sudo fail2ban-client set sshd unbanip 123.45.67.89
```

### Update System
```bash
sudo apt update
sudo apt upgrade -y
sudo reboot  # If kernel updated
```

## Troubleshooting

### Check if Services are Running
```bash
# Systemd service
sudo systemctl status fullstack-app

# All containers
podman ps

# Specific container
podman ps | grep backend
```

### View Full Container Logs
```bash
# Last 100 lines
podman logs fullstack-backend --tail 100

# Follow logs (Ctrl+C to exit)
podman logs -f fullstack-backend

# Since specific time
podman logs --since 10m fullstack-backend
```

### Test API Endpoints
```bash
# Health check
curl http://localhost/health

# Backend health
curl http://localhost:4000/health

# From outside
curl https://yourdomain.com/health
curl https://yourdomain.com/api/health
```

### Restart Individual Service
```bash
# Just nginx
podman restart fullstack-nginx

# Just backend
podman restart fullstack-backend

# Just database
podman restart fullstack-postgres
```

### Emergency Restart
```bash
# Stop everything
sudo systemctl stop fullstack-app

# Wait a moment
sleep 5

# Start everything
sudo systemctl start fullstack-app

# Check status
sudo systemctl status fullstack-app
podman ps
```

## DNS & Network

### Check DNS
```bash
dig yourdomain.com +short
dig www.yourdomain.com +short
```

### Test Port Connectivity
```bash
# From VPS
nc -zv localhost 80
nc -zv localhost 443
nc -zv localhost 4000

# From outside (local machine)
nc -zv YOUR_VPS_IP 80
nc -zv YOUR_VPS_IP 443
```

### Check Network Connectivity
```bash
# Ping test
ping -c 4 google.com

# DNS resolution
nslookup yourdomain.com
```

## Useful Aliases

Add these to `~/.bashrc` for convenience:

```bash
# Add to ~/.bashrc
alias app='cd /opt/fullstack-app'
alias logs-backend='podman logs -f fullstack-backend'
alias logs-frontend='podman logs -f fullstack-frontend'
alias logs-nginx='podman logs -f fullstack-nginx'
alias health='cd /opt/fullstack-app && ./infrastructure/scripts/health-check.sh'
alias backup='cd /opt/fullstack-app && ./infrastructure/scripts/backup-db.sh'
alias deploy='cd /opt/fullstack-app && ./infrastructure/scripts/deploy.sh'
alias containers='podman ps'
alias restart-app='sudo systemctl restart fullstack-app'

# Reload bashrc
source ~/.bashrc
```

## Emergency Contacts

### Get VPS IP
```bash
curl ifconfig.me
# or
ip addr show | grep "inet " | grep -v 127.0.0.1
```

### Get Container IPs
```bash
podman inspect fullstack-backend | grep IPAddress
podman inspect fullstack-frontend | grep IPAddress
podman inspect fullstack-postgres | grep IPAddress
```

## Performance Optimization

### Analyze Container Resource Usage
```bash
podman stats --no-stream
```

### Check Database Performance
```bash
podman exec fullstack-postgres psql -U postgres -d fullstack \
  -c "SELECT * FROM pg_stat_activity;"
```

### Clear Logs
```bash
# Truncate podman logs
podman logs fullstack-backend 2>&1 | tail -n 1000 > /tmp/backend.log
# (Logs are automatically rotated, but you can truncate manually if needed)
```

---

## Common Issues & Quick Fixes

### 502 Bad Gateway
```bash
# Backend likely down
podman restart fullstack-backend
podman logs fullstack-backend
```

### SSL Certificate Error
```bash
# Check certificates
podman run --rm -v certbot_data:/etc/letsencrypt certbot/certbot certificates

# Renew if needed
podman run --rm -v certbot_data:/etc/letsencrypt -v certbot_webroot:/var/www/certbot \
  certbot/certbot renew --force-renewal
```

### Database Connection Error
```bash
# Check database is running
podman ps | grep postgres

# Check database health
podman exec fullstack-postgres pg_isready -U postgres

# Restart database
podman restart fullstack-postgres
```

### Out of Disk Space
```bash
# Check space
df -h

# Clean up Docker/Podman
podman system prune -af --volumes

# Remove old backups
find /opt/fullstack-app/backups -mtime +30 -delete
```

---

**Quick Help:**
- Health Check: `./infrastructure/scripts/health-check.sh`
- Deploy: `./infrastructure/scripts/deploy.sh`
- Backup: `./infrastructure/scripts/backup-db.sh`
- Logs: `podman logs -f fullstack-backend`
- Restart: `sudo systemctl restart fullstack-app`
