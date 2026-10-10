"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// Keep in step with CANCEL_REASON_MAX_CHARS in apps/cbbo/training_cancel.py.
export const CANCEL_REASON_MAX_CHARS = 300;

type T = Record<string, string>;

/**
 * "Cancel this training session?" with an optional reason. Shared by the CBBO
 * and government portals; the labels come from the government_training screen.
 */
export function CancelSessionDialog({
  open,
  onOpenChange,
  topic,
  fpoName,
  isPending,
  onConfirm,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: string;
  fpoName: string;
  isPending: boolean;
  onConfirm: (reason: string) => void;
  t: T;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  const description = (
    t.cancel_confirm_desc ??
    'Cancel "{topic}" for {fpo}? The FPO and its team will be notified, and the session will show as cancelled on their page.'
  )
    .replace("{topic}", topic)
    .replace("{fpo}", fpoName);

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto supports-[height:100dvh]:max-h-[calc(100dvh-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.cancel_confirm_title ?? "Cancel Training Session"}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">{description}</p>
        <div className="flex flex-col gap-1">
          <label className="font-medium text-sm" htmlFor="cancel-session-reason">
            {t.cancel_reason_label ?? "Reason (optional)"}
          </label>
          <Textarea
            id="cancel-session-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t.cancel_reason_placeholder ?? "Tell the FPO why the session is cancelled"}
            rows={3}
            maxLength={CANCEL_REASON_MAX_CHARS}
            className="resize-none"
          />
          <p className="text-right text-muted-foreground text-xs">
            {reason.length}/{CANCEL_REASON_MAX_CHARS}
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            {t.btn_keep_session ?? "Keep session"}
          </Button>
          <Button type="button" variant="destructive" disabled={isPending} onClick={() => onConfirm(reason.trim())}>
            {isPending ? (t.cancelling ?? "Cancelling...") : (t.btn_cancel_session ?? "Cancel session")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
