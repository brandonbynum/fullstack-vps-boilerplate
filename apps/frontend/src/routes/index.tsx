import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '../components/ui/button';
import { useAuth } from '../hooks/useAuth';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="container py-16">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
          Full-Stack Boilerplate
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Production-ready starter with React, TypeScript, tRPC, Prisma,
          TanStack Router, Tailwind CSS, and shadcn/ui.
          Magic link authentication included.
        </p>
        <div className="flex gap-4 justify-center">
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button size="lg">Go to Dashboard</Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button size="lg">Get Started</Button>
            </Link>
          )}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="lg">
              View on GitHub
            </Button>
          </a>
        </div>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">Type-Safe</h3>
            <p className="text-sm text-muted-foreground">
              End-to-end TypeScript with tRPC and Prisma
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">Passwordless Auth</h3>
            <p className="text-sm text-muted-foreground">
              Magic link authentication for secure, easy login
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">Production Ready</h3>
            <p className="text-sm text-muted-foreground">
              Docker, CI/CD, security headers, and more
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
