# API Reference

This application uses tRPC for type-safe API calls. All endpoints are accessible via the tRPC client.

## Base URL

- Development: `http://localhost:4000/api/trpc`
- Production: `https://yourdomain.com/api/trpc`

## Authentication

Most endpoints require authentication via JWT in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Routers

### Auth Router (`auth.*`)

Authentication-related procedures.

#### `auth.requestMagicLink`

Request a magic link for passwordless login.

**Type:** Mutation (public)

**Input:**
```typescript
{
  email: string // Valid email address
}
```

**Output:**
```typescript
{
  success: boolean
  message: string
}
```

**Example:**
```typescript
const { mutate } = trpc.auth.requestMagicLink.useMutation()
mutate({ email: 'user@example.com' })
```

---

#### `auth.verifyMagicLink`

Verify a magic link and create a session.

**Type:** Mutation (public)

**Input:**
```typescript
{
  token: string // Magic link token from email
}
```

**Output:**
```typescript
{
  user: {
    id: string
    email: string
    role: 'USER' | 'ADMIN'
    isActive: boolean
    createdAt: string
    lastLoginAt: string | null
  }
  accessToken: string
  refreshToken: string
}
```

---

#### `auth.refreshToken`

Get a new access token using a refresh token.

**Type:** Mutation (public)

**Input:**
```typescript
{
  refreshToken: string
}
```

**Output:**
```typescript
{
  accessToken: string
  refreshToken: string
}
```

---

#### `auth.logout`

Invalidate the current session.

**Type:** Mutation (authenticated)

**Output:**
```typescript
{
  success: boolean
}
```

---

### User Router (`user.*`)

User-related procedures.

#### `user.me`

Get the current authenticated user's profile.

**Type:** Query (authenticated)

**Output:**
```typescript
{
  id: string
  email: string
  role: 'USER' | 'ADMIN'
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
}
```

**Example:**
```typescript
const { data: user } = trpc.user.me.useQuery()
```

---

### Admin Router (`admin.*`)

Admin-only procedures for user management.

#### `admin.getStats`

Get dashboard statistics.

**Type:** Query (admin only)

**Output:**
```typescript
{
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  recentLogins: number // Last 24 hours
}
```

---

#### `admin.listUsers`

List all users with pagination and search.

**Type:** Query (admin only)

**Input:**
```typescript
{
  page?: number    // Default: 1
  limit?: number   // Default: 10, max: 100
  search?: string  // Search by email
}
```

**Output:**
```typescript
{
  users: Array<{
    id: string
    email: string
    role: 'USER' | 'ADMIN'
    isActive: boolean
    createdAt: string
    lastLoginAt: string | null
  }>
  total: number
  page: number
  totalPages: number
}
```

---

#### `admin.updateUserRole`

Update a user's role.

**Type:** Mutation (admin only)

**Input:**
```typescript
{
  userId: string
  role: 'USER' | 'ADMIN'
}
```

**Output:**
```typescript
{
  success: boolean
  user: {
    id: string
    email: string
    role: 'USER' | 'ADMIN'
  }
}
```

---

#### `admin.toggleUserStatus`

Toggle a user's active status.

**Type:** Mutation (admin only)

**Input:**
```typescript
{
  userId: string
}
```

**Output:**
```typescript
{
  success: boolean
  user: {
    id: string
    email: string
    isActive: boolean
  }
}
```

## Error Handling

tRPC errors include:

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Missing or invalid authentication |
| `FORBIDDEN` | Insufficient permissions |
| `BAD_REQUEST` | Invalid input |
| `NOT_FOUND` | Resource not found |
| `INTERNAL_SERVER_ERROR` | Server error |

**Example error handling:**
```typescript
const { mutate, error } = trpc.auth.requestMagicLink.useMutation({
  onError: (error) => {
    if (error.data?.code === 'BAD_REQUEST') {
      // Handle validation error
    }
  }
})
```

## TypeScript Types

All types are automatically inferred from the backend. Import from the tRPC client:

```typescript
import { trpc } from '@/lib/trpc'
import type { RouterOutput, RouterInput } from '@/lib/trpc'

// Inferred types
type User = RouterOutput['user']['me']
type LoginInput = RouterInput['auth']['requestMagicLink']
```

## Rate Limiting

| Endpoint Type | Rate Limit |
|---------------|------------|
| Auth endpoints | 5 requests / 15 minutes |
| General API | 100 requests / 15 minutes |

## Health Check

The API exposes a health check endpoint:

```
GET /health
```

Returns `200 OK` with `{ status: 'ok' }` if the server is healthy.
