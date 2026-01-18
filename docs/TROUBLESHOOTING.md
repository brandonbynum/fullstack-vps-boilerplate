# Troubleshooting Guide

Solutions to common issues you might encounter.

## Development Issues

### Database Connection Failed

**Error:**
```
Error: Can't reach database server at `localhost:5432`
```

**Solutions:**

1. Check if PostgreSQL is running:
```bash
podman ps | grep postgres
# or
docker ps | grep postgres
```

2. Start the database:
```bash
podman start fullstack-postgres
# or
./scripts/setup-dev.sh
```

3. Verify connection string in `.env`:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fullstack?schema=public
```

---

### Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**

1. Find the process:
```bash
lsof -i :3000
```

2. Kill the process:
```bash
kill -9 <PID>
```

3. Or use a different port in `.env`:
```bash
PORT=4001
```

---

### Prisma Client Not Generated

**Error:**
```
Error: @prisma/client did not initialize yet
```

**Solution:**
```bash
pnpm --filter backend prisma:generate
```

---

### Module Not Found

**Error:**
```
Cannot find module '@fullstack/validators'
```

**Solutions:**

1. Build the validators package:
```bash
pnpm --filter validators build
```

2. Reinstall dependencies:
```bash
pnpm install
```

---

### TypeScript Errors After Schema Change

**Error:**
```
Property 'newField' does not exist on type 'User'
```

**Solution:**
```bash
# Regenerate Prisma client
pnpm --filter backend prisma:generate

# Rebuild validators
pnpm --filter validators build

# Restart TypeScript server in your IDE
```

---

## Authentication Issues

### Magic Link Not Received

**Possible causes:**
1. Email in spam folder
2. SMTP not configured
3. Rate limit exceeded

**Solutions:**

1. Check console in development mode (link is logged)
2. Verify SMTP configuration:
```bash
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=re_xxxxx
```
3. Wait 15 minutes if rate limited

---

### Magic Link Expired

**Error:**
```
Magic link has expired
```

**Solution:**
Request a new magic link. Links expire after 5 minutes.

---

### JWT Verification Failed

**Error:**
```
UNAUTHORIZED: Invalid token
```

**Possible causes:**
1. Token expired (access tokens last 15 minutes)
2. Wrong JWT secret
3. Token malformed

**Solutions:**

1. Refresh the token (automatic in frontend)
2. Verify JWT_SECRET matches in all environments
3. Log out and log in again

---

### Session Not Persisting

**Possible causes:**
1. Cookies not set correctly
2. CORS issues
3. Token not stored

**Solutions:**

1. Check browser developer tools → Application → Cookies
2. Verify CORS configuration:
```bash
ALLOWED_ORIGINS=http://localhost:3000
```
3. Check localStorage/sessionStorage in browser

---

## Deployment Issues

### Container Build Failed

**Error:**
```
Error: failed to build image
```

**Solutions:**

1. Check Containerfile syntax
2. Ensure all dependencies are listed:
```bash
podman build --no-cache -f apps/backend/Containerfile .
```

3. View detailed logs:
```bash
podman build --progress=plain -f apps/backend/Containerfile .
```

---

### Container Won't Start

**Check logs:**
```bash
podman logs fullstack-backend
```

**Common issues:**
- Missing environment variables
- Database not ready
- Port already in use

---

### Database Migration Failed

**Error:**
```
Migration failed: relation "User" already exists
```

**Solutions:**

1. Reset database (development only):
```bash
pnpm --filter backend prisma:reset
```

2. For production, check migration status:
```bash
npx prisma migrate status
```

---

### SSL Certificate Error

**Error:**
```
SSL certificate problem: unable to get local issuer certificate
```

**Solutions:**

1. Verify domain DNS is pointing to VPS
2. Re-run SSL setup:
```bash
./infrastructure/scripts/setup-ssl.sh yourdomain.com
```

3. Check certbot logs:
```bash
podman logs fullstack-certbot
```

---

### Nginx 502 Bad Gateway

**Possible causes:**
1. Backend container not running
2. Wrong upstream configuration

**Solutions:**

1. Check backend status:
```bash
podman ps | grep backend
podman logs fullstack-backend
```

2. Verify nginx configuration:
```bash
podman exec fullstack-nginx nginx -t
```

---

## Performance Issues

### Slow API Responses

**Possible causes:**
1. N+1 queries
2. Missing database indexes
3. Large payloads

**Solutions:**

1. Use Prisma's `include` wisely:
```typescript
// Bad: N+1
const users = await prisma.user.findMany()
for (const user of users) {
  await prisma.post.findMany({ where: { authorId: user.id } })
}

// Good: Single query
const users = await prisma.user.findMany({
  include: { posts: true }
})
```

2. Add indexes in schema:
```prisma
model User {
  email String @unique
  @@index([createdAt])
}
```

---

### High Memory Usage

**Solutions:**

1. Check for memory leaks in logs
2. Limit container resources in compose:
```yaml
deploy:
  resources:
    limits:
      memory: 512M
```

3. Increase VPS RAM if needed

---

## Build Issues

### Turborepo Cache Issues

**Solution:**
```bash
# Clear Turborepo cache
pnpm turbo clean

# Rebuild all
pnpm build
```

---

### Vite Build Failed

**Error:**
```
[vite] Internal server error: Failed to resolve import
```

**Solutions:**

1. Check import paths (use `@/` alias)
2. Rebuild dependencies:
```bash
rm -rf node_modules
pnpm install
```

---

## Getting Help

If you can't resolve an issue:

1. **Check logs:**
```bash
# Backend logs
podman logs fullstack-backend

# Frontend logs
podman logs fullstack-frontend

# Database logs
podman logs fullstack-postgres
```

2. **Search issues:**
   - [GitHub Issues](https://github.com/yourusername/fullstack-boilerplate/issues)

3. **Ask for help:**
   - Open a new GitHub issue with:
     - Error message
     - Steps to reproduce
     - Environment details (OS, Node version, etc.)
