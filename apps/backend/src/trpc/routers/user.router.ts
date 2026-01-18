import { router, protectedProcedure } from '../trpc';

export const userRouter = router({
  // Get current user profile
  getProfile: protectedProcedure.query(async ({ ctx }) => {
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

    return user;
  }),

  // Get user's active sessions count
  getSessionsCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.prisma.session.count({
      where: {
        userId: ctx.user.userId,
        expiresAt: { gte: new Date() },
      },
    });

    return { count };
  }),
});

export type UserRouter = typeof userRouter;
