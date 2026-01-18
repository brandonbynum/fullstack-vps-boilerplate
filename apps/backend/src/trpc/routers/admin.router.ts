import { z } from 'zod';
import { router, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import {
  listUsersQuerySchema,
  updateUserRoleSchema,
  toggleUserStatusSchema,
} from '@fullstack-boilerplate/validators';

export const adminRouter = router({
  // List all users with pagination
  listUsers: adminProcedure
    .input(listUsersQuerySchema)
    .query(async ({ ctx, input }) => {
      const { page, limit, search, role, isActive } = input;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      if (search) {
        where.email = { contains: search, mode: 'insensitive' };
      }
      if (role) {
        where.role = role;
      }
      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const [users, total] = await Promise.all([
        ctx.prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        ctx.prisma.user.count({ where }),
      ]);

      return {
        users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  // Get single user details
  getUser: adminProcedure
    .input(z.object({ userId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { sessions: true },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return user;
    }),

  // Update user role
  updateUserRole: adminProcedure
    .input(updateUserRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId, role } = input;

      // Prevent admin from demoting themselves
      if (userId === ctx.user.userId && role !== 'ADMIN') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot change your own role',
        });
      }

      const user = await ctx.prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    }),

  // Toggle user active status
  toggleUserStatus: adminProcedure
    .input(toggleUserStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId } = input;

      // Prevent admin from deactivating themselves
      if (userId === ctx.user.userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot deactivate your own account',
        });
      }

      const currentUser = await ctx.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!currentUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      const user = await ctx.prisma.user.update({
        where: { id: userId },
        data: { isActive: !currentUser.isActive },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // If deactivating, also delete all their sessions
      if (!user.isActive) {
        await ctx.prisma.session.deleteMany({
          where: { userId },
        });
      }

      return user;
    }),

  // Delete user
  deleteUser: adminProcedure
    .input(z.object({ userId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = input;

      // Prevent admin from deleting themselves
      if (userId === ctx.user.userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot delete your own account',
        });
      }

      await ctx.prisma.user.delete({
        where: { id: userId },
      });

      return { message: 'User deleted successfully' };
    }),

  // Get dashboard stats
  getStats: adminProcedure.query(async ({ ctx }) => {
    const [totalUsers, activeUsers, admins, recentLogins] = await Promise.all([
      ctx.prisma.user.count(),
      ctx.prisma.user.count({ where: { isActive: true } }),
      ctx.prisma.user.count({ where: { role: 'ADMIN' } }),
      ctx.prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      admins,
      regularUsers: totalUsers - admins,
      recentLogins,
    };
  }),
});

export type AdminRouter = typeof adminRouter;
