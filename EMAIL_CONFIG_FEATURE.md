# Email Configuration Status Feature

This document describes the email configuration check feature that provides visual feedback to developers when email service is not configured.

## Overview

The application now checks whether email is properly configured and displays appropriate messages to users based on the environment. This prevents confusion when developers try to use magic link authentication without setting up SMTP credentials.

## How It Works

### No Emails Sent

**Important:** This feature does NOT send any emails. It only checks if the configuration is valid by:
1. Verifying SMTP environment variables are set
2. Ensuring values are not placeholder/example values
3. Returning status via API endpoint

### Backend Implementation

#### 1. Email Service Check (`apps/backend/src/services/email.service.ts`)

Added two new methods:

```typescript
// Check if email is configured (no network calls)
isEmailConfigured(): boolean

// Get email status with environment-appropriate message
getEmailStatus(): { isConfigured: boolean; message?: string }
```

**Configuration Validation:**
- Checks `SMTP_HOST` is not `smtp.example.com` or contains "example"
- Checks `SMTP_USER` is not `noreply@example.com` or contains "example"
- Checks `SMTP_PASSWORD` is not `placeholder` or `placeholder-smtp-password`

#### 2. New tRPC Endpoint (`apps/backend/src/trpc/routers/auth.router.ts`)

```typescript
// Public endpoint - no authentication required
getEmailStatus: publicProcedure.query(() => {
  return emailService.getEmailStatus();
})
```

Returns:
```typescript
{
  isConfigured: boolean;
  message?: string; // Only present if not configured
}
```

### Frontend Implementation

#### 1. Alert Component (`apps/frontend/src/components/ui/alert.tsx`)

Created a new shadcn/ui-style Alert component with variants:
- `default` - Standard appearance
- `destructive` - For errors
- `warning` - For warnings (used for email config)

#### 2. LoginForm Updates (`apps/frontend/src/components/auth/LoginForm.tsx`)

**Queries email status:**
```typescript
const { data: emailStatus } = trpc.auth.getEmailStatus.useQuery();
```

**Shows warning banner if not configured:**
- Displays alert above the login form
- Shows environment-appropriate message
- In development: Includes specific env var names to configure
- In production: Generic "temporarily unavailable" message

**Disables form when email not configured:**
- Email input disabled
- Submit button disabled
- Prevents attempted email submission

## User Experience

### Development Environment (Email Not Configured)

```
┌─────────────────────────────────────────────────┐
│ ⚠️  Email Not Configured                        │
│                                                 │
│ Email service is not configured. Update SMTP   │
│ settings in your .env file to enable magic     │
│ link authentication. See .env.example for      │
│ configuration details.                          │
│                                                 │
│ ⚙️  Configure SMTP_HOST, SMTP_USER,            │
│     SMTP_PASSWORD, and EMAIL_FROM               │
└─────────────────────────────────────────────────┘

Email: [disabled input field]
[Disabled "Send magic link" button]
```

### Production Environment (Email Not Configured)

```
┌─────────────────────────────────────────────────┐
│ ⚠️  Email Not Configured                        │
│                                                 │
│ Email service is temporarily unavailable.      │
│ Please try again later or contact support.     │
└─────────────────────────────────────────────────┘

Email: [disabled input field]
[Disabled "Send magic link" button]
```

### Email Configured

No warning shown, form works normally:
```
Email: [enabled input field]
[Enabled "Send magic link" button]
```

## Configuration

To enable email, set these in `.env`:

```bash
# Use a real SMTP service (not example values)
SMTP_HOST=smtp.resend.com
SMTP_USER=resend
SMTP_PASSWORD=re_your_api_key_here
EMAIL_FROM=noreply@yourdomain.com
```

**Example providers:**
- **Resend**: `smtp.resend.com` (recommended for development)
- **SendGrid**: `smtp.sendgrid.net`
- **AWS SES**: Regional endpoints
- **Gmail**: `smtp.gmail.com` (app password required)

## Benefits

### For Developers

1. **Immediate feedback** - No need to submit the form to discover email isn't working
2. **Clear instructions** - Development mode shows exactly what to configure
3. **No wasted time** - Prevents debugging email issues when config is missing

### For End Users

1. **No false expectations** - Form is disabled, not broken
2. **Clear messaging** - Production mode provides professional error message
3. **No confusion** - Won't receive "magic link sent" message when it wasn't

### For Boilerplate Users

1. **Better first-run experience** - Clear path to getting started
2. **Prevents GitHub issues** - Common "email not working" questions avoided
3. **Production-ready pattern** - Shows best practices for env-aware messaging

## Technical Details

### Performance

- **Query on mount**: Email status checked once when LoginForm renders
- **Cached**: tRPC automatically caches the result
- **No polling**: Status only fetched once (assumes env vars don't change at runtime)
- **Fast**: No network calls to SMTP server, just env var validation

### Security

- **No sensitive data exposed**: Messages don't leak SMTP credentials
- **Environment-aware**: Production messages are intentionally vague
- **No enumeration**: Doesn't reveal whether email exists in system

### Edge Cases

1. **Loading state**: Defaults to `isConfigured: true` while query loads
   - Prevents flash of warning on fast connections
   - Form becomes available once loaded if configured

2. **Query error**: Falls back to showing form
   - Allows login attempt if API unavailable
   - Actual send attempt will fail with appropriate error

3. **Partial configuration**: Validates all required fields
   - Missing any field = not configured
   - Prevents incomplete setup

## Files Modified

### Backend
- `apps/backend/src/services/email.service.ts` - Added configuration check methods
- `apps/backend/src/trpc/routers/auth.router.ts` - Added getEmailStatus endpoint

### Frontend
- `apps/frontend/src/components/ui/alert.tsx` - New component (created)
- `apps/frontend/src/components/auth/LoginForm.tsx` - Added email status check and warning UI

## Testing

### Manual Testing

1. **Test not configured (development)**:
   ```bash
   # In .env, use placeholder values
   SMTP_HOST=smtp.example.com
   SMTP_USER=noreply@example.com
   SMTP_PASSWORD=placeholder
   ```
   - Warning should appear with setup instructions
   - Form should be disabled

2. **Test configured**:
   ```bash
   # In .env, use real values
   SMTP_HOST=smtp.resend.com
   SMTP_USER=resend
   SMTP_PASSWORD=re_xxxxx
   ```
   - No warning shown
   - Form should be enabled

3. **Test production mode**:
   ```bash
   NODE_ENV=production
   # With placeholder values
   ```
   - Warning should show generic message (no .env references)

### API Testing

```bash
# Call the endpoint directly
curl http://localhost:4000/trpc/auth.getEmailStatus

# Response when not configured (dev):
{
  "isConfigured": false,
  "message": "Email service is not configured. Update SMTP settings..."
}

# Response when configured:
{
  "isConfigured": true
}
```

## Future Enhancements

Potential improvements for future versions:

1. **Connection test** - Optional button to test SMTP connection
2. **Admin panel** - UI to configure email without editing .env
3. **Multiple providers** - Support for multiple email service providers
4. **Template preview** - Preview email templates before sending
5. **Delivery monitoring** - Track email delivery success/failure rates

## Migration Guide

This is a new feature with no breaking changes. Existing deployments will:
- Show warning if email not configured (helpful!)
- Work normally if email is configured
- No database migrations required
- No API changes to existing endpoints

Developers should:
1. Pull latest code
2. Review warning on login page (if email not configured)
3. Configure SMTP per instructions
4. Warning disappears automatically once configured
