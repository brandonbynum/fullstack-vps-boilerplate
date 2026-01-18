import { router } from './trpc';
import { authRouter } from './routers/auth.router';
import { userRouter } from './routers/user.router';
import { adminRouter } from './routers/admin.router';

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  admin: adminRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
