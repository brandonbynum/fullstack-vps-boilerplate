# Unit Testing Guide

This guide explains the unit testing setup for the fullstack boilerplate using Vitest and React Testing Library.

## Overview

The boilerplate uses **Vitest** for fast, modern unit testing across both frontend and backend applications.

- **Backend Testing**: Vitest with Node.js environment
- **Frontend Testing**: Vitest with JSDOM environment and React Testing Library
- **Test Coverage**: Demonstrates testing patterns for Zustand stores, React components, and tRPC routers

## Setup

### Backend (`apps/backend`)

**Configuration:** `vitest.config.ts`
```typescript
{
  test: {
    globals: true,
    environment: 'node',
  }
}
```

**Dependencies:**
- `vitest` - Test runner
- `@vitest/ui` - Optional UI dashboard

### Frontend (`apps/frontend`)

**Configuration:** `vitest.config.ts`
```typescript
{
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  }
}
```

**Setup File:** `vitest.setup.ts`
- Imports `@testing-library/jest-dom`
- Provides custom matchers like `toBeInTheDocument()`

**Dependencies:**
- `vitest` - Test runner
- `@testing-library/react` - React component testing
- `@testing-library/jest-dom` - Custom matchers
- `@testing-library/user-event` - User interaction simulation
- `jsdom` - DOM environment

## Running Tests

### Run All Tests

```bash
pnpm test
```

Runs tests in watch mode. Useful during development.

### Run Tests Once

```bash
pnpm test:run
```

Runs all tests and exits. Useful for CI/CD pipelines.

### Run Tests in Specific Package

```bash
# Backend tests
cd apps/backend
pnpm test:run

# Frontend tests
cd apps/frontend
pnpm test:run
```

### View Test UI

```bash
pnpm test -- --ui
```

Opens Vitest UI dashboard at http://localhost:51204

## Backend Tests

### Hello Router Tests

**File:** `apps/backend/src/trpc/routers/hello.router.test.ts`

Tests the Hello World tRPC endpoints using `vitest` and direct procedure invocation.

#### Test Suites

1. **getHello Query**
   - ✓ Returns correct message
   - ✓ Has valid response format
   - ✓ Includes timestamp

2. **getCustomHello Query**
   - ✓ Returns personalized greeting for valid input
   - ✓ Works with different names
   - ✓ Rejects empty names (validation)
   - ✓ Rejects names longer than 100 characters
   - ✓ Accepts maximum length names (100 chars)
   - ✓ Handles special characters

3. **Response Format**
   - ✓ Includes valid ISO timestamp
   - ✓ Timestamp is recent

4. **Multiple Calls**
   - ✓ Consistently returns same static message
   - ✓ Returns different timestamps

#### Running Backend Tests

```bash
cd apps/backend
pnpm test:run

# Output:
# ✓ src/trpc/routers/hello.router.test.ts  (11 tests)
# Test Files  1 passed (1)
# Tests  11 passed (11)
```

#### Code Pattern: Testing tRPC Routers

```typescript
import { describe, it, expect } from 'vitest';
import { helloRouter } from './hello.router';

describe('Hello Router', () => {
  it('should return a hello message', async () => {
    const caller = helloRouter.createCaller({});
    const result = await caller.getHello();

    expect(result).toBeDefined();
    expect(result.message).toBe('Hello World from tRPC!');
  });
});
```

**Key Pattern:**
- Use `router.createCaller()` to get a directly-callable version of procedures
- This bypasses the HTTP layer and tests procedure logic directly
- Pass an empty object `{}` for context unless you need to mock user/database

## Frontend Tests

### Zustand Store Tests

**File:** `apps/frontend/src/stores/helloStore.test.ts`

Tests the Hello World Zustand store with comprehensive state management scenarios.

**Test Count:** 21 tests

#### Test Categories

1. **Initial State** (3 tests)
   - Empty message
   - Count of 0
   - All actions available

2. **setMessage Action** (6 tests)
   - Updates message
   - Increments count
   - Handles multiple messages
   - Handles empty strings
   - Handles long messages
   - Handles special characters

3. **incrementCount Action** (3 tests)
   - Increments without changing message
   - Works multiple times
   - Works from any starting count

4. **reset Action** (3 tests)
   - Clears message
   - Resets count to 0
   - Resets both together

5. **State Consistency** (2 tests)
   - Maintains consistency across operations
   - No unexpected side effects

6. **Edge Cases** (3 tests)
   - Handles very large counts (1000+)
   - Handles rapid sequential updates
   - State not shared between instances

#### Running Store Tests

```bash
pnpm test:run

# Output includes:
# ✓ src/stores/helloStore.test.ts  (21 tests)
```

#### Code Pattern: Testing Zustand Stores

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useHelloStore } from './helloStore';

describe('Hello Store', () => {
  beforeEach(() => {
    const { reset } = useHelloStore.getState();
    reset();
  });

  it('should update message', () => {
    const { setMessage } = useHelloStore.getState();

    setMessage('Hello, World!');

    const { message } = useHelloStore.getState();
    expect(message).toBe('Hello, World!');
  });
});
```

**Key Pattern:**
- Use `store.getState()` to access state and actions
- Call `reset()` in `beforeEach()` to isolate tests
- Test synchronous state updates directly
- Zustand stores are synchronous, so no async needed

### HelloWorld Component Tests

**File:** `apps/frontend/src/components/HelloWorld.test.tsx`

Tests the Hello World component structure, user interactions, and store integration.

**Test Count:** 26 tests

#### Test Categories

1. **Rendering** (4 tests)
   - Renders without crashing
   - Renders all sections
   - Shows empty state
   - Shows counter as 0

2. **Zustand State Display** (2 tests)
   - Shows counter from store
   - Displays message from store

3. **User Interactions** (4 tests)
   - Has increment button
   - Increments counter when clicked
   - Has reset button
   - Resets state when clicked

4. **Input Handling** (5 tests)
   - Has name input field
   - Accepts name input
   - Has send button
   - Disables send when empty
   - Enables send when filled

5. **Button Availability** (2 tests)
   - Has fetch button
   - Has increment button

6. **Accessibility** (3 tests)
   - Has labels for inputs
   - Has descriptive text
   - Has buttons for interaction

7. **Information Display** (3 tests)
   - Shows what it demonstrates
   - Shows tRPC content
   - Shows Zustand content

8. **Component Structure** (3 tests)
   - Renders main heading
   - Renders section headings
   - Renders descriptive paragraphs

#### Running Component Tests

```bash
pnpm test:run

# Output includes:
# ✓ src/components/HelloWorld.test.tsx  (26 tests)
```

#### Code Pattern: Testing React Components

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelloWorld } from './HelloWorld';

describe('HelloWorld Component', () => {
  it('should render', () => {
    render(<HelloWorld />);
    expect(screen.getByText('Hello World Example')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();

    render(<HelloWorld />);

    const button = screen.getByRole('button', { name: /Increment/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });
});
```

**Key Patterns:**
- Use `render()` to mount component
- Use `screen` queries to find elements by accessibility criteria
- Use `userEvent.setup()` and `await user.click()` for interactions
- Use `waitFor()` for async state changes
- Test through user interface, not implementation details

## Common Testing Patterns

### Testing Store Actions

```typescript
const { setMessage, message } = useHelloStore.getState();
setMessage('Hello');
expect(message).toBe('Hello');
```

### Testing Component Props and State

```typescript
render(<Component initialValue="test" />);
expect(screen.getByText('test')).toBeInTheDocument();
```

### Testing User Interactions

```typescript
const user = userEvent.setup();
await user.click(screen.getByRole('button', { name: /Click me/i }));
await waitFor(() => {
  expect(screen.getByText('Clicked!')).toBeInTheDocument();
});
```

### Testing Validation

```typescript
await expect(
  caller.getCustomHello({ name: '' })
).rejects.toThrow();
```

### Testing Async Operations

```typescript
await waitFor(() => {
  expect(screen.queryByText('Loading')).not.toBeInTheDocument();
});
```

## Debugging Tests

### Print Component Markup

```typescript
import { render, screen } from '@testing-library/react';

render(<HelloWorld />);
screen.debug(); // Prints DOM to console
```

### Print Specific Element

```typescript
const element = screen.getByText('Hello');
console.log(element.outerHTML);
```

### List All Accessible Roles

```typescript
const { container } = render(<HelloWorld />);
console.log(container.innerHTML);
```

### Run Single Test

```bash
pnpm test -- --grep "should render"
```

### Run Single File

```bash
pnpm test HelloWorld.test.tsx
```

### Watch Mode with Debugging

```bash
pnpm test -- --watch
# Then press 'p' to filter by filename
```

## Best Practices

1. **Test Behavior, Not Implementation**
   - ✓ Test what users see and do
   - ✗ Don't test internal state details

2. **Use Semantic Queries**
   - ✓ `screen.getByRole('button', { name: /Save/i })`
   - ✗ `container.querySelector('.save-btn')`

3. **Isolate Tests**
   - ✓ Reset state in `beforeEach()`
   - ✗ Rely on test execution order

4. **Keep Tests Simple**
   - ✓ One assertion per test
   - ✗ Multiple unrelated assertions

5. **Descriptive Names**
   - ✓ `should increment counter when button clicked`
   - ✗ `test button`

6. **User-Centric Testing**
   - ✓ Use `userEvent` for interactions
   - ✗ Directly call component callbacks

## Coverage

Run tests with coverage:

```bash
pnpm test:run -- --coverage
```

This generates coverage reports in:
- `coverage/` directory
- Coverage summary in console

## CI/CD Integration

Add to your CI pipeline:

```yaml
# GitHub Actions example
- name: Run Tests
  run: pnpm test:run

- name: Check Coverage
  run: pnpm test:run -- --coverage
```

## Further Reading

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library Docs](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Zustand Store Testing](https://github.com/pmndrs/zustand#testing)

## Examples in Boilerplate

The Hello World example includes complete test files demonstrating:

1. **Backend:** `hello.router.test.ts` - tRPC endpoint testing
2. **Frontend Store:** `helloStore.test.ts` - Zustand state testing
3. **Frontend Component:** `HelloWorld.test.tsx` - React component testing

These serve as templates for testing your own features.
