"use client";

import { useCallback, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { buyerProductsApi } from "@/app/buyer/_api/products";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Mirrors InquiryCreateSerializer's max_length for `message` on the backend.
const MESSAGE_MAX_CHARS = 500;

interface InquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number;
  productName: string;
  unit: string;
  availableQuantity: number;
}

export function InquiryDialog({
  open,
  onOpenChange,
  productId,
  productName,
  unit,
  availableQuantity,
}: InquiryDialogProps) {
  const [quantity, setQuantity] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Mouse-wheel stepping, like the app's other number fields (e.g. annual
  // turnover). Browsers do this natively for a focused number input, but the
  // Radix Dialog's scroll lock (react-remove-scroll) cancels wheel events, which
  // cancels that too — so step it here. Native listener because React's onWheel
  // is passive and can't preventDefault (needed so the value never moves twice).
  const quantityInputRef = useCallback((input: HTMLInputElement | null) => {
    if (!input) return;
    const onWheel = (e: WheelEvent) => {
      if (document.activeElement !== input || e.deltaY === 0) return;
      e.preventDefault();
      // 25 × step (0.01) = 0.25 per notch. The input's own step stays 0.01 so
      // any 2-decimal quantity (e.g. 12.3) still passes native validation.
      if (e.deltaY < 0) input.stepUp(25);
      else input.stepDown(25);
      setQuantity(input.value);
    };
    input.addEventListener("wheel", onWheel, { passive: false });
    return () => input.removeEventListener("wheel", onWheel);
  }, []);

  const mutation = useMutation({
    mutationFn: () =>
      buyerProductsApi.inquire(productId, {
        quantity_requested: Number(quantity),
        message: message || undefined,
      }),
    onSuccess: () => {
      toast.success("Inquiry submitted successfully.");
      // Buyer dashboard shows inquiry counts — refresh them.
      queryClient.invalidateQueries({ queryKey: ["buyer-dashboard"] });
      reset();
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const apiErr = err as { data?: { message?: string; errors?: Record<string, string[]> } } | undefined;
      const fieldError = apiErr?.data?.errors?.quantity_requested?.[0];
      toast.error(fieldError ?? apiErr?.data?.message ?? "Failed to submit inquiry. Please try again.");
    },
  });

  function reset() {
    setQuantity("");
    setMessage("");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(quantity);
    if (!quantity || Number.isNaN(num) || num <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }
    if (num > availableQuantity) {
      setError(`Quantity cannot exceed available stock (${availableQuantity} ${unit})`);
      return;
    }
    setError(null);
    mutation.mutate();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Inquire About This Product</DialogTitle>
        </DialogHeader>
        <div className="mb-1 text-muted-foreground text-sm">
          Sending inquiry for <span className="font-medium text-foreground">{productName}</span>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="inquiry-quantity">
              Quantity required ({unit}) <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              ref={quantityInputRef}
              id="inquiry-quantity"
              type="number"
              min={0}
              step="0.01"
              placeholder={`e.g. 500`}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">Available: {availableQuantity} {unit}</p>
            {error && <FieldError errors={[{ message: error }]} />}
          </Field>

          <Field>
            <FieldLabel htmlFor="inquiry-message">Additional requirements (optional)</FieldLabel>
            <Textarea
              id="inquiry-message"
              placeholder="Any packaging, quality, or other requirements…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={MESSAGE_MAX_CHARS}
              className="max-h-48 resize-none overflow-y-auto"
            />
            <span
              className={`ml-auto text-xs tabular-nums ${
                message.length >= MESSAGE_MAX_CHARS ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {message.length}/{MESSAGE_MAX_CHARS}
            </span>
          </Field>

          <p className="text-muted-foreground text-xs">
            The seller will be able to see your name, phone, and email to get in touch with you.
          </p>

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Submitting…" : "Submit Inquiry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}