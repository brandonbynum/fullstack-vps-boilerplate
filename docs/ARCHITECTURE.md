# Architecture Overview

This document describes the system architecture and how components interact.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                        │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx (Reverse Proxy)                     │
│                   - SSL Termination                          │
│                   - Rate Limiting                            │
│                   - Security Headers                         │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
┌─────────────────────┐     ┌─────────────────────────────────┐
│  Frontend (React)   │     │       Backend (Express)          │
│  - Static files     │     │       - tRPC API                 │
│  - SPA routing      │     │       - Authentication           │
│  Port: 80           │     │       - Business logic           │
└─────────────────────┘     │       Port: 4000                 │
                            └─────────────────┬───────────────┘
                                              │
                                              ▼
                            ┌─────────────────────────────────┐
                            │        PostgreSQL Database       │
                            │        - User data               │
                            │        - Sessions                │
                            │        Port: 5432                │
                            └─────────────────────────────────┘
```

## Monorepo Structure

```
fullstack-boilerplate/
├── apps/
│   ├── frontend/          # React application
│   │   ├── src/
│   │   │   ├── components/   # UI components
│   │   │   ├── routes/       # TanStack Router pages
│   │   │   ├── hooks/        # Custom React hooks
│   │   │   ├── lib/          # Utilities (trpc, query-client)
│   │   │   └── styles/       # Global CSS
│   │   ├── Containerfile
│   │   └── vite.config.ts
│   │
│   └── backend/           # Express server
│       ├── prisma/
│       │   └── schema.prisma
│       ├── src/
│       │   ├── trpc/         # tRPC routers
│       │   ├── services/     # Business logic
│       │   ├── middleware/   # Express middleware
│       │   ├── config/       # Configuration
│       │   └── utils/        # Utilities
│       └── Containerfile
│
├── packages/
│   └── validators/        # Shared Zod schemas
│
└── infrastructure/        # Deployment configs
    ├── podman/
    ├── nginx/
    └── scripts/
```

## Technology Choices

### Why tRPC?

tRPC provides end-to-end type safety without code generation:

```typescript
// Backend: Define procedure
export const authRouter = router({
  requestMagicLink: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(({ input }) => {
      // Implementation
    })
})

// Frontend: Call with full type safety
const { mutate } = trpc.auth.requestMagicLink.useMutation()
mutate({ email: 'user@example.com' }) // Fully typed!
```

### Why TanStack Router?

Type-safe routing with automatic code splitting:

```typescript
// Route definition with typed search params
export const Route = createFileRoute('/auth/verify')({
  validateSearch: (search) => ({
    token: search.token as string,
  }),
  component: VerifyPage,
})

// Usage - fully typed
const { token } = Route.useSearch()
```

### Why Tailwind + shadcn/ui?

- **Tailwind**: Utility-first CSS, no context switching
- **shadcn/ui**: Copy-paste components you own and can customize

```tsx
// Beautiful, accessible UI with minimal code
<Card className="w-full max-w-md">
  <CardHeader>
    <CardTitle>Login</CardTitle>
  </CardHeader>
  <CardContent>
    <Input placeholder="Email" />
    <Button>Send Magic Link</Button>
  </CardContent>
</Card>
```

## Data Flow

### Authentication Flow

```
1. User enters email
   └─> Frontend calls trpc.auth.requestMagicLink

2. Backend creates magic link
   └─> Stores token in database
   └─> Sends email with link

3. User clicks email link
   └─> Frontend navigates to /auth/verify?token=xxx

4. Frontend calls trpc.auth.verifyMagicLink
   └─> Backend validates token
   └─> Creates JWT access + refresh tokens
   └─> Returns user data

5. Frontend stores tokens
   └─> Redirects to dashboard
```

### API Request Flow

```
Frontend                    Backend
   │                           │
   │  tRPC Request             │
   │  ──────────────────────►  │
   │                           │  1. Context creation
   │                           │     - Parse JWT from header
   │                           │     - Load user from database
   │                           │
   │                           │  2. Middleware
   │                           │     - isAuthenticated check
   │                           │     - isAdmin check (if needed)
   │                           │
   │                           │  3. Input validation (Zod)
   │                           │
   │                           │  4. Procedure execution
   │                           │     - Call service layer
   │                           │     - Database operations
   │                           │
   │  tRPC Response            │
   │  ◄──────────────────────  │
   │                           │
```

## Security Layers

### 1. Network Layer (Nginx)
- SSL/TLS termination
- Rate limiting (10 req/s API, 1 req/s auth)
- Security headers (HSTS, CSP, X-Frame-Options)

### 2. Application Layer (Express)
- Helmet security middleware
- CORS whitelist
- Request validation (Zod)

### 3. Authentication Layer (tRPC)
- JWT validation
- Role-based access control
- Session management

### 4. Data Layer (Prisma)
- Parameterized queries (SQL injection protection)
- Schema validation

## Container Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Podman Network (internal)                 │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │  nginx   │    │ backend  │    │ frontend │              │
│  │  :80/443 │    │  :4000   │    │   :80    │              │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘              │
│       │               │               │                     │
│       │               ▼               │                     │
│       │         ┌──────────┐          │                     │
│       │         │ postgres │          │                     │
│       │         │  :5432   │          │                     │
│       │         └──────────┘          │                     │
│       │                               │                     │
└───────┼───────────────────────────────┼─────────────────────┘
        │                               │
   External ports                  Not exposed
   (80, 443)
```

## Database Schema

```prisma
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
  user      User?     @relation(...)
}

model Session {
  id           String   @id @default(cuid())
  accessToken  String   @unique
  refreshToken String   @unique
  expiresAt    DateTime

  userId       String
  user         User     @relation(...)
}
```

## Scaling Considerations

### Current Architecture (Single Server)
- Suitable for: 0-1000 concurrent users
- Cost: ~$5-15/month

### Scaling Options

1. **Vertical Scaling**
   - Upgrade VPS resources
   - Suitable up to 5000+ concurrent users

2. **Database Separation**
   - Use managed PostgreSQL (Neon, Supabase, RDS)
   - Better reliability and backups

3. **Horizontal Scaling**
   - Multiple backend containers
   - Load balancer
   - Shared session store (Redis)

4. **Edge Caching**
   - Cloudflare CDN
   - Cache static assets globally
