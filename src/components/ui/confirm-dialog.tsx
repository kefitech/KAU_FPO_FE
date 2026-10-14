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
  const { open, title, description, confirmLabel, confirmingLabel, cancelLabel, variant, isPending, onConfirm, close, setIsPending } = useConfirmStore();

  async function handleConfirm() {
    if (!onConfirm) return;
    setIsPending(true);
    try {
      await Promise.resolve(onConfirm());
    } catch {
      // callers pass mutateAsync(); the mutation's onError already shows the toast,
      // so re-throwing here would only surface as an unhandled rejection
    } finally {
      close();
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {/* Normal wrapping — the base text-balance / md:text-pretty pull words onto
              the next line to even them out, leaving a gap at the end of line 1. */}
          <AlertDialogDescription className="break-words text-wrap md:text-wrap">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{cancelLabel}</AlertDialogCancel>
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
