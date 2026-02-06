import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { UserRole } from '@prisma/client';

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access';
}

export interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
}

export interface MagicLinkTokenPayload {
  email: string;
  type: 'magic-link';
  nonce: string;
}

class TokenService {
  // Generate a secure random token for magic links
  generateMagicLinkToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate JWT access token (15 minutes)
  generateAccessToken(userId: string, email: string, role: UserRole): string {
    const payload: AccessTokenPayload = {
      userId,
      email,
      role,
      type: 'access',
    };
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY as any,
    });
  }

  // Generate JWT refresh token (7 days)
  generateRefreshToken(userId: string): string {
    const payload: RefreshTokenPayload = {
      userId,
      type: 'refresh',
    };
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRY as any,
    });
  }

  // Verify access token
  verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
      if (payload.type !== 'access') return null;
      return payload;
    } catch {
      return null;
    }
  }

  // Verify refresh token
  verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const payload = jwt.verify(
        token,
        env.JWT_REFRESH_SECRET
      ) as RefreshTokenPayload;
      if (payload.type !== 'refresh') return null;
      return payload;
    } catch {
      return null;
    }
  }

  // Generate expiry date for magic links (5 minutes)
  getMagicLinkExpiry(): Date {
    return new Date(Date.now() + env.MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);
  }

  // Generate expiry date for refresh tokens (7 days)
  getRefreshTokenExpiry(): Date {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  // Generate both access and refresh tokens
  generateTokenPair(
    userId: string,
    email: string,
    role: UserRole
  ): { accessToken: string; refreshToken: string } {
    return {
      accessToken: this.generateAccessToken(userId, email, role),
      refreshToken: this.generateRefreshToken(userId),
    };
  }
}

export const tokenService = new TokenService();
