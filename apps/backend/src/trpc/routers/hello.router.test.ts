import { describe, it, expect } from 'vitest';
import { helloRouter } from './hello.router';

/**
 * Unit tests for Hello Router
 *
 * This demonstrates testing tRPC procedures with vitest.
 * Tests verify:
 * - Query execution
 * - Input validation
 * - Response structure
 */

describe('Hello Router', () => {
  describe('getHello', () => {
    it('should return a hello message', async () => {
      // Get the procedure
      const caller = helloRouter.createCaller({ prisma: {} as any, user: null });

      // Call the procedure
      const result = await caller.getHello();

      // Assert response structure
      expect(result).toBeDefined();
      expect(result.message).toBe('Hello World from tRPC!');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should have valid response format', async () => {
      const caller = helloRouter.createCaller({ prisma: {} as any, user: null });
      const result = await caller.getHello();

      // Verify all expected fields exist
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    });
  });

  describe('getCustomHello', () => {
    it('should return a personalized greeting for valid input', async () => {
      const caller = helloRouter.createCaller({ prisma: {} as any, user: null });

      const result = await caller.getCustomHello({ name: 'Alice' });

      expect(result).toBeDefined();
      expect(result.message).toContain('Alice');
      expect(result.message).toContain('Hello');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should work with different names', async () => {
      const caller = helloRouter.createCaller({ prisma: {} as any, user: null });

      const testCases = ['Bob', 'Charlie', 'Diana', 'Eve'];

      for (const name of testCases) {
        const result = await caller.getCustomHello({ name });
        expect(result.message).toContain(name);
      }
    });

    it('should reject empty name', async () => {
      const caller = helloRouter.createCaller({ prisma: {} as any, user: null });

      // Expect the call to throw validation error
      await expect(
        caller.getCustomHello({ name: '' })
      ).rejects.toThrow();
    });

    it('should reject name longer than 100 characters', async () => {
      const caller = helloRouter.createCaller({ prisma: {} as any, user: null });

      const longName = 'a'.repeat(101);

      // Expect the call to throw validation error
      await expect(
        caller.getCustomHello({ name: longName })
      ).rejects.toThrow();
    });

    it('should accept name at maximum length (100 characters)', async () => {
      const caller = helloRouter.createCaller({ prisma: {} as any, user: null });

      const maxName = 'a'.repeat(100);

      const result = await caller.getCustomHello({ name: maxName });

      expect(result).toBeDefined();
      expect(result.message).toContain(maxName);
    });

    it('should handle special characters in names', async () => {
      const caller = helloRouter.createCaller({ prisma: {} as any, user: null });

      const specialNames = [
        'José',
        'François',
        '李明',
        "O'Brien",
      ];

      for (const name of specialNames) {
        const result = await caller.getCustomHello({ name });
        expect(result.message).toContain(name);
      }
    });
  });

  describe('Response Format', () => {
    it('should include valid ISO timestamp', async () => {
      const caller = helloRouter.createCaller({ prisma: {} as any, user: null });

      const result = await caller.getHello();

      // Verify timestamp is valid and parseable
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(!isNaN(result.timestamp.getTime())).toBe(true);

      // Verify timestamp is recent (within last minute)
      const now = new Date();
      const timeDiff = now.getTime() - result.timestamp.getTime();
      expect(timeDiff).toBeLessThan(60000); // 1 minute
      expect(timeDiff).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Multiple Calls', () => {
    it('should consistently return the same static message', async () => {
      const caller = helloRouter.createCaller({ prisma: {} as any, user: null });

      const result1 = await caller.getHello();
      const result2 = await caller.getHello();
      const result3 = await caller.getHello();

      expect(result1.message).toBe(result2.message);
      expect(result2.message).toBe(result3.message);
    });

    it('should return different timestamps on multiple calls', async () => {
      const caller = helloRouter.createCaller({ prisma: {} as any, user: null });

      const result1 = await caller.getHello();
      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      const result2 = await caller.getHello();

      expect(result1.timestamp.getTime()).not.toBe(result2.timestamp.getTime());
    });
  });
});
