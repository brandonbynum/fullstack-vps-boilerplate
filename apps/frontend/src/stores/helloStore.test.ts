import { describe, it, expect, beforeEach } from 'vitest';
import { useHelloStore } from './helloStore';

/**
 * Unit tests for Hello Store (Zustand)
 *
 * This demonstrates testing Zustand stores with vitest.
 * Tests verify:
 * - Initial state
 * - State updates
 * - Action execution
 * - Reset functionality
 */

describe('Hello Store', () => {
  beforeEach(() => {
    // Clear store before each test
    const { reset } = useHelloStore.getState();
    reset();
  });

  describe('Initial State', () => {
    it('should have empty message initially', () => {
      const { message } = useHelloStore.getState();
      expect(message).toBe('');
    });

    it('should have count of 0 initially', () => {
      const { count } = useHelloStore.getState();
      expect(count).toBe(0);
    });

    it('should provide all expected actions', () => {
      const store = useHelloStore.getState();

      expect(typeof store.setMessage).toBe('function');
      expect(typeof store.incrementCount).toBe('function');
      expect(typeof store.reset).toBe('function');
    });
  });

  describe('setMessage Action', () => {
    it('should update message', () => {
      const { setMessage, message: initialMessage } = useHelloStore.getState();

      expect(initialMessage).toBe('');

      setMessage('Hello, World!');

      const { message: updatedMessage } = useHelloStore.getState();
      expect(updatedMessage).toBe('Hello, World!');
    });

    it('should increment count when message is set', () => {
      const { setMessage, count: initialCount } = useHelloStore.getState();

      expect(initialCount).toBe(0);

      setMessage('First message');

      const { count: afterFirst } = useHelloStore.getState();
      expect(afterFirst).toBe(1);

      setMessage('Second message');

      const { count: afterSecond } = useHelloStore.getState();
      expect(afterSecond).toBe(2);
    });

    it('should handle multiple messages', () => {
      const { setMessage } = useHelloStore.getState();

      const messages = [
        'First message',
        'Second message',
        'Third message',
      ];

      messages.forEach((msg, index) => {
        setMessage(msg);
        const { message, count } = useHelloStore.getState();
        expect(message).toBe(msg);
        expect(count).toBe(index + 1);
      });
    });

    it('should handle empty strings', () => {
      const { setMessage } = useHelloStore.getState();

      setMessage('Hello');
      let { count } = useHelloStore.getState();
      expect(count).toBe(1);

      setMessage('');
      const { message, count: newCount } = useHelloStore.getState();
      expect(message).toBe('');
      expect(newCount).toBe(2);
    });

    it('should handle long messages', () => {
      const { setMessage } = useHelloStore.getState();

      const longMessage = 'a'.repeat(1000);
      setMessage(longMessage);

      const { message } = useHelloStore.getState();
      expect(message).toBe(longMessage);
      expect(message.length).toBe(1000);
    });

    it('should handle special characters', () => {
      const { setMessage } = useHelloStore.getState();

      const specialMessages = [
        'Hello! @#$%^&*()',
        'Unicode: 你好, مرحبا, שלום',
        'Newlines:\nLine 1\nLine 2',
      ];

      specialMessages.forEach((msg, index) => {
        setMessage(msg);
        const { message, count } = useHelloStore.getState();
        expect(message).toBe(msg);
        expect(count).toBe(index + 1);
      });
    });
  });

  describe('incrementCount Action', () => {
    it('should increment count without changing message', () => {
      const { setMessage, incrementCount } = useHelloStore.getState();

      setMessage('Hello');
      let { message, count } = useHelloStore.getState();
      expect(message).toBe('Hello');
      expect(count).toBe(1);

      incrementCount();

      const { message: newMessage, count: newCount } = useHelloStore.getState();
      expect(newMessage).toBe('Hello');
      expect(newCount).toBe(2);
    });

    it('should increment count multiple times', () => {
      const { incrementCount } = useHelloStore.getState();

      for (let i = 0; i < 5; i++) {
        incrementCount();
        const { count } = useHelloStore.getState();
        expect(count).toBe(i + 1);
      }
    });

    it('should work from any starting count', () => {
      const { setMessage, incrementCount } = useHelloStore.getState();

      setMessage('Message 1');
      setMessage('Message 2');
      setMessage('Message 3');

      let { count } = useHelloStore.getState();
      expect(count).toBe(3);

      incrementCount();
      incrementCount();

      const { count: finalCount } = useHelloStore.getState();
      expect(finalCount).toBe(5);
    });
  });

  describe('reset Action', () => {
    it('should clear message', () => {
      const { setMessage, reset } = useHelloStore.getState();

      setMessage('Hello');
      let { message } = useHelloStore.getState();
      expect(message).toBe('Hello');

      reset();

      const { message: resetMessage } = useHelloStore.getState();
      expect(resetMessage).toBe('');
    });

    it('should reset count to 0', () => {
      const { setMessage, reset } = useHelloStore.getState();

      setMessage('Message 1');
      setMessage('Message 2');
      let { count } = useHelloStore.getState();
      expect(count).toBe(2);

      reset();

      const { count: resetCount } = useHelloStore.getState();
      expect(resetCount).toBe(0);
    });

    it('should reset both message and count together', () => {
      const { setMessage, incrementCount, reset } = useHelloStore.getState();

      // Set up state
      setMessage('Test message');
      incrementCount();
      incrementCount();

      let state = useHelloStore.getState();
      expect(state.message).toBe('Test message');
      expect(state.count).toBe(3);

      // Reset
      reset();

      state = useHelloStore.getState();
      expect(state.message).toBe('');
      expect(state.count).toBe(0);
    });

    it('should allow setting new state after reset', () => {
      const { setMessage, reset } = useHelloStore.getState();

      setMessage('First message');
      reset();

      setMessage('Second message');

      const { message, count } = useHelloStore.getState();
      expect(message).toBe('Second message');
      expect(count).toBe(1); // Counter resets and increments once
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistent state across multiple operations', () => {
      const {
        setMessage,
        incrementCount,
        reset,
      } = useHelloStore.getState();

      // Operation 1: Set message
      setMessage('Message 1');
      let state = useHelloStore.getState();
      expect(state.message).toBe('Message 1');
      expect(state.count).toBe(1);

      // Operation 2: Increment count
      incrementCount();
      state = useHelloStore.getState();
      expect(state.message).toBe('Message 1');
      expect(state.count).toBe(2);

      // Operation 3: Set new message
      setMessage('Message 2');
      state = useHelloStore.getState();
      expect(state.message).toBe('Message 2');
      expect(state.count).toBe(3);

      // Operation 4: Reset
      reset();
      state = useHelloStore.getState();
      expect(state.message).toBe('');
      expect(state.count).toBe(0);
    });

    it('should not have unexpected side effects', () => {
      const {
        setMessage,
        incrementCount,
      } = useHelloStore.getState();

      const initialState = useHelloStore.getState();

      // Setting message should only update message and count
      setMessage('Test');

      const stateAfterSet = useHelloStore.getState();
      expect(Object.keys(stateAfterSet)).toEqual(
        Object.keys(initialState)
      );

      // Should have exactly 2 state properties + 3 action properties
      expect(Object.keys(stateAfterSet).length).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large count numbers', () => {
      const { incrementCount } = useHelloStore.getState();

      // Increment 1000 times
      for (let i = 0; i < 1000; i++) {
        incrementCount();
      }

      const { count } = useHelloStore.getState();
      expect(count).toBe(1000);
    });

    it('should handle rapid sequential updates', () => {
      const { setMessage } = useHelloStore.getState();

      // Rapidly set messages
      for (let i = 0; i < 100; i++) {
        setMessage(`Message ${i}`);
      }

      const { message, count } = useHelloStore.getState();
      expect(message).toBe('Message 99');
      expect(count).toBe(100);
    });

    it('should not share state between store instances', () => {
      const store1 = useHelloStore.getState();
      const store2 = useHelloStore.getState();

      // Both should reference the same store
      expect(store1).toBe(store2);

      // They should have the same state
      expect(store1.message).toBe(store2.message);
      expect(store1.count).toBe(store2.count);
    });
  });
});
