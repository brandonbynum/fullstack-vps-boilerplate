# Hello World E2E Example

This document explains the Hello World example that demonstrates full-stack integration in the boilerplate. It showcases tRPC, React Query, and Zustand working together.

## Overview

The Hello World example is a complete end-to-end demonstration that validates the entire boilerplate stack:

- **Backend**: tRPC endpoint creation with input validation
- **Frontend**: tRPC client queries with React Query caching
- **State Management**: Zustand for client-side state
- **Type Safety**: Full TypeScript inference from backend to frontend

Visit **http://localhost:3000** to see the Hello World component on the home page.

## What It Demonstrates

### 1. tRPC Backend Endpoints (`apps/backend/src/trpc/routers/hello.router.ts`)

```typescript
// Simple query - returns static data
hello.getHello()

// Query with input validation - returns dynamic data
hello.getCustomHello({ name: "World" })
```

**Key patterns:**
- Public procedures (no authentication required)
- Input validation with Zod schemas
- TypeScript return types automatically inferred by frontend

### 2. Zustand Client State Store (`apps/frontend/src/stores/helloStore.ts`)

```typescript
interface HelloState {
  message: string;
  count: number;
  setMessage: (message: string) => void;
  incrementCount: () => void;
  reset: () => void;
}
```

**Key patterns:**
- Lightweight, boilerplate-free state management
- No Redux-like actions or reducers
- Full TypeScript type safety
- Automatic state updates

### 3. Frontend Component (`apps/frontend/src/components/HelloWorld.tsx`)

The component demonstrates:

- **tRPC Query Integration**: Calling backend procedures with React Query
- **Server State Caching**: React Query automatically caches responses
- **Client State Updates**: Updating Zustand when server data arrives
- **Loading/Error States**: Professional UX patterns
- **Input Validation**: Frontend validation with Zod schemas
- **Manual State Changes**: Pure client-side state updates

### 4. Home Page Integration (`apps/frontend/src/routes/index.tsx`)

The Hello World component is rendered on the home page, making it visible immediately when visiting http://localhost:3000.

## Component Features

### Zustand State Display
Shows the current message stored in client state and the update counter that increments each time the message changes.

### Simple Hello Query
Demonstrates fetching from a static tRPC endpoint. Try clicking "Fetch Hello Message" twice to see React Query caching - the second request completes instantly without hitting the server.

### Personalized Greeting
Shows how to:
- Accept user input
- Validate input before sending
- Pass input to tRPC procedures
- Handle dynamic responses

### Pure Client State
A button that increments the counter without any server interaction, demonstrating true client-side state management with Zustand.

## Architecture

```
Component (HelloWorld.tsx)
    ↓
Zustand Store (helloStore.ts) ← Client State
    ↓
tRPC Client (lib/trpc.ts) ← Server State
    ↓
React Query (httpBatchLink)
    ↓
Backend tRPC Router (hello.router.ts)
    ↓
Response
```

## State Management Strategy

### React Query (Server State)
- Caches API responses
- Handles data synchronization
- Manages refetch/invalidation
- Used via tRPC client

### Zustand (Client State)
- Manages UI state (messages, counters)
- No server communication
- Simple, lightweight store
- Great for local state that doesn't need sync

### localStorage (Persistent State)
- Authentication tokens (already implemented)
- Could store user preferences

### Component State
- Form inputs (`useState`)
- Loading/error UI state

## Code Snippets

### Calling a tRPC Query

```typescript
// From HelloWorld.tsx
const getHelloQuery = trpc.hello.getHello.useQuery();

// Trigger the query
getHelloQuery.refetch().then((result) => {
  if (result.data) {
    setMessage(result.data.message);
  }
});
```

### Using Zustand Store

```typescript
const { message, count, setMessage, incrementCount, reset } = useHelloStore();

// Update message (increments count automatically)
setMessage("New message");

// Just increment
incrementCount();

// Reset everything
reset();
```

### Creating tRPC Endpoint

```typescript
export const helloRouter = router({
  getHello: publicProcedure.query(async () => {
    return {
      message: 'Hello World from tRPC!',
      timestamp: new Date(),
    };
  }),

  getCustomHello: publicProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .query(async ({ input }) => {
      return {
        message: `Hello, ${input.name}!`,
        timestamp: new Date(),
      };
    }),
});
```

## Testing Locally

### 1. Prerequisites

Ensure the Prisma client is generated (this is a pre-existing boilerplate setup requirement):

```bash
cd apps/backend
pnpm db:generate
```

### 2. Start Development Servers

```bash
pnpm dev
```

Expected output:
- Backend: http://localhost:4000
- Frontend: http://localhost:3001 (or next available port)

### 3. Verify in Browser

Navigate to http://localhost:3001 and:

- [ ] Hello World component appears below the boilerplate intro
- [ ] Click "Fetch Hello Message" button
  - [ ] Server message displays in green
  - [ ] Zustand counter increments in "Client State" section
  - [ ] Click again - response is instant (React Query caching)
- [ ] Enter name and click "Send" button
  - [ ] Custom greeting displays
  - [ ] Counter increments again
- [ ] Click "Increment Counter (Client Only)" button
  - [ ] Counter increments without server call
- [ ] Click "Reset Everything"
  - [ ] All state clears
- [ ] Check browser console for no errors

### 4. Browser DevTools

**React Query DevTools** (if installed):
- DevTools shows cached queries
- Notice "Simple Hello Query" is cached after first fetch

**Network Tab**:
- First fetch to `/trpc/hello.getHello`: Response from server
- Second fetch: May show from cache
- Custom greetings: Each unique name makes a request

## Common Patterns to Learn

### Pattern 1: Fetch and Update Local State

```typescript
const handleFetchHello = () => {
  getHelloQuery.refetch().then((result) => {
    if (result.data) {
      setMessage(result.data.message); // Update Zustand
    }
  });
};
```

### Pattern 2: Input Validation

```typescript
const [error, setError] = useState('');

const handleFetchCustomHello = () => {
  if (!customName.trim()) {
    setError('Please enter a name');
    return;
  }
  // Proceed with fetch
};
```

### Pattern 3: Loading States

```typescript
<Button disabled={getHelloQuery.isPending}>
  {getHelloQuery.isPending ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Fetching...
    </>
  ) : (
    'Fetch Hello Message'
  )}
</Button>
```

### Pattern 4: Error Handling

```typescript
{getHelloQuery.error && (
  <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
    Error: {getHelloQuery.error.message}
  </div>
)}
```

## Extending the Example

### Add Authentication

The `hello` router uses `publicProcedure`. To require authentication:

```typescript
import { protectedProcedure } from '../trpc';

export const helloRouter = router({
  getAuthenticatedHello: protectedProcedure.query(async ({ ctx }) => {
    return {
      message: `Hello, ${ctx.user.email}!`,
      timestamp: new Date(),
    };
  }),
});
```

### Add Database Access

```typescript
export const helloRouter = router({
  countHelloRequests: publicProcedure.query(async ({ ctx }) => {
    const count = await ctx.prisma.helloLog.count();
    return { count };
  }),
});
```

### Add Mutations

```typescript
export const helloRouter = router({
  setMessage: publicProcedure
    .input(z.object({ message: z.string() }))
    .mutation(async ({ input }) => {
      // Store in database, call external API, etc.
      return { success: true };
    }),
});
```

## Troubleshooting

### Component Not Showing

**Issue**: Hello World component doesn't appear on home page

**Solution**:
- Verify `HelloWorld.tsx` is created in `apps/frontend/src/components/`
- Check that it's imported in `apps/frontend/src/routes/index.tsx`
- Ensure there are no import errors in browser console

### Buttons Not Working

**Issue**: Click handlers don't work

**Solution**:
- Check browser console for errors
- Verify backend is running on http://localhost:4000
- Check that `VITE_API_URL` is set correctly in frontend

### TypeScript Errors

**Issue**: TypeScript complains about missing types

**Solution**:
```bash
cd apps/backend
pnpm db:generate

cd apps/frontend
pnpm type-check
```

### Zustand State Not Updating

**Issue**: Counter doesn't increment when message is fetched

**Solution**:
- Check that `useHelloStore` hook is called correctly
- Verify Zustand store file exists at `apps/frontend/src/stores/helloStore.ts`
- Check browser console for errors

## Further Reading

- [tRPC Documentation](https://trpc.io/docs/v10)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Zod Validation](https://zod.dev)
- [Backend Guide](./BACKEND_GUIDE.md) - More about tRPC routers
- [Frontend Guide](./FRONTEND_GUIDE.md) - More about React patterns
- [Architecture](./ARCHITECTURE.md) - System design overview

## Success Criteria

You've successfully understood the Hello World example when you can:

1. ✅ Explain what each component (HelloWorld, helloStore, hello.router) does
2. ✅ Modify the tRPC response and see changes in the frontend instantly
3. ✅ Add a new button to the HelloWorld component
4. ✅ Call a tRPC endpoint from the new button
5. ✅ Update Zustand state from the response
6. ✅ Understand the difference between server state (React Query) and client state (Zustand)

## Next Steps

After mastering the Hello World example:

1. Create your own tRPC router for your domain model
2. Build components that use multiple tRPC queries
3. Implement mutations (create, update, delete)
4. Add database integration with Prisma
5. Use authentication with protected procedures
6. See [Spinning Up New Project](./SPINNING_UP_NEW_PROJECT.md) for template usage
