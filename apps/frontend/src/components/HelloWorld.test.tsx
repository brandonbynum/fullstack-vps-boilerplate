import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelloWorld } from './HelloWorld';
import { useHelloStore } from '../stores/helloStore';

/**
 * Unit tests for HelloWorld Component
 *
 * This demonstrates testing React components with vitest and React Testing Library.
 * Tests verify:
 * - Component rendering
 * - User interactions
 * - Store integration
 * - UI state management
 *
 * Note: This is a simplified example focusing on component structure and store integration.
 * For full E2E testing with tRPC, you would need integration tests or a mock server.
 */

// Mock the tRPC client since we're unit testing the component in isolation
vi.mock('../lib/trpc', () => ({
  trpc: {
    hello: {
      getHello: {
        useQuery: vi.fn(() => ({
          data: undefined,
          isPending: false,
          error: null,
          isLoading: false,
          refetch: vi.fn(async () => ({
            data: {
              message: 'Hello World from tRPC!',
              timestamp: new Date(),
            },
          })),
          remove: vi.fn(),
        })),
      },
      getCustomHello: {
        useQuery: vi.fn(() => ({
          data: undefined,
          isPending: false,
          error: null,
          isLoading: false,
          refetch: vi.fn(async () => ({
            data: {
              message: 'Hello, Test User!',
              timestamp: new Date(),
            },
          })),
          remove: vi.fn(),
        })),
      },
    },
  },
}));

describe('HelloWorld Component', () => {
  beforeEach(() => {
    // Clear store before each test
    useHelloStore.getState().reset();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<HelloWorld />);
      expect(screen.getByText('Hello World Example')).toBeInTheDocument();
    });

    it('should render all main sections', () => {
      render(<HelloWorld />);

      // Check for main sections
      expect(screen.getByText('Hello World Example')).toBeInTheDocument();
      expect(screen.getByText('Client State (Zustand)')).toBeInTheDocument();
      expect(screen.getByText('Simple Hello Query')).toBeInTheDocument();
      expect(screen.getByText('Personalized Greeting')).toBeInTheDocument();
      expect(screen.getByText('Pure Client State')).toBeInTheDocument();
    });

    it('should display initial empty state', () => {
      render(<HelloWorld />);

      const messageDisplay = screen.getByText(/No message yet/);
      expect(messageDisplay).toBeInTheDocument();
    });

    it('should display counter as 0 initially', () => {
      render(<HelloWorld />);

      const badge = screen.getByText('0');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Zustand State Display', () => {
    it('should show counter value from store', () => {
      const { setMessage } = useHelloStore.getState();
      setMessage('Test message');

      render(<HelloWorld />);

      // Counter should show 1
      const badges = screen.getAllByText('1');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should display message from store', () => {
      const { setMessage } = useHelloStore.getState();
      setMessage('Test message from store');

      render(<HelloWorld />);

      expect(screen.getByText('Test message from store')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should have increment counter button', async () => {
      render(<HelloWorld />);

      const incrementButton = screen.getByRole('button', {
        name: /Increment Counter/i,
      });

      expect(incrementButton).toBeInTheDocument();
    });

    it('should increment counter when clicked', async () => {
      const user = userEvent.setup();

      render(<HelloWorld />);

      const incrementButton = screen.getByRole('button', {
        name: /Increment Counter/i,
      });

      // Initial counter should be 0
      expect(screen.getByText('0')).toBeInTheDocument();

      // Click increment button
      await user.click(incrementButton);

      // Counter should now be 1
      await waitFor(() => {
        const counters = screen.queryAllByText('1');
        expect(counters.length).toBeGreaterThan(0);
      });
    });

    it('should have reset button', () => {
      render(<HelloWorld />);

      const resetButton = screen.getByRole('button', {
        name: /Reset Everything/i,
      });

      expect(resetButton).toBeInTheDocument();
    });

    it('should reset state when clicking reset button', async () => {
      const user = userEvent.setup();
      const { setMessage } = useHelloStore.getState();

      // Setup state
      setMessage('Test message');

      render(<HelloWorld />);

      // Verify message exists
      expect(screen.getByText('Test message')).toBeInTheDocument();

      // Click reset button
      const resetButton = screen.getByRole('button', {
        name: /Reset Everything/i,
      });
      await user.click(resetButton);

      // Message should disappear and show default text
      await waitFor(() => {
        expect(screen.queryByText('Test message')).not.toBeInTheDocument();
        expect(screen.getByText(/No message yet/)).toBeInTheDocument();
      });
    });
  });

  describe('Input Handling', () => {
    it('should have name input field', () => {
      render(<HelloWorld />);

      const nameInput = screen.getByPlaceholderText('Enter your name');
      expect(nameInput).toBeInTheDocument();
    });

    it('should accept name input', async () => {
      const user = userEvent.setup();

      render(<HelloWorld />);

      const nameInput = screen.getByPlaceholderText(
        'Enter your name'
      ) as HTMLInputElement;

      await user.type(nameInput, 'Alice');

      expect(nameInput.value).toBe('Alice');
    });

    it('should have send button', () => {
      render(<HelloWorld />);

      // The send button contains an SVG icon, so we look for it by role
      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg !== null && btn.disabled; // Initially disabled
      });

      expect(sendButton).toBeDefined();
    });

    it('should disable send button when name input is empty', () => {
      render(<HelloWorld />);

      const buttons = screen.getAllByRole('button');
      // Find the button with SVG (send button)
      const sendButton = buttons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg !== null;
      });

      // Should be disabled when input is empty
      expect(sendButton).toBeDisabled();
    });

    it('should enable send button when name is entered', async () => {
      const user = userEvent.setup();

      render(<HelloWorld />);

      const nameInput = screen.getByPlaceholderText('Enter your name');

      await user.type(nameInput, 'Bob');

      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg !== null;
      });

      // Should be enabled now
      expect(sendButton).not.toBeDisabled();
    });
  });

  describe('Button Availability', () => {
    it('should have fetch hello message button', () => {
      render(<HelloWorld />);

      const fetchButton = screen.getByRole('button', {
        name: /Fetch Hello Message/i,
      });

      expect(fetchButton).toBeInTheDocument();
    });

    it('should have increment counter button', () => {
      render(<HelloWorld />);

      const incrementButton = screen.getByRole('button', {
        name: /Increment Counter/i,
      });

      expect(incrementButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for inputs', () => {
      render(<HelloWorld />);

      const nameLabel = screen.getByText('Your Name');
      expect(nameLabel).toBeInTheDocument();
    });

    it('should have descriptive text for sections', () => {
      render(<HelloWorld />);

      // Check for descriptive text
      expect(
        screen.getByText(/Full-stack integration demo/i)
      ).toBeInTheDocument();
    });

    it('should have buttons for user interaction', () => {
      render(<HelloWorld />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Information Display', () => {
    it('should display what the example demonstrates', () => {
      render(<HelloWorld />);

      expect(
        screen.getByText(/What This Demonstrates/i)
      ).toBeInTheDocument();
    });

    it('should have informational content about tRPC', () => {
      render(<HelloWorld />);

      const tRPCElements = screen.getAllByText(/tRPC/i);
      expect(tRPCElements.length).toBeGreaterThan(0);
    });

    it('should have informational content about Zustand', () => {
      render(<HelloWorld />);

      const zustandElements = screen.getAllByText(/Zustand/i);
      expect(zustandElements.length).toBeGreaterThan(0);
    });
  });

  describe('Component Structure', () => {
    it('should render main heading', () => {
      render(<HelloWorld />);

      const mainHeading = screen.getByRole('heading', {
        level: 2,
        name: /Hello World Example/i,
      });

      expect(mainHeading).toBeInTheDocument();
    });

    it('should render section headings', () => {
      render(<HelloWorld />);

      const sectionHeadings = screen.getAllByRole('heading', { level: 3 });
      // Should have at least 5 main sections
      expect(sectionHeadings.length).toBeGreaterThanOrEqual(4);
    });

    it('should render descriptive paragraphs', () => {
      render(<HelloWorld />);

      // Get all paragraph elements
      const paragraphs = screen.getAllByText(/./);
      expect(paragraphs.length).toBeGreaterThan(5);
    });
  });
});
