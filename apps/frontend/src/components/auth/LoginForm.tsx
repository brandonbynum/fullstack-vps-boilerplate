import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useAuth } from '../../hooks/useAuth';
import { trpc } from '../../lib/trpc';
import { Mail, Loader2, AlertCircle, Settings } from 'lucide-react';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { requestMagicLink, isPending } = useAuth();

  // Check if email service is configured
  const { data: emailStatus } = trpc.auth.getEmailStatus.useQuery();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    try {
      await requestMagicLink(email);
      setSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a magic link to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>Click the link in the email to sign in.</p>
          <p className="mt-2">The link expires in 5 minutes.</p>
          <Button
            variant="link"
            className="mt-4"
            onClick={() => {
              setSuccess(false);
              setEmail('');
            }}
          >
            Use a different email
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isEmailConfigured = emailStatus?.isConfigured ?? true; // Default to true while loading
  const emailConfigMessage = emailStatus?.message;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>
          Enter your email to receive a magic login link
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isEmailConfigured && emailConfigMessage && (
          <Alert variant="warning" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Email Not Configured</AlertTitle>
            <AlertDescription>
              {emailConfigMessage}
              {emailConfigMessage.includes('.env') && (
                <div className="mt-2 flex items-center gap-1 text-xs">
                  <Settings className="h-3 w-3" />
                  <span>
                    Configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM
                  </span>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isPending.requestMagicLink || !isEmailConfigured}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={isPending.requestMagicLink || !isEmailConfigured}
          >
            {isPending.requestMagicLink ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send magic link
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
