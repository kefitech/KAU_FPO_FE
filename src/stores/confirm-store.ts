import { create } from "zustand";

interface ConfirmOptions {
  title: string;
  description: string;
  onConfirm: () => Promise<unknown> | unknown;
}

interface ConfirmStore {
  open: boolean;
  title: string;
  description: string;
  isPending: boolean;
  onConfirm: (() => Promise<unknown> | unknown) | null;
  confirm: (options: ConfirmOptions) => void;
  close: () => void;
  setIsPending: (pending: boolean) => void;
}

export const useConfirmStore = create<ConfirmStore>((set) => ({
  open: false,
  title: "",
  description: "",
  isPending: false,
  onConfirm: null,
  confirm: (options) =>
    set({ open: true, title: options.title, description: options.description, onConfirm: options.onConfirm }),
  close: () => set({ open: false, isPending: false, onConfirm: null }),
  setIsPending: (pending) => set({ isPending: pending }),
}));
