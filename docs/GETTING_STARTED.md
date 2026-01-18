# Getting Started

This guide will help you set up the development environment and start building your application.

## Prerequisites

- **Node.js 20+** - [Download](https://nodejs.org)
- **pnpm** - `npm install -g pnpm`
- **Podman** (optional) - For containerized development
- **Git** - Version control

## Quick Setup

The fastest way to get started:

```bash
# Clone the repository
git clone https://github.com/yourusername/fullstack-boilerplate.git my-app
cd my-app

# Run the setup script
./scripts/setup-dev.sh
```

This script will:
1. Install all dependencies
2. Create environment files
3. Start PostgreSQL container
4. Run database migrations
5. Generate Prisma client

## Manual Setup

If you prefer to set up manually:

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment Variables

Copy the example environment files:

```bash
# Root .env
cp .env.example .env

# Backend .env
cp apps/backend/.env.example apps/backend/.env

# Frontend .env
cp apps/frontend/.env.example apps/frontend/.env
```

Edit the files with your configuration. See [Environment Variables](./ENVIRONMENT_VARIABLES.md) for details.

### 3. Start the Database

Using Podman:

```bash
podman run -d \
  --name fullstack-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=fullstack \
  -p 5432:5432 \
  postgres:16-alpine
```

Or use Docker:

```bash
docker run -d \
  --name fullstack-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=fullstack \
  -p 5432:5432 \
  postgres:16-alpine
```

### 4. Run Database Migrations

```bash
# Generate Prisma client
pnpm --filter backend prisma:generate

# Run migrations
pnpm --filter backend prisma:migrate
```

### 5. Build Shared Packages

```bash
pnpm --filter validators build
```

## Start Development

```bash
pnpm dev
```

This starts:
- **Frontend**: http://localhost:3000 (or 3001 if 3000 is in use)
- **Backend**: http://localhost:4000
- **API**: http://localhost:4000/api/trpc

> **Note**: The backend will start even without a database connection in development mode. You can test the [Hello World example](./HELLO_WORLD.md) immediately without setting up the database. Features requiring database access (authentication, user management) will need the database running.

## Development Commands

```bash
# Start all services
pnpm dev

# Build all packages
pnpm build

# Run linter
pnpm lint

# Type check
pnpm typecheck

# Format code
pnpm format
```

## Database Commands

```bash
# Open Prisma Studio (database GUI)
pnpm --filter backend prisma:studio

# Create new migration
pnpm --filter backend prisma:migrate

# Reset database
pnpm --filter backend prisma:reset

# Generate Prisma client
pnpm --filter backend prisma:generate
```

## Project Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development servers |
| `pnpm build` | Build all packages |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm test` | Run tests |

## Testing Authentication

1. Start the development servers
2. Navigate to http://localhost:3000/login
3. Enter an email address
4. Check the console for the magic link (in development mode)
5. Click the link to authenticate

## Troubleshooting

### Database Connection Error

```
WARNING: Database connection failed. Server will start in development mode without database.
```

This is normal in development mode if you haven't set up the database yet. The backend will still start and you can test database-free features like the [Hello World example](./HELLO_WORLD.md).

To set up the database for full functionality, make sure PostgreSQL is running:

```bash
podman ps  # or docker ps
```

Then run migrations:

```bash
pnpm --filter backend db:generate
pnpm --filter backend db:migrate
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Prisma Client Not Generated

```bash
pnpm --filter backend prisma:generate
```

## Next Steps

- [Architecture Overview](./ARCHITECTURE.md) - Understand the system
- [API Reference](./API.md) - Learn the API endpoints
- [Authentication Flow](./MAGIC_LINK_AUTH.md) - How auth works
- [Deployment Guide](./DEPLOYMENT.md) - Deploy to production
