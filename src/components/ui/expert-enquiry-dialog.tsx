"use client";

import { useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { expertsApi } from "@/lib/api/experts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ExpertEnquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expertId: number;
  expertName: string;
}

const MIN_CHARS = 20;
const MAX_CHARS = 1000;

export function ExpertEnquiryDialog({ open, onOpenChange, expertId, expertName }: ExpertEnquiryDialogProps) {
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: () => expertsApi.sendEnquiry(expertId, message),
    onSuccess: () => {
      toast.success("Enquiry sent successfully. The expert will be notified.");
      setMessage("");
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const status = (error as { status?: number })?.status;
      if (status === 403) {
        toast.error("Your FPO must be approved to contact experts.");
      } else {
        const msg = (error as { message?: string })?.message;
        toast.error(msg ?? "Failed to send enquiry. Please try again.");
      }
    },
  });

  const charCount = message.length;
  const isValid = charCount >= MIN_CHARS && charCount <= MAX_CHARS;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isValid) mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Contact Expert</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground mb-1">
          Sending enquiry to <span className="font-medium text-foreground">{expertName}</span>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="enquiry-message">
              Message <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="enquiry-message"
              placeholder="Describe your query or topic you need guidance on…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={MAX_CHARS}
              className="resize-none break-all"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{charCount < MIN_CHARS ? `Minimum ${MIN_CHARS} characters required` : ""}</span>
              <span className={charCount > MAX_CHARS ? "text-destructive" : ""}>
                {charCount}/{MAX_CHARS}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMessage("");
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || mutation.isPending}>
              {mutation.isPending ? "Sending…" : "Send Enquiry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
