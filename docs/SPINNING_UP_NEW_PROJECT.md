# Creating a New Project

This guide explains how to use this boilerplate to create new projects.

## Quick Start

```bash
# Clone the boilerplate
git clone https://github.com/yourusername/fullstack-boilerplate.git

# Run the project creation script
cd fullstack-boilerplate
./scripts/create-new-project.sh my-new-app /path/to/projects

# Start developing
cd /path/to/projects/my-new-app
./scripts/setup-dev.sh
pnpm dev
```

## What the Script Does

The `create-new-project.sh` script:

1. **Copies boilerplate files** to new location
2. **Removes git history** for a fresh start
3. **Updates package names** throughout the project
4. **Generates secrets** (JWT, database password)
5. **Creates .env files** with your configuration
6. **Initializes new git repository**

## Manual Setup Alternative

If you prefer manual setup:

### 1. Clone and Rename

```bash
git clone https://github.com/yourusername/fullstack-boilerplate.git my-app
cd my-app
rm -rf .git
```

### 2. Update Package Names

Find and replace `fullstack-boilerplate` in:
- `package.json` (root)
- `apps/backend/package.json`
- `apps/frontend/package.json`
- `packages/validators/package.json`

### 3. Generate Secrets

```bash
# JWT secrets
openssl rand -base64 64

# Database password
openssl rand -base64 32
```

### 4. Create Environment Files

Copy `.env.example` files and configure:
```bash
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

### 5. Initialize Git

```bash
git init
git add .
git commit -m "Initial commit"
```

## Customization Checklist

After creating your project, customize these items:

### Required Changes

- [ ] Update `package.json` name and description
- [ ] Configure `.env` files with your settings
- [ ] Update `README.md` with your project info
- [ ] Set up email service for magic links

### Optional Changes

- [ ] Modify Prisma schema for your data model
- [ ] Add new tRPC routers for your features
- [ ] Customize UI components and styling
- [ ] Update branding (logo, colors, fonts)

## Database Schema Customization

Edit the Prisma schema for your needs:

```bash
# Edit schema
vim apps/backend/prisma/schema.prisma

# Create migration
pnpm --filter backend prisma:migrate

# Generate client
pnpm --filter backend prisma:generate
```

### Example: Adding a Posts Model

```prisma
// apps/backend/prisma/schema.prisma

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String
  published Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
}

// Update User model
model User {
  // ... existing fields
  posts     Post[]
}
```

## Adding New API Endpoints

### 1. Create Zod Schema (validators package)

```typescript
// packages/validators/src/post.schemas.ts
import { z } from 'zod'

export const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
})

export const updatePostSchema = createPostSchema.partial()
```

### 2. Create tRPC Router

```typescript
// apps/backend/src/trpc/routers/post.router.ts
import { router, protectedProcedure } from '../trpc'
import { createPostSchema } from '@fullstack/validators'

export const postRouter = router({
  create: protectedProcedure
    .input(createPostSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.post.create({
        data: {
          ...input,
          authorId: ctx.user.id,
        },
      })
    }),

  list: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.prisma.post.findMany({
        where: { authorId: ctx.user.id },
        orderBy: { createdAt: 'desc' },
      })
    }),
})
```

### 3. Add to Root Router

```typescript
// apps/backend/src/trpc/root.ts
import { postRouter } from './routers/post.router'

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  admin: adminRouter,
  post: postRouter,  // Add new router
})
```

### 4. Use in Frontend

```typescript
// Fully typed, auto-complete works!
const { data: posts } = trpc.post.list.useQuery()
const createPost = trpc.post.create.useMutation()

createPost.mutate({ title: 'Hello', content: 'World' })
```

## Adding New Frontend Pages

### 1. Create Route File

```typescript
// apps/frontend/src/routes/posts.tsx
import { createFileRoute } from '@tanstack/react-router'
import { trpc } from '../lib/trpc'

export const Route = createFileRoute('/posts')({
  component: PostsPage,
})

function PostsPage() {
  const { data: posts } = trpc.post.list.useQuery()

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold">My Posts</h1>
      {posts?.map(post => (
        <Card key={post.id}>
          <CardHeader>
            <CardTitle>{post.title}</CardTitle>
          </CardHeader>
          <CardContent>{post.content}</CardContent>
        </Card>
      ))}
    </div>
  )
}
```

### 2. Add to Router

```typescript
// apps/frontend/src/router.ts
import { Route as postsRoute } from './routes/posts'

const routeTree = rootRoute.addChildren([
  // ... existing routes
  postsRoute,
])
```

## Deployment Setup

### 1. Set Up GitHub Repository

```bash
git remote add origin https://github.com/yourusername/my-app.git
git push -u origin main
```

### 2. Configure GitHub Secrets

Add these secrets in Settings → Secrets:
- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `DOMAIN`
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- (etc.)

### 3. Set Up VPS

```bash
# On your VPS
./infrastructure/scripts/setup-vps.sh
./infrastructure/scripts/setup-ssl.sh yourdomain.com
```

### 4. Deploy

Push to main branch to trigger deployment, or manually:

```bash
./infrastructure/scripts/deploy.sh
```

## Project Structure After Customization

```
my-app/
├── apps/
│   ├── frontend/
│   │   └── src/
│   │       ├── components/   # Your custom components
│   │       ├── routes/       # Your pages
│   │       └── hooks/        # Your custom hooks
│   └── backend/
│       └── src/
│           ├── trpc/routers/ # Your API routers
│           └── services/     # Your business logic
├── packages/
│   └── validators/           # Your Zod schemas
└── infrastructure/           # Usually unchanged
```

## Tips

1. **Start with the schema** - Define your data model first
2. **Use the validators package** - Share types between frontend and backend
3. **Leverage tRPC** - Full type safety, no manual API client needed
4. **Use shadcn/ui** - Add components as needed with copy-paste
5. **Test locally first** - Use `pnpm dev` before deploying
