import { useCallback, useMemo } from 'react';
import { trpc } from '../lib/trpc';
import { queryClient } from '../lib/query-client';

export interface AuthUser {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export function useAuth() {
  // Get current user
  const { data: user, isLoading, error, refetch } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    enabled: !!localStorage.getItem('accessToken'),
  });

  // Request magic link mutation
  const requestMagicLinkMutation = trpc.auth.requestMagicLink.useMutation();

  // Verify magic link mutation
  const verifyMagicLinkMutation = trpc.auth.verifyMagicLink.useMutation({
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      queryClient.invalidateQueries();
    },
  });

  // Refresh token mutation
  const refreshTokenMutation = trpc.auth.refreshToken.useMutation({
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
    },
  });

  // Logout mutation
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      queryClient.clear();
    },
  });

  // Request magic link
  const requestMagicLink = useCallback(
    async (email: string) => {
      return requestMagicLinkMutation.mutateAsync({ email });
    },
    [requestMagicLinkMutation]
  );

  // Verify magic link
  const verifyMagicLink = useCallback(
    async (token: string) => {
      return verifyMagicLinkMutation.mutateAsync({ token });
    },
    [verifyMagicLinkMutation]
  );

  // Logout
  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await logoutMutation.mutateAsync({ refreshToken });
    } else {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      queryClient.clear();
    }
  }, [logoutMutation]);

  // Refresh access token
  const refreshAccessToken = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token');
    }
    return refreshTokenMutation.mutateAsync({ refreshToken });
  }, [refreshTokenMutation]);

  const isAuthenticated = useMemo(() => !!user, [user]);
  const isAdmin = useMemo(() => user?.role === 'ADMIN', [user]);

  return {
    user: user as AuthUser | null | undefined,
    isLoading,
    error,
    isAuthenticated,
    isAdmin,
    requestMagicLink,
    verifyMagicLink,
    logout,
    refreshAccessToken,
    refetch,
    isPending: {
      requestMagicLink: requestMagicLinkMutation.isPending,
      verifyMagicLink: verifyMagicLinkMutation.isPending,
      logout: logoutMutation.isPending,
    },
  };
}
