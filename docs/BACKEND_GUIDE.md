# Backend Guide

This guide covers the backend architecture, patterns, and best practices.

## Technology Stack

- **Node.js** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **tRPC** - Type-safe API layer
- **Prisma** - ORM
- **PostgreSQL** - Database
- **Zod** - Validation

## Project Structure

```
apps/backend/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Database migrations
├── src/
│   ├── config/
│   │   ├── env.ts         # Environment validation
│   │   └── database.ts    # Prisma client
│   ├── services/
│   │   ├── auth.service.ts    # Auth business logic
│   │   ├── token.service.ts   # JWT operations
│   │   └── email.service.ts   # Email sending
│   ├── trpc/
│   │   ├── context.ts     # Request context
│   │   ├── trpc.ts        # tRPC initialization
│   │   ├── root.ts        # Root router
│   │   └── routers/
│   │       ├── auth.router.ts
│   │       ├── user.router.ts
│   │       └── admin.router.ts
│   ├── middleware/
│   │   └── error.middleware.ts
│   ├── utils/
│   │   └── logger.ts      # Winston logger
│   ├── app.ts             # Express app
│   └── server.ts          # Entry point
├── Containerfile
└── package.json
```

## tRPC Architecture

### Context

The context is created for each request:

```typescript
// src/trpc/context.ts
export const createContext = async ({ req, res }: CreateContextOptions) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  let user = null

  if (token) {
    try {
      const payload = verifyAccessToken(token)
      user = await prisma.user.findUnique({
        where: { id: payload.userId }
      })
    } catch {
      // Invalid token, user stays null
    }
  }

  return { req, res, prisma, user }
}
```

### Procedures

Three types of procedures:

```typescript
// src/trpc/trpc.ts

// Public - no authentication required
export const publicProcedure = t.procedure

// Protected - requires authentication
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { ...ctx, user: ctx.user } })
})

// Admin - requires admin role
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return next({ ctx })
})
```

### Routers

Organize endpoints by domain:

```typescript
// src/trpc/routers/user.router.ts
import { router, protectedProcedure } from '../trpc'

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user
  }),

  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: input,
      })
    }),
})
```

### Root Router

Combine all routers:

```typescript
// src/trpc/root.ts
export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  admin: adminRouter,
})

export type AppRouter = typeof appRouter
```

## Service Layer

Keep business logic in services:

```typescript
// src/services/auth.service.ts
export class AuthService {
  async requestMagicLink(email: string) {
    // 1. Find or create user
    const user = await prisma.user.upsert({
      where: { email },
      create: { email },
      update: {},
    })

    // 2. Generate token
    const token = generateMagicLinkToken()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    // 3. Store token
    await prisma.magicLink.create({
      data: { token, email, expiresAt, userId: user.id },
    })

    // 4. Send email
    await emailService.sendMagicLink(email, token)

    return { success: true }
  }

  async verifyMagicLink(token: string) {
    // Find and validate token
    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!magicLink || magicLink.usedAt || magicLink.expiresAt < new Date()) {
      throw new Error('Invalid or expired magic link')
    }

    // Mark as used
    await prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { usedAt: new Date() },
    })

    // Generate session tokens
    const { accessToken, refreshToken } = generateTokens(magicLink.userId!)

    // Store session
    await prisma.session.create({
      data: {
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userId: magicLink.userId!,
      },
    })

    return { user: magicLink.user, accessToken, refreshToken }
  }
}
```

## Validation with Zod

Use shared schemas from the validators package:

```typescript
// packages/validators/src/auth.schemas.ts
import { z } from 'zod'

export const requestMagicLinkSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const verifyMagicLinkSchema = z.object({
  token: z.string().min(1, 'Token is required'),
})
```

Use in router:

```typescript
// src/trpc/routers/auth.router.ts
import { requestMagicLinkSchema } from '@fullstack/validators'

export const authRouter = router({
  requestMagicLink: publicProcedure
    .input(requestMagicLinkSchema)
    .mutation(async ({ input }) => {
      return authService.requestMagicLink(input.email)
    }),
})
```

## Error Handling

### tRPC Errors

```typescript
import { TRPCError } from '@trpc/server'

throw new TRPCError({
  code: 'NOT_FOUND',
  message: 'User not found',
})

// Available codes:
// PARSE_ERROR, BAD_REQUEST, UNAUTHORIZED, FORBIDDEN,
// NOT_FOUND, METHOD_NOT_SUPPORTED, TIMEOUT, CONFLICT,
// PRECONDITION_FAILED, PAYLOAD_TOO_LARGE, INTERNAL_SERVER_ERROR
```

### Global Error Handler

```typescript
// src/middleware/error.middleware.ts
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Unhandled error:', err)

  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  })
}
```

## Logging

Using Winston:

```typescript
// src/utils/logger.ts
import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
})

// Usage
logger.info('User logged in', { userId: user.id })
logger.error('Failed to send email', { error: err.message })
```

## Security

### Express Middleware

```typescript
// src/app.ts
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'

// Security headers
app.use(helmet())

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || process.env.FRONTEND_URL,
  credentials: true,
}))

// Rate limiting
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
}))

// Stricter limit for auth
app.use('/api/trpc/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
}))
```

### Environment Validation

```typescript
// src/config/env.ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().transform(Number).default('4000'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  FRONTEND_URL: z.string().url(),
})

export const env = envSchema.parse(process.env)
```

## Adding New Endpoints

### 1. Create Schema (validators)

```typescript
// packages/validators/src/post.schemas.ts
export const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
})
```

### 2. Create Service

```typescript
// src/services/post.service.ts
export class PostService {
  async create(userId: string, data: CreatePostInput) {
    return prisma.post.create({
      data: { ...data, authorId: userId },
    })
  }
}
```

### 3. Create Router

```typescript
// src/trpc/routers/post.router.ts
export const postRouter = router({
  create: protectedProcedure
    .input(createPostSchema)
    .mutation(({ ctx, input }) => {
      return postService.create(ctx.user.id, input)
    }),
})
```

### 4. Add to Root Router

```typescript
// src/trpc/root.ts
export const appRouter = router({
  // ... existing routers
  post: postRouter,
})
```

## Testing

### Unit Tests

```typescript
// src/services/__tests__/auth.service.test.ts
describe('AuthService', () => {
  it('should create magic link', async () => {
    const result = await authService.requestMagicLink('test@example.com')
    expect(result.success).toBe(true)
  })
})
```

### Integration Tests

```typescript
// src/trpc/routers/__tests__/auth.router.test.ts
describe('auth.requestMagicLink', () => {
  it('should send magic link', async () => {
    const caller = appRouter.createCaller({ prisma, user: null })
    const result = await caller.auth.requestMagicLink({
      email: 'test@example.com',
    })
    expect(result.success).toBe(true)
  })
})
```

## Database Operations

### Transactions

```typescript
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: { email } })
  await tx.session.create({ data: { userId: user.id, ... } })
  return user
})
```

### Pagination

```typescript
async listUsers(page: number, limit: number) {
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ])

  return {
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }
}
```

## Best Practices

1. **Use services for business logic** - Keep routers thin
2. **Validate all inputs** - Use Zod schemas
3. **Handle errors gracefully** - Use TRPCError
4. **Log important events** - Use structured logging
5. **Use transactions** - For multi-step operations
6. **Index database fields** - For query performance
7. **Rate limit endpoints** - Prevent abuse
