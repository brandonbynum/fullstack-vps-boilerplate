import { prisma } from '../config/database';
import { tokenService } from './token.service';
import { emailService } from './email.service';
import { logger } from '../utils/logger';
import { TRPCError } from '@trpc/server';

class AuthService {
  // Request magic link - creates magic link and sends email
  async requestMagicLink(email: string): Promise<{ message: string }> {
    try {
      // Generate token
      const token = tokenService.generateMagicLinkToken();
      const expiresAt = tokenService.getMagicLinkExpiry();

      // Find or prepare user reference
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      // Create magic link in database
      await prisma.magicLink.create({
        data: {
          token,
          email,
          expiresAt,
          userId: existingUser?.id,
        },
      });

      // Send email
      await emailService.sendMagicLinkEmail(email, token);

      logger.info(`Magic link requested for ${email}`);

      // Always return same message to prevent email enumeration
      return {
        message: 'If an account exists, a magic link has been sent to your email.',
      };
    } catch (error) {
      logger.error('Error requesting magic link:', error);
      // Still return success to prevent email enumeration
      return {
        message: 'If an account exists, a magic link has been sent to your email.',
      };
    }
  }

  // Verify magic link and authenticate user
  async verifyMagicLink(token: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      role: string;
      isActive: boolean;
      createdAt: Date;
    };
  }> {
    // Find magic link
    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!magicLink) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Invalid or expired magic link',
      });
    }

    // Check if expired
    if (magicLink.expiresAt < new Date()) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Magic link has expired',
      });
    }

    // Check if already used
    if (magicLink.usedAt) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Magic link has already been used',
      });
    }

    // Find or create user
    let user = magicLink.user;
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: magicLink.email,
        },
      });
    }

    // Check if user is active
    if (!user.isActive) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Your account has been deactivated',
      });
    }

    // Mark magic link as used
    await prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { usedAt: new Date(), userId: user.id },
    });

    // Generate tokens
    const tokens = tokenService.generateTokenPair(user.id, user.email, user.role);

    // Create session for refresh token
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: tokens.refreshToken,
        expiresAt: tokenService.getRefreshTokenExpiry(),
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info(`User ${user.email} logged in successfully`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    };
  }

  // Refresh access token
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // Verify the refresh token JWT
    const payload = tokenService.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid refresh token',
      });
    }

    // Find session in database
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Session not found',
      });
    }

    // Check if session expired
    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } });
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Session expired',
      });
    }

    // Check if user is still active
    if (!session.user.isActive) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Your account has been deactivated',
      });
    }

    // Generate new tokens
    const tokens = tokenService.generateTokenPair(
      session.user.id,
      session.user.email,
      session.user.role
    );

    // Update session with new refresh token (token rotation)
    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: tokens.refreshToken,
        expiresAt: tokenService.getRefreshTokenExpiry(),
      },
    });

    return tokens;
  }

  // Logout - invalidate session
  async logout(refreshToken: string): Promise<{ message: string }> {
    try {
      await prisma.session.delete({
        where: { refreshToken },
      });
    } catch {
      // Session might not exist, that's okay
    }

    return { message: 'Logged out successfully' };
  }

  // Logout all sessions for a user
  async logoutAll(userId: string): Promise<{ message: string }> {
    await prisma.session.deleteMany({
      where: { userId },
    });

    return { message: 'All sessions logged out successfully' };
  }
}

export const authService = new AuthService();
