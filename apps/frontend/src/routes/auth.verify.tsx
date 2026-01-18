import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export const Route = createFileRoute('/auth/verify')({
  component: VerifyMagicLinkPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: (search.token as string) || '',
    };
  },
});

function VerifyMagicLinkPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const { verifyMagicLink, isPending } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setError('Invalid or missing token');
        return;
      }

      try {
        await verifyMagicLink(token);
        setStatus('success');
        setTimeout(() => {
          navigate({ to: '/dashboard' });
        }, 2000);
      } catch (err: any) {
        setStatus('error');
        setError(err.message || 'Failed to verify magic link');
      }
    };

    verify();
  }, [token, verifyMagicLink, navigate]);

  return (
    <div className="container py-16 flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === 'loading' && (
            <>
              <div className="mx-auto mb-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <CardTitle>Verifying...</CardTitle>
              <CardDescription>
                Please wait while we verify your magic link
              </CardDescription>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="mx-auto mb-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle>Success!</CardTitle>
              <CardDescription>
                You've been logged in. Redirecting to dashboard...
              </CardDescription>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="mx-auto mb-4">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle>Verification Failed</CardTitle>
              <CardDescription>{error}</CardDescription>
            </>
          )}
        </CardHeader>
        {status === 'error' && (
          <CardContent className="text-center">
            <Button onClick={() => navigate({ to: '/login' })}>
              Back to Login
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
