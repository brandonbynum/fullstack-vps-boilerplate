# Admin User Setup Guide

This guide explains how to create and manage the default admin user in your application.

## Overview

The application includes a database seeding mechanism that automatically creates a default admin user during setup and deployment. This ensures you have immediate access to the admin dashboard after deploying.

## Quick Start

### Development

1. **Set the admin email** in `apps/backend/.env`:
   ```bash
   DEFAULT_ADMIN_EMAIL=admin@example.com
   ```

2. **Run the seed script**:
   ```bash
   pnpm --filter backend db:seed
   ```

   Or run the full setup (which includes seeding):
   ```bash
   ./scripts/setup-dev.sh
   ```

3. **Login to the application**:
   - Visit your app at http://localhost:3000
   - Click "Login" and enter `admin@example.com`
   - Check your console logs for the magic link (in development, emails are logged)
   - Click the magic link to authenticate

4. **Access the admin dashboard**:
   - Once logged in, visit http://localhost:3000/admin
   - You should see the admin dashboard with user management features

### Production

1. **Set the admin email** in your root `.env` file:
   ```bash
   DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
   ```

2. **Deploy your application**:
   ```bash
   ./infrastructure/scripts/deploy.sh
   ```

   The deployment script automatically runs the seed after setting up the database.

3. **Login and access admin dashboard**:
   - Request a magic link for your admin email
   - Check your email inbox for the login link
   - Access the admin dashboard at https://yourdomain.com/admin

## How It Works

### Seed Script Behavior

The seed script (`apps/backend/prisma/seed.ts`) is **idempotent**, meaning:

- **First run**: Creates a new user with ADMIN role if the email doesn't exist
- **Subsequent runs**:
  - If the user exists with ADMIN role → No changes
  - If the user exists with USER role → Promotes them to ADMIN
- **No email configured**: Safely exits with a helpful message

### Automatic Execution

The seed script runs automatically in these scenarios:

1. **Development Setup**: `./scripts/setup-dev.sh` runs the seed after migrations
2. **Production Deployment**: `./infrastructure/scripts/deploy.sh` runs the seed after schema sync
3. **Manual Execution**: `pnpm --filter backend db:seed` at any time

## Manual Admin Promotion

If you need to promote an existing user to admin without re-running the seed:

### Option 1: Using Prisma Studio

```bash
pnpm --filter backend db:studio
```

1. Open Prisma Studio in your browser
2. Navigate to the `User` model
3. Find the user you want to promote
4. Change their `role` field to `ADMIN`
5. Save changes

### Option 2: Using SQL

```bash
# Connect to your database
podman exec -it fullstack-postgres psql -U postgres -d fullstack

# Promote user
UPDATE "User" SET role = 'ADMIN' WHERE email = 'user@example.com';
```

### Option 3: Update .env and Re-run Seed

```bash
# Update .env
DEFAULT_ADMIN_EMAIL=newadmin@example.com

# Run seed
pnpm --filter backend db:seed
```

## Admin Dashboard Features

Once logged in as an admin, you can access `/admin` to:

- **View Statistics**:
  - Total users
  - Active/inactive users
  - Recent logins (24h)

- **Manage Users**:
  - Search users by email
  - Promote/demote user roles (USER ↔ ADMIN)
  - Activate/deactivate user accounts
  - Delete users
  - View user details (join date, last login, etc.)

## Security Notes

### Protected Routes

- The admin dashboard is protected by authentication
- Only users with `role: 'ADMIN'` can access admin routes
- Non-admin users are automatically redirected to `/dashboard`

### Self-Protection

Admins cannot:
- Change their own role (prevent accidental demotion)
- Deactivate their own account (prevent lockout)
- Delete their own account (prevent lockout)

### Deactivation Effects

When a user is deactivated:
- Their `isActive` flag is set to `false`
- All their active sessions are deleted (logged out everywhere)
- They cannot log in until reactivated

## Troubleshooting

### "No DEFAULT_ADMIN_EMAIL set"

**Problem**: Seed script exits without creating admin user.

**Solution**: Add `DEFAULT_ADMIN_EMAIL=admin@example.com` to your `.env` file.

### "Invalid email format"

**Problem**: The email address doesn't match standard format.

**Solution**: Ensure your email follows the pattern `user@domain.com`.

### "User created but can't access /admin"

**Problem**: User exists but doesn't have admin role.

**Solution**:
1. Check the user's role in Prisma Studio
2. Re-run the seed script (it will promote them if needed)
3. Or manually update their role using one of the methods above

### "Can't receive magic link"

**Problem**: Email not arriving in development.

**Solution**:
- In development, magic links are logged to the console
- Check your backend logs for the URL
- In production, ensure SMTP settings are configured correctly

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DEFAULT_ADMIN_EMAIL` | Optional | Email address for the default admin user. If not set, seed script will skip admin creation. |

## Examples

### Development Environment

```bash
# apps/backend/.env
DEFAULT_ADMIN_EMAIL=dev@localhost
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fullstack
# ... other config
```

### Production Environment

```bash
# .env (root)
DEFAULT_ADMIN_EMAIL=admin@myapp.com
POSTGRES_PASSWORD=<secure-password>
# ... other config
```

### Multiple Admins

To create multiple admin users:

1. Run seed with first admin email
2. Login as first admin
3. Use the admin dashboard to promote other users to ADMIN

Or run the seed multiple times with different emails:

```bash
DEFAULT_ADMIN_EMAIL=admin1@example.com pnpm --filter backend db:seed
DEFAULT_ADMIN_EMAIL=admin2@example.com pnpm --filter backend db:seed
```

## Next Steps

After setting up your admin user:

1. **Secure your production environment**:
   - Use a real email address for `DEFAULT_ADMIN_EMAIL`
   - Configure SMTP for production email delivery
   - Set strong JWT secrets (see [Environment Variables](./ENVIRONMENT_VARIABLES.md))

2. **Test the admin dashboard**:
   - Create test users
   - Practice promoting/demoting roles
   - Test user deactivation

3. **Configure email templates** (if needed):
   - Customize magic link email templates
   - Add branding to authentication emails

## Related Documentation

- [Environment Variables](./ENVIRONMENT_VARIABLES.md) - Configuration reference
- [Authentication](./MAGIC_LINK_AUTH.md) - How magic link auth works
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [API Reference](./API.md) - Admin API endpoints
