"use client";

import { useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { buyerProductsApi } from "@/app/buyer/_api/products";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

  const mutation = useMutation({
    mutationFn: () =>
      buyerProductsApi.inquire(productId, {
        quantity_requested: Number(quantity),
        message: message || undefined,
      }),
    onSuccess: () => {
      toast.success("Inquiry submitted successfully.");
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
              id="inquiry-quantity"
              inputMode="decimal"
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
              className="resize-none"
            />
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