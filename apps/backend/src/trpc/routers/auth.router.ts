import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { authService } from '../../services/auth.service';
import {
  magicLinkRequestSchema,
  magicLinkVerifySchema,
  tokenRefreshSchema,
} from '@fullstack-boilerplate/validators';

export const authRouter = router({
  // Request magic link (public)
  requestMagicLink: publicProcedure
    .input(magicLinkRequestSchema)
    .mutation(async ({ input }) => {
      return authService.requestMagicLink(input.email);
    }),

  // Verify magic link and get tokens (public)
  verifyMagicLink: publicProcedure
    .input(magicLinkVerifySchema)
    .mutation(async ({ input }) => {
      return authService.verifyMagicLink(input.token);
    }),

  // Refresh access token (public - uses refresh token)
  refreshToken: publicProcedure
    .input(tokenRefreshSchema)
    .mutation(async ({ input }) => {
      return authService.refreshToken(input.refreshToken);
    }),

  // Get current user (protected)
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return null;
    }

    return user;
  }),

  // Logout current session (public - uses refresh token)
  logout: publicProcedure
    .input(z.object({ refreshToken: z.string() }))
    .mutation(async ({ input }) => {
      return authService.logout(input.refreshToken);
    }),

  // Logout all sessions (protected)
  logoutAll: protectedProcedure.mutation(async ({ ctx }) => {
    return authService.logoutAll(ctx.user.userId);
  }),
});

export type AuthRouter = typeof authRouter;
