import { z } from 'zod';

// User Role Enum
export const userRoleSchema = z.enum(['USER', 'ADMIN']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User Schema
export const userSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  role: userRoleSchema,
  isActive: z.boolean(),
  lastLoginAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof userSchema>;

// Update User Role
export const updateUserRoleSchema = z.object({
  userId: z.string().cuid(),
  role: userRoleSchema,
});

export type UpdateUserRole = z.infer<typeof updateUserRoleSchema>;

// Toggle User Status
export const toggleUserStatusSchema = z.object({
  userId: z.string().cuid(),
});

export type ToggleUserStatus = z.infer<typeof toggleUserStatusSchema>;

// List Users Query
export const listUsersQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

// List Users Response
export const listUsersResponseSchema = z.object({
  users: z.array(userSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});

export type ListUsersResponse = z.infer<typeof listUsersResponseSchema>;
