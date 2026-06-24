import { create } from "zustand";

interface ConfirmOptions {
  title: string;
  description: string;
  onConfirm: () => Promise<unknown> | unknown;
  confirmLabel?: string;
  confirmingLabel?: string;
  variant?: "destructive" | "default";
}

interface ConfirmStore {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmingLabel: string;
  variant: "destructive" | "default";
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
  confirmLabel: "Delete",
  confirmingLabel: "Deleting...",
  variant: "destructive",
  isPending: false,
  onConfirm: null,
  confirm: (options) =>
    set({
      open: true,
      title: options.title,
      description: options.description,
      onConfirm: options.onConfirm,
      confirmLabel: options.confirmLabel ?? "Delete",
      confirmingLabel: options.confirmingLabel ?? "Deleting...",
      variant: options.variant ?? "destructive",
    }),
  close: () => set({ open: false, isPending: false, onConfirm: null, confirmLabel: "Delete", confirmingLabel: "Deleting...", variant: "destructive" }),
  setIsPending: (pending) => set({ isPending: pending }),
}));
