# Full-Stack Boilerplate

A production-ready full-stack web application boilerplate with passwordless authentication, admin dashboard, and complete deployment pipeline.

## Tech Stack

### Frontend
- **React 19** + **Vite** + **TypeScript**
- **TanStack Router** - Type-safe routing
- **tRPC** - End-to-end type-safe API calls
- **TanStack Query** - Data fetching and caching
- **Tailwind CSS** + **shadcn/ui** - Styling and components

### Backend
- **Node.js** + **Express** + **TypeScript**
- **tRPC** - Type-safe API layer
- **Prisma** - Type-safe ORM
- **PostgreSQL** - Database

### Infrastructure
- **Podman** - Containerization
- **Nginx** - Reverse proxy with SSL
- **GitHub Actions** - CI/CD
- **Let's Encrypt** - SSL certificates

## Features

- **Passwordless Authentication** - Magic email links with JWT sessions
- **Admin Dashboard** - User management out of the box
- **End-to-End Type Safety** - tRPC + Prisma = no manual type syncing
- **Beautiful UI** - Tailwind CSS + shadcn/ui components
- **Production Ready** - Security headers, rate limiting, logging
- **Container Ready** - Podman Compose for easy deployment
- **CI/CD Pipeline** - Automated testing and deployment

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/fullstack-boilerplate.git my-app
cd my-app

# Setup development environment
./scripts/setup-dev.sh

# Start development servers
pnpm dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Database: localhost:5432

## Project Structure

```
fullstack-boilerplate/
├── apps/
│   ├── frontend/          # React + Vite + TanStack Router
│   └── backend/           # Express + tRPC + Prisma
├── packages/
│   └── validators/        # Shared Zod schemas
├── infrastructure/
│   ├── podman/            # Container orchestration
│   ├── nginx/             # Reverse proxy config
│   ├── scripts/           # Deployment scripts
│   └── systemd/           # Service files
├── .github/workflows/     # CI/CD pipelines
├── scripts/               # Development scripts
└── docs/                  # Documentation
```

## Documentation

- [Getting Started](./docs/GETTING_STARTED.md) - Local development setup
- [Deployment Guide](./docs/DEPLOYMENT.md) - VPS deployment
- [Architecture](./docs/ARCHITECTURE.md) - System overview
- [API Reference](./docs/API.md) - tRPC endpoints
- [Authentication](./docs/MAGIC_LINK_AUTH.md) - Auth flow details
- [Environment Variables](./docs/ENVIRONMENT_VARIABLES.md) - Configuration
- [New Project Guide](./docs/SPINNING_UP_NEW_PROJECT.md) - Template usage
- [Troubleshooting](./docs/TROUBLESHOOTING.md) - Common issues
- [Security](./docs/SECURITY.md) - Security best practices

## Scripts

```bash
# Development
pnpm dev              # Start all services
pnpm build            # Build all packages
pnpm lint             # Run linter
pnpm typecheck        # Type check

# Database
pnpm --filter backend prisma:studio    # Open Prisma Studio
pnpm --filter backend prisma:migrate   # Run migrations
pnpm --filter backend prisma:generate  # Generate client

# Production
./scripts/create-new-project.sh <name>  # Create new project
./infrastructure/scripts/deploy.sh      # Deploy to VPS
```

## Deployment Cost

- VPS: ~$5-12/month (Hetzner, DigitalOcean, etc.)
- Domain: ~$10-15/year
- Email (Resend): Free tier (3000 emails/month)
- SSL: Free (Let's Encrypt)

**Total: ~$5-15/month for a production MVP**

## License

MIT
