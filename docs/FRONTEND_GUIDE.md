# Frontend Guide

This guide covers the frontend architecture, patterns, and best practices.

## Technology Stack

- **React 19** - UI library
- **Vite** - Build tool
- **TypeScript** - Type safety
- **TanStack Router** - Type-safe routing
- **tRPC** - Type-safe API calls
- **TanStack Query** - Data fetching/caching
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components

## Project Structure

```
apps/frontend/src/
├── components/
│   ├── ui/           # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── auth/         # Auth-related components
│   │   └── LoginForm.tsx
│   └── layout/       # Layout components
│       └── Header.tsx
├── routes/           # TanStack Router pages
│   ├── __root.tsx    # Root layout
│   ├── index.tsx     # Home page (/)
│   ├── login.tsx     # Login page (/login)
│   ├── dashboard.tsx # Dashboard (/dashboard)
│   └── admin.tsx     # Admin page (/admin)
├── hooks/            # Custom React hooks
│   └── useAuth.ts    # Authentication hook
├── lib/              # Utilities
│   ├── trpc.ts       # tRPC client
│   ├── query-client.ts
│   └── utils.ts      # cn() helper
├── styles/
│   └── globals.css   # Tailwind + CSS variables
├── router.ts         # Router configuration
└── main.tsx          # Entry point
```

## Routing

### TanStack Router

Routes are defined as files in `src/routes/`:

```typescript
// src/routes/dashboard.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  return <div>Dashboard</div>
}
```

### Protected Routes

Use the auth hook to protect routes:

```typescript
function DashboardPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: '/login' })
    }
  }, [isLoading, isAuthenticated, navigate])

  if (isLoading) return <Loading />
  if (!isAuthenticated) return null

  return <div>Protected content</div>
}
```

### Search Parameters

Type-safe search params:

```typescript
export const Route = createFileRoute('/search')({
  validateSearch: (search) => ({
    query: (search.query as string) || '',
    page: Number(search.page) || 1,
  }),
  component: SearchPage,
})

function SearchPage() {
  const { query, page } = Route.useSearch()
  // query and page are fully typed!
}
```

### Navigation

```typescript
import { useNavigate, Link } from '@tanstack/react-router'

// Programmatic navigation
const navigate = useNavigate()
navigate({ to: '/dashboard' })
navigate({ to: '/search', search: { query: 'hello' } })

// Link component
<Link to="/dashboard">Dashboard</Link>
<Link to="/search" search={{ query: 'hello' }}>Search</Link>
```

## Data Fetching with tRPC

### Queries

```typescript
import { trpc } from '@/lib/trpc'

function UserProfile() {
  const { data: user, isLoading, error } = trpc.user.me.useQuery()

  if (isLoading) return <Loading />
  if (error) return <Error message={error.message} />

  return <div>Hello, {user.email}</div>
}
```

### Mutations

```typescript
function LoginForm() {
  const requestMagicLink = trpc.auth.requestMagicLink.useMutation({
    onSuccess: () => {
      toast.success('Check your email!')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const onSubmit = (data: { email: string }) => {
    requestMagicLink.mutate({ email: data.email })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('email')} />
      <Button
        type="submit"
        disabled={requestMagicLink.isPending}
      >
        {requestMagicLink.isPending ? 'Sending...' : 'Send Magic Link'}
      </Button>
    </form>
  )
}
```

### Invalidation

```typescript
const utils = trpc.useUtils()

const updateUser = trpc.user.update.useMutation({
  onSuccess: () => {
    // Invalidate and refetch
    utils.user.me.invalidate()
  },
})
```

## Styling with Tailwind

### Utility Classes

```tsx
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  <h1 className="text-2xl font-bold text-gray-900">Title</h1>
  <Button variant="primary">Action</Button>
</div>
```

### Responsive Design

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id} />)}
</div>
```

### Dark Mode

CSS variables are set up for dark mode:

```css
/* globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
}
```

### The `cn()` Utility

Merge Tailwind classes conditionally:

```typescript
import { cn } from '@/lib/utils'

<div className={cn(
  "p-4 rounded",
  isActive && "bg-blue-500",
  isError && "bg-red-500"
)}>
```

## shadcn/ui Components

### Available Components

The boilerplate includes:
- Button
- Input
- Card
- Table
- Badge
- Label

### Adding New Components

Visit [ui.shadcn.com](https://ui.shadcn.com) and copy components:

```bash
# Example: Add Dialog component
# 1. Go to https://ui.shadcn.com/docs/components/dialog
# 2. Copy the code
# 3. Create src/components/ui/dialog.tsx
# 4. Paste and save
```

### Using Components

```tsx
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

<Card>
  <CardHeader>
    <CardTitle>Login</CardTitle>
  </CardHeader>
  <CardContent>
    <Input placeholder="Email" />
    <Button>Submit</Button>
  </CardContent>
</Card>
```

## Forms

### With React Hook Form

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema } from '@fullstack/validators'

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('email')} />
      {errors.email && <p>{errors.email.message}</p>}
      <Button type="submit">Login</Button>
    </form>
  )
}
```

## State Management

### Local State

```typescript
const [count, setCount] = useState(0)
```

### Server State (tRPC + TanStack Query)

tRPC handles server state automatically:

```typescript
const { data, isLoading } = trpc.user.me.useQuery()
```

### Auth State

Use the `useAuth` hook:

```typescript
const { user, isAuthenticated, isLoading, isAdmin } = useAuth()
```

## Best Practices

### 1. Colocate Components

Keep components near where they're used:

```
routes/
  dashboard.tsx
  _dashboard/
    StatsCard.tsx      # Only used in dashboard
components/
  ui/                  # Shared UI components
```

### 2. Use TypeScript

Leverage tRPC's type inference:

```typescript
// Types are automatically inferred
const { data } = trpc.user.me.useQuery()
// data is fully typed!
```

### 3. Handle Loading States

```tsx
function Component() {
  const { data, isLoading, error } = trpc.user.me.useQuery()

  if (isLoading) return <Skeleton />
  if (error) return <ErrorMessage error={error} />
  if (!data) return null

  return <Content data={data} />
}
```

### 4. Use Error Boundaries

```tsx
import { ErrorBoundary } from 'react-error-boundary'

<ErrorBoundary FallbackComponent={ErrorFallback}>
  <Component />
</ErrorBoundary>
```

### 5. Optimize Images

```tsx
<img
  src="/image.jpg"
  alt="Description"
  loading="lazy"
  className="w-full h-auto"
/>
```

## Development Tips

### Hot Module Replacement

Vite provides fast HMR. Changes reflect instantly.

### React DevTools

Install the React DevTools browser extension for debugging.

### TanStack Query DevTools

```tsx
// Already included in the boilerplate
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
```
