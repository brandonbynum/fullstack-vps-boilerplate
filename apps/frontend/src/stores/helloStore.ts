import { create } from 'zustand';

interface HelloState {
  message: string;
  count: number;
  setMessage: (message: string) => void;
  incrementCount: () => void;
  reset: () => void;
}

export const useHelloStore = create<HelloState>((set) => ({
  message: '',
  count: 0,
  setMessage: (message: string) =>
    set((state) => ({
      message,
      count: state.count + 1,
    })),
  incrementCount: () =>
    set((state) => ({
      count: state.count + 1,
    })),
  reset: () =>
    set({
      message: '',
      count: 0,
    }),
}));
