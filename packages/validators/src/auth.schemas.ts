import { z } from 'zod';

// Magic Link Request
export const magicLinkRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;

// Magic Link Verify
export const magicLinkVerifySchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type MagicLinkVerify = z.infer<typeof magicLinkVerifySchema>;

// Token Refresh
export const tokenRefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type TokenRefresh = z.infer<typeof tokenRefreshSchema>;

// Auth Response
export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    role: z.enum(['USER', 'ADMIN']),
    isActive: z.boolean(),
    createdAt: z.date(),
  }),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
