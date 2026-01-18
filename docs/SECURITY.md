# Security Guide

This document covers security best practices implemented in this boilerplate.

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Layer 1: Network                          │
│         - Firewall (UFW)                                     │
│         - SSL/TLS (Let's Encrypt)                           │
│         - DDoS Protection                                    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Layer 2: Nginx                            │
│         - Rate Limiting                                      │
│         - Security Headers                                   │
│         - Request Filtering                                  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Layer 3: Application                      │
│         - Helmet (Express)                                   │
│         - CORS Whitelist                                     │
│         - Input Validation (Zod)                            │
│         - Authentication (JWT)                               │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Layer 4: Database                         │
│         - Parameterized Queries (Prisma)                    │
│         - Encrypted Connections                              │
│         - Access Control                                     │
└─────────────────────────────────────────────────────────────┘
```

## Authentication Security

### Magic Link Tokens

| Property | Value | Reason |
|----------|-------|--------|
| Length | 64 bytes (hex) | High entropy |
| Expiration | 5 minutes | Minimize window |
| Usage | Single use | Prevent replay |
| Storage | Database | Revocable |

```typescript
// Generation
const token = crypto.randomBytes(32).toString('hex')

// Verification
const magicLink = await prisma.magicLink.findUnique({
  where: { token }
})

if (!magicLink || magicLink.usedAt || magicLink.expiresAt < new Date()) {
  throw new Error('Invalid token')
}

// Mark as used immediately
await prisma.magicLink.update({
  where: { id: magicLink.id },
  data: { usedAt: new Date() }
})
```

### JWT Tokens

| Token | Expiration | Storage | Purpose |
|-------|------------|---------|---------|
| Access | 15 min | Memory | API auth |
| Refresh | 7 days | HTTP-only cookie | Get new access |

```typescript
// Access token - short lived
const accessToken = jwt.sign(
  { userId, type: 'access' },
  JWT_SECRET,
  { expiresIn: '15m' }
)

// Refresh token - longer lived, stored securely
const refreshToken = jwt.sign(
  { userId, type: 'refresh' },
  JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
)
```

### Session Management

- Sessions stored in database for revocation
- Refresh token rotation on use
- All sessions invalidated on password change

## HTTP Security Headers

Configured via Helmet and Nginx:

```nginx
# Prevent clickjacking
add_header X-Frame-Options "SAMEORIGIN";

# Prevent MIME sniffing
add_header X-Content-Type-Options "nosniff";

# XSS Protection
add_header X-XSS-Protection "1; mode=block";

# HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

# CSP
add_header Content-Security-Policy "default-src 'self'; ...";

# Referrer Policy
add_header Referrer-Policy "strict-origin-when-cross-origin";
```

## Rate Limiting

### Nginx Level

```nginx
# API endpoints: 10 req/s
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# Auth endpoints: 1 req/s
limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;
```

### Application Level

```typescript
// General API
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests'
}))

// Auth endpoints (stricter)
app.use('/api/trpc/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts'
}))
```

## Input Validation

All inputs validated with Zod:

```typescript
const userSchema = z.object({
  email: z.string()
    .email()
    .max(255)
    .toLowerCase()
    .trim(),
  role: z.enum(['USER', 'ADMIN']),
})

// In router
.input(userSchema)
.mutation(({ input }) => {
  // input is validated and typed
})
```

## SQL Injection Prevention

Prisma uses parameterized queries:

```typescript
// Safe - parameterized
const user = await prisma.user.findUnique({
  where: { email: userInput }
})

// Never do this
const user = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userInput}
`
```

## XSS Prevention

1. **React escapes by default**
2. **CSP headers** limit script sources
3. **HTTP-only cookies** prevent JS access

```typescript
// Safe - React escapes
<div>{userContent}</div>

// Dangerous - only if absolutely necessary
<div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
```

## CORS Configuration

```typescript
app.use(cors({
  // Explicit whitelist, no wildcards
  origin: ['https://yourdomain.com', 'https://www.yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
```

## Secrets Management

### Generation

```bash
# JWT secrets (64 bytes = 512 bits)
openssl rand -base64 64

# Database passwords
openssl rand -base64 32
```

### Storage

| Environment | Method |
|-------------|--------|
| Development | `.env` files (gitignored) |
| CI/CD | GitHub Secrets |
| Production | Environment files (`chmod 600`) |

### Never

- Commit secrets to git
- Log secrets
- Expose in error messages
- Use weak secrets

## Container Security

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
# ... build steps

FROM node:20-alpine AS runner
# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

# Copy only necessary files
COPY --from=builder /app/dist ./dist

# Run as non-root
USER appuser

# No secrets in image
# Use environment variables at runtime
```

## Network Security

### Firewall (UFW)

```bash
# Default deny
ufw default deny incoming
ufw default allow outgoing

# Allow only necessary ports
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP (redirects to HTTPS)
ufw allow 443/tcp  # HTTPS

ufw enable
```

### fail2ban

```ini
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
```

## Security Checklist

### Before Deployment

- [ ] Generate strong secrets (`openssl rand -base64 64`)
- [ ] Configure CORS whitelist (no wildcards)
- [ ] Set up SSL certificates
- [ ] Enable firewall
- [ ] Configure fail2ban
- [ ] Review environment variables
- [ ] Remove debug endpoints

### Regular Maintenance

- [ ] Update dependencies (`pnpm update`)
- [ ] Review access logs
- [ ] Rotate secrets periodically
- [ ] Backup database
- [ ] Monitor for vulnerabilities

### Security Headers Check

Test your headers at:
- https://securityheaders.com
- https://observatory.mozilla.org

## Vulnerability Response

If you discover a security vulnerability:

1. **Do not** open a public issue
2. Email security@yourdomain.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Common Vulnerabilities Prevented

| Vulnerability | Prevention |
|---------------|------------|
| SQL Injection | Prisma parameterized queries |
| XSS | React escaping, CSP headers |
| CSRF | SameSite cookies, CORS |
| Clickjacking | X-Frame-Options header |
| Session Hijacking | HTTP-only cookies, short tokens |
| Brute Force | Rate limiting |
| Man-in-the-Middle | TLS, HSTS |

## Further Reading

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [Prisma Security](https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access#sql-injection)
