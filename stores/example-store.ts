import { create } from "zustand";
import { devtools } from "zustand/middleware";

/**
 * Example Zustand store — replace with real stores as needed.
 *
 * Usage in a Client Component:
 *   import { useExampleStore } from "@/stores/example-store";
 *   const count = useExampleStore((s) => s.count);
 */

type ExampleState = {
  count: number;
  increment: () => void;
  reset: () => void;
};

export const useExampleStore = create<ExampleState>()(
  devtools(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
      reset: () => set({ count: 0 }),
    }),
    { name: "example-store" },
  ),
);
