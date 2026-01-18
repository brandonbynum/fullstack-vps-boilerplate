# Database Guide

This guide covers database setup, schema management, and best practices.

## Overview

The application uses:
- **PostgreSQL 16** - Relational database
- **Prisma** - Type-safe ORM

## Schema

The default schema includes:

```prisma
// apps/backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  USER
  ADMIN
}

model User {
  id          String    @id @default(cuid())
  email       String    @unique
  role        UserRole  @default(USER)
  isActive    Boolean   @default(true)
  lastLoginAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  magicLinks  MagicLink[]
  sessions    Session[]
}

model MagicLink {
  id        String    @id @default(cuid())
  token     String    @unique
  email     String
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  userId    String?
  user      User?     @relation(fields: [userId], references: [id])

  @@index([token])
  @@index([expiresAt])
}

model Session {
  id           String   @id @default(cuid())
  accessToken  String   @unique
  refreshToken String   @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([accessToken])
  @@index([refreshToken])
  @@index([expiresAt])
}
```

## Common Commands

### Generate Prisma Client

After schema changes, regenerate the client:

```bash
pnpm --filter backend prisma:generate
```

### Create Migration

Create a new migration after schema changes:

```bash
pnpm --filter backend prisma:migrate
```

This will:
1. Detect schema changes
2. Generate SQL migration
3. Apply migration to database

### View Database (Prisma Studio)

Open a GUI to browse data:

```bash
pnpm --filter backend prisma:studio
```

Opens at http://localhost:5555

### Reset Database

**Warning:** This deletes all data!

```bash
pnpm --filter backend prisma:reset
```

### Deploy Migrations (Production)

Apply pending migrations without generating new ones:

```bash
npx prisma migrate deploy
```

### Check Migration Status

```bash
npx prisma migrate status
```

## Adding New Models

### 1. Define the Model

```prisma
// apps/backend/prisma/schema.prisma

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String   @db.Text
  published Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([authorId])
  @@index([published, createdAt])
}

// Update User model to include relation
model User {
  // ... existing fields
  posts     Post[]
}
```

### 2. Create Migration

```bash
pnpm --filter backend prisma:migrate
# Enter migration name: add_posts_table
```

### 3. Generate Client

```bash
pnpm --filter backend prisma:generate
```

### 4. Use in Code

```typescript
// Create post
const post = await prisma.post.create({
  data: {
    title: 'Hello World',
    content: 'My first post',
    authorId: user.id,
  },
})

// Query with relations
const userWithPosts = await prisma.user.findUnique({
  where: { id: userId },
  include: { posts: true },
})
```

## Best Practices

### Use Indexes

Add indexes for frequently queried fields:

```prisma
model Post {
  // ...
  @@index([authorId])           // Foreign key
  @@index([published, createdAt])  // Composite for filtering + sorting
}
```

### Use Appropriate Data Types

```prisma
model Example {
  id          String   @id @default(cuid())  // Use cuid for IDs
  email       String   @unique               // Unique constraint
  content     String   @db.Text              // For long text
  price       Decimal  @db.Decimal(10, 2)    // For money
  metadata    Json?                          // Optional JSON
  createdAt   DateTime @default(now())
}
```

### Handle Cascade Deletes

```prisma
model Session {
  userId String
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  // When user is deleted, their sessions are also deleted
}
```

### Soft Deletes (Optional)

Instead of deleting records:

```prisma
model User {
  deletedAt DateTime?

  @@index([deletedAt])
}

// Query only non-deleted users
const users = await prisma.user.findMany({
  where: { deletedAt: null }
})
```

## Seeding Data

### Create Seed Script

```typescript
// apps/backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      role: 'ADMIN',
    },
  })

  console.log({ admin })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

### Add to package.json

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

### Run Seed

```bash
npx prisma db seed
```

## Backups

### Manual Backup

```bash
# Using the provided script
./infrastructure/scripts/backup-db.sh

# Or directly
podman exec fullstack-postgres pg_dump -U postgres fullstack > backup.sql
```

### Restore Backup

```bash
# Stop the app first
podman exec -i fullstack-postgres psql -U postgres fullstack < backup.sql
```

### Automated Backups

Add to crontab:

```bash
crontab -e
# Add: 0 3 * * * /opt/fullstack-app/infrastructure/scripts/backup-db.sh
```

## Connection Pooling

For production, consider connection pooling. Prisma has built-in connection limits:

```typescript
// apps/backend/src/config/database.ts
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
})
```

For high traffic, use PgBouncer or a managed database with pooling.

## Migrations in Production

### Safe Migration Workflow

1. **Test locally:**
```bash
pnpm --filter backend prisma:migrate
```

2. **Review SQL:**
```bash
cat apps/backend/prisma/migrations/*/migration.sql
```

3. **Deploy migration:**
```bash
npx prisma migrate deploy
```

### Rollback Strategy

Prisma doesn't support automatic rollbacks. For critical migrations:

1. Create a manual rollback SQL file
2. Test the rollback in staging
3. Keep backup before migrating production

## Troubleshooting

### Migration Drift

```
Drift detected: Your database schema is not in sync
```

**Solution:**
```bash
# Development - reset
npx prisma migrate reset

# Production - baseline
npx prisma migrate resolve --applied "migration_name"
```

### Connection Timeout

```
Can't reach database server
```

**Solutions:**
1. Check DATABASE_URL
2. Verify PostgreSQL is running
3. Check firewall rules
4. Increase connection timeout
