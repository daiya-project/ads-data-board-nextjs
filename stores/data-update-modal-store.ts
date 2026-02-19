import { create } from "zustand";
import { devtools } from "zustand/middleware";

type DataUpdateModalState = {
  open: boolean;
  openModal: () => void;
  closeModal: () => void;
};

export const useDataUpdateModalStore = create<DataUpdateModalState>()(
  devtools(
    (set) => ({
      open: false,
      openModal: () => set({ open: true }),
      closeModal: () => set({ open: false }),
    }),
    { name: "data-update-modal" },
  ),
);
