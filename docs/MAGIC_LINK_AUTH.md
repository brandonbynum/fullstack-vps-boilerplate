# Magic Link Authentication

This document explains the passwordless authentication system using magic email links.

## Overview

Instead of passwords, users authenticate via email:
1. User enters their email
2. System sends a one-time link
3. User clicks the link
4. User is authenticated

## Why Magic Links?

### Benefits
- **No password management** - Users don't need to remember passwords
- **No password breaches** - No passwords to steal
- **Simpler UX** - Just enter email, click link
- **Email verification built-in** - Users must have access to their email

### Trade-offs
- Requires email access for every login
- Slower than cached password managers
- Email delivery can be delayed

## Authentication Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    MAGIC LINK AUTH FLOW                       │
└──────────────────────────────────────────────────────────────┘

1. REQUEST MAGIC LINK
   ┌─────────┐          ┌─────────┐          ┌─────────┐
   │ Browser │  ───►    │ Backend │  ───►    │ Database│
   └─────────┘ email    └─────────┘ create   └─────────┘
                                    token

2. SEND EMAIL
   ┌─────────┐          ┌─────────┐
   │ Backend │  ───►    │  Email  │  ───►  User's Inbox
   └─────────┘ send     │ Service │
               link     └─────────┘

3. USER CLICKS LINK
   ┌─────────┐          ┌─────────┐
   │  Email  │  ───►    │ Browser │  /auth/verify?token=xxx
   └─────────┘ click    └─────────┘

4. VERIFY & CREATE SESSION
   ┌─────────┐          ┌─────────┐          ┌─────────┐
   │ Browser │  ───►    │ Backend │  ───►    │ Database│
   └─────────┘ token    └─────────┘ validate └─────────┘
       ◄────────────────           │ create session
        JWT tokens                 │ invalidate token
```

## Token Lifecycle

### Magic Link Token
- **Purpose:** One-time login verification
- **Expiration:** 5 minutes (configurable)
- **Usage:** Single use only
- **Storage:** Database

### Access Token (JWT)
- **Purpose:** API authentication
- **Expiration:** 15 minutes
- **Usage:** Multiple requests
- **Storage:** Client memory (not localStorage)

### Refresh Token (JWT)
- **Purpose:** Get new access tokens
- **Expiration:** 7 days
- **Usage:** When access token expires
- **Storage:** HTTP-only cookie (production)

## Implementation Details

### Backend: Token Service

```typescript
// apps/backend/src/services/token.service.ts

// Generate magic link token
function generateMagicLinkToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Generate JWT tokens
function generateTokens(userId: string) {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    JWT_SECRET,
    { expiresIn: '15m' }
  )
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  )
  return { accessToken, refreshToken }
}
```

### Backend: Auth Router

```typescript
// apps/backend/src/trpc/routers/auth.router.ts

requestMagicLink: publicProcedure
  .input(requestMagicLinkSchema)
  .mutation(async ({ input }) => {
    const { email } = input

    // Create or get user
    const user = await prisma.user.upsert({
      where: { email },
      create: { email },
      update: {}
    })

    // Generate token
    const token = generateMagicLinkToken()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    // Store in database
    await prisma.magicLink.create({
      data: { token, email, expiresAt, userId: user.id }
    })

    // Send email
    await sendMagicLinkEmail(email, token)

    return { success: true }
  })
```

### Frontend: Auth Hook

```typescript
// apps/frontend/src/hooks/useAuth.ts

function useAuth() {
  const [accessToken, setAccessToken] = useState<string | null>(null)

  const requestMagicLink = trpc.auth.requestMagicLink.useMutation()
  const verifyMagicLink = trpc.auth.verifyMagicLink.useMutation({
    onSuccess: (data) => {
      setAccessToken(data.accessToken)
      // Store refresh token in httpOnly cookie (handled by backend)
    }
  })

  return {
    requestMagicLink: requestMagicLink.mutate,
    verifyMagicLink: verifyMagicLink.mutate,
    isAuthenticated: !!accessToken
  }
}
```

## Security Considerations

### Token Security
- ✅ Magic links expire in 5 minutes
- ✅ Tokens are single-use (invalidated after verification)
- ✅ Tokens use cryptographically secure random bytes
- ✅ Access tokens are short-lived (15 minutes)

### Email Security
- ✅ Rate limiting on magic link requests (5/15min)
- ✅ Link only sent to the requested email
- ✅ No user enumeration (same response for all emails)

### Session Security
- ✅ Refresh token rotation on use
- ✅ Sessions stored in database for revocation
- ✅ HTTP-only cookies in production

## Configuration

Environment variables:

```bash
# Token expiration
JWT_EXPIRES_IN=15m          # Access token lifetime
JWT_REFRESH_EXPIRES_IN=7d   # Refresh token lifetime
MAGIC_LINK_EXPIRES_IN=5m    # Magic link validity

# Secrets (generate with: openssl rand -base64 64)
JWT_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
```

## Testing Authentication

### Development Mode

In development, magic link URLs are logged to the console:

```
Magic link for user@example.com:
http://localhost:3000/auth/verify?token=abc123...
```

### Production

Ensure email service is configured:

```bash
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=re_xxx
EMAIL_FROM=noreply@yourdomain.com
```

## Email Templates

The magic link email template:

```html
<h1>Login to Your App</h1>
<p>Click the button below to login:</p>
<a href="${FRONTEND_URL}/auth/verify?token=${token}">
  Login
</a>
<p>This link expires in 5 minutes.</p>
<p>If you didn't request this, ignore this email.</p>
```

## Troubleshooting

### "Magic link expired"
- Link was clicked after 5 minutes
- Solution: Request a new magic link

### "Invalid magic link"
- Link was already used
- Token doesn't exist
- Solution: Request a new magic link

### Email not received
- Check spam folder
- Verify SMTP configuration
- Check email service logs
- Rate limit may have been hit

### Session expired
- Access token expired (every 15 minutes)
- Refresh token should automatically get new access token
- If refresh also expired (7 days), user must login again
