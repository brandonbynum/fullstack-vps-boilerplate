import { Link } from '@tanstack/react-router';
import { Button } from '../ui/button';
import { ThemeToggle } from '../ui/theme-toggle';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, User, Settings, Shield } from 'lucide-react';

export function Header() {
  const { user, isAuthenticated, isAdmin, logout, isPending } = useAuth();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl">App</span>
          </Link>
          {isAuthenticated && (
            <nav className="flex items-center gap-4 text-sm">
              <Link
                to="/dashboard"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              )}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                {user?.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                disabled={isPending.logout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isPending.logout ? 'Logging out...' : 'Logout'}
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
