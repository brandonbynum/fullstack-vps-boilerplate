import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

export const helloRouter = router({
  /**
   * Simple hello world endpoint that demonstrates tRPC basics.
   * This shows how to create a public query that returns static data.
   */
  getHello: publicProcedure.query(async () => {
    return {
      message: 'Hello World from tRPC!',
      timestamp: new Date(),
    };
  }),

  /**
   * Personalized greeting endpoint that accepts input validation.
   * This demonstrates:
   * - Input validation with Zod schemas
   * - Dynamic data based on user input
   * - Error handling for invalid input
   */
  getCustomHello: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
      })
    )
    .query(async ({ input }) => {
      return {
        message: `Hello, ${input.name}! Welcome to tRPC with React Query.`,
        timestamp: new Date(),
      };
    }),
});
