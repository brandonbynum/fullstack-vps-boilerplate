# Contributing Guide

Thank you for your interest in contributing to this project!

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/yourusername/fullstack-boilerplate.git
   ```
3. Set up development environment:
   ```bash
   cd fullstack-boilerplate
   ./scripts/setup-dev.sh
   ```

## Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `test/` - Test additions/fixes

Example: `feature/add-password-reset`

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting (no code change)
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance

Examples:
```
feat(auth): add password reset flow
fix(api): handle null user in session
docs(readme): update installation steps
refactor(trpc): extract common middleware
```

### Pull Request Process

1. Create a feature branch:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make your changes

3. Run checks:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build
   ```

4. Commit changes:
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

5. Push and create PR:
   ```bash
   git push origin feature/my-feature
   ```

6. Fill out the PR template

## Code Style

### TypeScript

- Use explicit types for function parameters
- Prefer interfaces over types for objects
- Use `const` by default, `let` when needed
- No `any` unless absolutely necessary

```typescript
// Good
function createUser(email: string): Promise<User> {
  // ...
}

// Avoid
function createUser(email) {
  // ...
}
```

### React

- Use functional components
- Use hooks for state and effects
- Colocate components with their routes

```tsx
// Good
function UserProfile({ userId }: { userId: string }) {
  const { data } = trpc.user.get.useQuery({ id: userId })
  return <div>{data?.name}</div>
}

// Avoid class components
```

### Imports

Order imports:
1. External packages
2. Internal packages (@fullstack/*)
3. Local imports (relative paths)

```typescript
// External
import { useState } from 'react'
import { z } from 'zod'

// Internal packages
import { userSchema } from '@fullstack/validators'

// Local
import { trpc } from '../lib/trpc'
import { Button } from '../components/ui/button'
```

### File Structure

- One component per file
- Name files after their default export
- Use index.ts for re-exports

```
components/
  ui/
    button.tsx       # Button component
    card.tsx         # Card component
    index.ts         # Re-exports
  auth/
    LoginForm.tsx    # LoginForm component
```

## Testing

### Unit Tests

```typescript
// __tests__/auth.service.test.ts
describe('AuthService', () => {
  describe('requestMagicLink', () => {
    it('should create magic link for valid email', async () => {
      const result = await authService.requestMagicLink('test@example.com')
      expect(result.success).toBe(true)
    })

    it('should fail for invalid email', async () => {
      await expect(
        authService.requestMagicLink('invalid')
      ).rejects.toThrow()
    })
  })
})
```

### Integration Tests

```typescript
// __tests__/auth.router.test.ts
describe('auth router', () => {
  it('should request magic link', async () => {
    const caller = appRouter.createCaller({ prisma, user: null })
    const result = await caller.auth.requestMagicLink({
      email: 'test@example.com'
    })
    expect(result.success).toBe(true)
  })
})
```

## Documentation

- Update relevant docs when changing features
- Use clear, concise language
- Include code examples
- Keep markdown properly formatted

## Review Checklist

Before submitting PR:

- [ ] Code follows style guide
- [ ] Tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Types check (`pnpm typecheck`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Documentation updated (if needed)
- [ ] No console.log statements
- [ ] No commented-out code
- [ ] Meaningful commit messages

## Getting Help

- Open an issue for bugs
- Use discussions for questions
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.
