import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useHelloStore } from '../stores/helloStore';
import { trpc } from '../lib/trpc';
import { Loader2, RotateCcw, Send } from 'lucide-react';

/**
 * HelloWorld Component - Demonstrates full stack integration
 *
 * This component showcases:
 * 1. tRPC Integration - Calling backend procedures with React Query
 * 2. Zustand State Management - Client-side state management
 * 3. Server + Client State - Combining server data with client state
 * 4. Loading and Error States - Proper UX for async operations
 */
export function HelloWorld() {
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState('');

  // Zustand store for client state
  const { message, count, setMessage, incrementCount, reset } = useHelloStore();

  // tRPC queries
  const getHelloQuery = trpc.hello.getHello.useQuery();
  const getCustomHelloQuery = trpc.hello.getCustomHello.useQuery(
    { name: customName },
    { enabled: false } // Disable auto-fetch, we'll trigger manually
  );

  // Handle fetching the hello message
  const handleFetchHello = () => {
    setError('');
    if (getHelloQuery.isLoading) return;

    getHelloQuery.refetch().then((result) => {
      if (result.data) {
        // Update Zustand store with server message
        setMessage(result.data.message);
      }
    });
  };

  // Handle fetching custom greeting
  const handleFetchCustomHello = () => {
    setError('');

    if (!customName.trim()) {
      setError('Please enter a name');
      return;
    }

    getCustomHelloQuery.refetch().then((result) => {
      if (result.data) {
        // Update Zustand store with custom server message
        setMessage(result.data.message);
        setCustomName('');
      }
    });
  };

  // Handle manual count increment (pure client state)
  const handleIncrementCount = () => {
    incrementCount();
  };

  // Handle reset
  const handleReset = () => {
    reset();
    getHelloQuery.remove();
    getCustomHelloQuery.remove();
    setError('');
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Hello World Example</h2>
        <p className="text-muted-foreground mt-2">
          Full-stack integration demo: tRPC + React Query + Zustand
        </p>
      </div>

      {/* Zustand State Display */}
      <Card>
        <CardHeader>
          <CardTitle>Client State (Zustand)</CardTitle>
          <CardDescription>
            Managed by Zustand for pure client-side state
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Message</Label>
            <div className="p-3 bg-secondary/50 rounded-md min-h-[40px] flex items-center">
              {message ? (
                <p className="text-sm font-medium">{message}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No message yet. Fetch one below.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Update Counter
            </Label>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-lg px-3 py-1">
                {count}
              </Badge>
              <span className="text-xs text-muted-foreground">
                increments when message is updated
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simple Hello Query */}
      <Card>
        <CardHeader>
          <CardTitle>Simple Hello Query</CardTitle>
          <CardDescription>
            Demonstrates basic tRPC query with React Query caching
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This endpoint returns a static message. Try clicking fetch twice to see React Query caching in action.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleFetchHello}
              disabled={getHelloQuery.isPending}
              className="w-full"
            >
              {getHelloQuery.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                'Fetch Hello Message'
              )}
            </Button>
          </div>

          {getHelloQuery.error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
              Error: {getHelloQuery.error.message}
            </div>
          )}

          {getHelloQuery.data && (
            <div className="p-3 bg-green-500/10 text-green-700 text-sm rounded-md">
              <p className="font-medium">Server Response:</p>
              <p>{getHelloQuery.data.message}</p>
              <p className="text-xs mt-1 opacity-70">
                {new Date(getHelloQuery.data.timestamp).toLocaleTimeString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Hello Query */}
      <Card>
        <CardHeader>
          <CardTitle>Personalized Greeting</CardTitle>
          <CardDescription>
            Demonstrates input validation and dynamic responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="custom-name">Your Name</Label>
            <div className="flex gap-2">
              <Input
                id="custom-name"
                placeholder="Enter your name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleFetchCustomHello();
                  }
                }}
                disabled={getCustomHelloQuery.isPending}
              />
              <Button
                onClick={handleFetchCustomHello}
                disabled={getCustomHelloQuery.isPending || !customName.trim()}
                className="gap-2"
              >
                {getCustomHelloQuery.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}

          {getCustomHelloQuery.error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
              Error: {getCustomHelloQuery.error.message}
            </div>
          )}

          {getCustomHelloQuery.data && (
            <div className="p-3 bg-blue-500/10 text-blue-700 text-sm rounded-md">
              <p className="font-medium">Server Response:</p>
              <p>{getCustomHelloQuery.data.message}</p>
              <p className="text-xs mt-1 opacity-70">
                {new Date(getCustomHelloQuery.data.timestamp).toLocaleTimeString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client-Only State Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Pure Client State</CardTitle>
          <CardDescription>
            Increment counter without server interaction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This button directly updates Zustand state without any server calls. Notice the counter update above.
          </p>

          <Button onClick={handleIncrementCount} variant="secondary" className="w-full">
            Increment Counter (Client Only)
          </Button>
        </CardContent>
      </Card>

      {/* Reset Button */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={handleReset}
            variant="outline"
            className="w-full gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Everything
          </Button>
        </CardContent>
      </Card>

      {/* Info Section */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">What This Demonstrates</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>
                <strong>tRPC + React Query:</strong> Type-safe server queries with automatic caching
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>
                <strong>Zustand State:</strong> Lightweight client state management
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>
                <strong>Input Validation:</strong> Zod schemas for type safety
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>
                <strong>Loading & Error States:</strong> Professional UX patterns
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>
                <strong>React Query Caching:</strong> Second requests are instant
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
