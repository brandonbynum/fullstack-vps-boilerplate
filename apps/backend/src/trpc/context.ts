import { inferAsyncReturnType } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { prisma } from '../config/database';
import { tokenService, AccessTokenPayload } from '../services/token.service';

export interface Context {
  prisma: typeof prisma;
  user: AccessTokenPayload | null;
}

export async function createContext({
  req,
}: CreateExpressContextOptions): Promise<Context> {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  let user: AccessTokenPayload | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    user = tokenService.verifyAccessToken(token);
  }

  return {
    prisma,
    user,
  };
}

export type TRPCContext = inferAsyncReturnType<typeof createContext>;
