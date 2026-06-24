"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useConfirmStore } from "@/stores/confirm-store";

export function ConfirmDialog() {
  const { open, title, description, confirmLabel, confirmingLabel, variant, isPending, onConfirm, close, setIsPending } = useConfirmStore();

  async function handleConfirm() {
    if (!onConfirm) return;
    setIsPending(true);
    try {
      await Promise.resolve(onConfirm());
    } finally {
      close();
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? confirmingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
