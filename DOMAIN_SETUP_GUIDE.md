# Domain Setup Guide for elonpredictions.com

## Overview
This guide will help you set up elonpredictions.com on your VPS at 95.217.1.206.

## Prerequisites Checklist
- [ ] DNS A records configured (see Step 1)
- [ ] SSH access to appuser@95.217.1.206
- [ ] Email service account (Resend recommended - free tier)

## Step 1: Configure DNS

Go to your domain registrar's DNS settings and add:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 95.217.1.206 | 3600 |
| A | www | 95.217.1.206 | 3600 |

**Wait 5-30 minutes for DNS propagation before proceeding.**

Verify DNS is working:
```bash
dig +short elonpredictions.com
# Should return: 95.217.1.206
```

## Step 2: Upload Application to Server

From your local machine in this directory:

```bash
# Make setup script executable
chmod +x setup-domain.sh

# Upload application to server
rsync -avz --exclude 'node_modules' --exclude '.git' \
  ./ appuser@95.217.1.206:/opt/fullstack-app/
```

## Step 3: Configure Environment on Server

SSH into your server:
```bash
ssh appuser@95.217.1.206
cd /opt/fullstack-app
```

Run the setup script:
```bash
./setup-domain.sh
```

This will create a `.env` file with secure random secrets.

## Step 4: Configure Email Service

### Option A: Resend (Recommended - Free)

1. Sign up at https://resend.com
2. Verify your domain (add DNS records they provide)
3. Create an API key
4. Update `.env` file:

```bash
nano .env
# Update: SMTP_PASSWORD=re_your_api_key_here
```

### Option B: Other SMTP Provider

Update these values in `.env`:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `EMAIL_FROM`

## Step 5: Setup SSL Certificate

Still on the server:

```bash
./infrastructure/scripts/setup-ssl.sh elonpredictions.com admin@elonpredictions.com
```

This will:
- Configure nginx for your domain
- Request Let's Encrypt SSL certificate
- Set up automatic renewal

## Step 6: Deploy Application

```bash
./infrastructure/scripts/deploy.sh
```

This will:
- Build Docker containers
- Run database migrations
- Seed the admin user
- Start all services

## Step 7: Verify Deployment

Check service health:
```bash
./infrastructure/scripts/health-check.sh
```

View container status:
```bash
podman-compose -f infrastructure/podman/compose.yml \
  -f infrastructure/podman/compose.prod.yml ps
```

View logs if needed:
```bash
podman logs fullstack-backend
podman logs fullstack-frontend
podman logs fullstack-nginx
```

## Step 8: Access Your Application

1. Open https://elonpredictions.com in your browser
2. Request a magic link for `admin@elonpredictions.com`
3. Check your email (or server logs if email isn't working yet)
4. Log in and access admin dashboard at `/admin`

## Troubleshooting

### DNS not resolving
```bash
# Check DNS propagation
dig +short elonpredictions.com
nslookup elonpredictions.com
```

### SSL certificate fails
- Verify DNS is resolving correctly
- Ensure port 80 is open: `sudo ufw status`
- Check nginx logs: `podman logs fullstack-nginx`

### Can't receive emails
```bash
# Check backend logs for email errors
podman logs fullstack-backend | grep -i email

# Test SMTP connection manually
telnet smtp.resend.com 587
```

### Services won't start
```bash
# Check all container logs
podman-compose -f infrastructure/podman/compose.yml \
  -f infrastructure/podman/compose.prod.yml logs

# Restart services
sudo systemctl restart fullstack-app
```

## Maintenance

### View logs
```bash
# All services
podman-compose logs -f

# Specific service
podman logs -f fullstack-backend
```

### Restart services
```bash
sudo systemctl restart fullstack-app
```

### Update application
```bash
# From local machine
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.env' \
  ./ appuser@95.217.1.206:/opt/fullstack-app/

# On server
ssh appuser@95.217.1.206
cd /opt/fullstack-app
./infrastructure/scripts/deploy.sh
```

## Next Steps

After successful deployment:
- [ ] Test authentication flow
- [ ] Configure GitHub Actions for CI/CD (see docs/DEPLOYMENT.md)
- [ ] Set up database backups
- [ ] Configure monitoring

## Support

- Documentation: See `/docs` directory
- Issues: Check `docs/TROUBLESHOOTING.md`
- Logs: `podman logs <container-name>`
