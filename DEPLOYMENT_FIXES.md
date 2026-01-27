# Deployment Fixes Applied

This document summarizes the fixes applied to make the deployment process more reliable and require minimal manual intervention.

## Issues Identified and Fixed

### 1. Frontend Cannot Reach Backend (CRITICAL)
**File:** `apps/frontend/nginx.conf`

**Problem:**
- Frontend nginx configuration used `http://127.0.0.1:4000` to proxy to backend
- This doesn't work in containerized environments where each service runs in a separate container

**Fix:**
```nginx
# Changed from:
proxy_pass http://127.0.0.1:4000;

# Changed to:
proxy_pass http://backend:4000;
```

**Impact:** Frontend can now successfully proxy API and tRPC requests to the backend container using Docker/Podman DNS.

---

### 2. Missing System Dependencies for Podman Networking
**File:** `infrastructure/scripts/setup-vps.sh`

**Problem:**
- Podman requires `passt` and `aardvark-dns` packages for proper container networking
- Without these, containers cannot:
  - Use custom networks
  - Resolve container names via DNS
  - Communicate between containers

**Fix:**
```bash
# Added to package installation:
apt-get install -y podman podman-compose passt aardvark-dns
```

**Impact:** Containers can now properly communicate using container names (e.g., `backend`, `postgres`).

---

### 3. Environment Variable Quoting
**File:** `.env.example`

**Problem:**
- Values with spaces (e.g., `VITE_APP_NAME=Full-Stack App`) cause shell parsing errors when sourced in scripts
- Error: `Predictions: command not found`

**Fix:**
```bash
# Changed from:
VITE_APP_NAME=Full-Stack App

# Changed to:
VITE_APP_NAME="Full-Stack App"
```

**Impact:** Environment variables with spaces now load correctly in deployment scripts.

---

### 4. Incorrect Health Check Port
**File:** `infrastructure/podman/compose.yml`

**Problem:**
- Frontend health check targeted port 80, but nginx in the container listens on port 8080
- Health checks would always fail

**Fix:**
```yaml
# Changed from:
test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80/"]

# Changed to:
test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/"]
```

**Impact:** Container health checks now work correctly.

---

### 5. Database Schema Deployment Issues
**File:** `infrastructure/scripts/deploy.sh`

**Problem:**
- Script used `npx prisma migrate deploy` but project has no migration files
- This is a fresh deployment using `db push` instead of migrations
- Health checks tried to access `localhost:4000` and `localhost:80` from the host, but containers don't expose these ports

**Fix:**
```bash
# Database sync - changed from prisma migrate deploy to db push:
npx prisma@6 db push

# Health checks - changed from host curl to container exec:
# Before:
curl -sf http://localhost:4000/health

# After:
podman exec fullstack-backend wget -qO- http://localhost:4000/health
```

**Impact:**
- Database schema syncs correctly on first deployment
- Health checks work even when ports aren't exposed to host

---

## Additional Improvements

### Enhanced .env.example Documentation
**File:** `.env.example`

**Changes:**
- Added production-specific guidance in comments
- Provided examples for SMTP configuration (Resend, SendGrid)
- Clarified when to use quotes for values
- Added security best practices for generating secrets
- Documented the difference between development and production VITE_API_URL

---

## Deployment Workflow Now

### First-Time VPS Setup
```bash
# 1. Run setup script (as root)
ssh root@your-vps
./infrastructure/scripts/setup-vps.sh

# 2. Upload application
rsync -avz --exclude 'node_modules' --exclude '.git' ./ appuser@your-vps:/opt/fullstack-app/

# 3. Configure environment
ssh appuser@your-vps
cd /opt/fullstack-app
cp .env.example .env
# Edit .env with production values (see comments in file)

# 4. Deploy
./infrastructure/scripts/deploy.sh
```

### Updates/Redeployments
```bash
# Just run the deploy script
ssh appuser@your-vps
cd /opt/fullstack-app
./infrastructure/scripts/deploy.sh
```

---

## Testing the Deployment

After deployment, verify all services are working:

```bash
# Check container status
podman ps

# Expected output:
# NAMES       STATUS          PORTS
# frontend    Up X minutes    0.0.0.0:8080->8080/tcp
# backend     Up X minutes    4000/tcp
# postgres    Up X minutes    5432/tcp

# Test frontend
curl http://localhost:8080

# Test backend health (from inside container)
podman exec backend wget -qO- http://localhost:4000/health

# Test database connection
podman exec postgres psql -U postgres -d fullstack -c '\dt'
```

---

## Common Issues and Solutions

### Issue: "Could not find pasta" error
**Solution:** Install passt package: `apt install -y passt`

### Issue: "aardvark-dns binary not found" warning
**Solution:** Install aardvark-dns package: `apt install -y aardvark-dns`

### Issue: "Predictions: command not found" when running deploy.sh
**Solution:** Quote values with spaces in .env file: `VITE_APP_NAME="My App Name"`

### Issue: Frontend shows but API calls fail
**Solution:** Check that frontend nginx.conf uses `http://backend:4000` not `http://127.0.0.1:4000`

### Issue: Backend can't connect to database
**Solution:** Ensure postgres password in .env matches between POSTGRES_PASSWORD and DATABASE_URL

---

## Port Configuration Summary

### Development
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Database: localhost:5432

### Production (Container-to-Container)
- Frontend container: nginx on port 8080
- Backend container: node on port 4000
- Postgres container: postgres on port 5432

### Production (External Access)
- Frontend: http://your-server-ip:8080 (or port 80 via reverse proxy)
- Backend: Not directly exposed (accessed through frontend nginx proxy)
- Database: Not exposed (only accessible within container network)

---

## Security Notes

1. **Never expose the database port** to the internet - keep it internal to the container network
2. **Use strong, randomly generated secrets** for JWT and database passwords
3. **Keep firewall enabled** - only allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS), and optionally 8080 for testing
4. **Set up SSL/HTTPS** before going live (see docs/DEPLOYMENT.md)
5. **Don't commit .env files** to git - they contain secrets

---

## Next Steps

After applying these fixes, you can:
1. Set up domain name and SSL certificates
2. Configure email service (Resend, SendGrid, etc.)
3. Set up automated backups
4. Configure monitoring and logging
5. Set up CI/CD pipeline

See the main deployment documentation for detailed guides on each of these topics.
