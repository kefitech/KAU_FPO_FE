"use client";

import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { subAdminsApi } from "@/app/admin/_api/sub-admins";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { KERALA_DISTRICTS } from "@/lib/kerala-districts";
import type { SubAdmin } from "@/types/admin";

type T = Record<string, string>;

// Mirrors TransferDistrictSerializer.validate_reason on the backend.
const REASON_MAX_WORDS = 500;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function TransferDistrictDialog({
  subAdmin,
  open,
  onOpenChange,
  t = {},
}: {
  subAdmin: SubAdmin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t?: T;
}) {
  const queryClient = useQueryClient();
  const [toDistrict, setToDistrict] = useState("");
  const [reason, setReason] = useState("");
  const reasonWords = wordCount(reason);
  const reasonTooLong = reasonWords > REASON_MAX_WORDS;

  useEffect(() => {
    if (open) {
      setToDistrict("");
      setReason("");
    }
  }, [open]);

  const { data: history } = useQuery({
    queryKey: ["sub-admin-district-transfers", subAdmin?.id],
    queryFn: () => subAdminsApi.getDistrictTransfers(subAdmin!.id),
    enabled: !!subAdmin && open,
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: () => subAdminsApi.transferDistrict(subAdmin!.id, toDistrict, reason),
    onSuccess: () => {
      toast.success(
        (t.transfer_success ?? "{email} moved to {district}.")
          .replace("{email}", subAdmin?.email ?? "")
          .replace("{district}", toDistrict),
      );
      queryClient.invalidateQueries({ queryKey: ["sub-admins"] });
      queryClient.invalidateQueries({ queryKey: ["sub-admin", String(subAdmin?.id)] });
      queryClient.invalidateQueries({ queryKey: ["sub-admin-district-cap-status"] });
      queryClient.invalidateQueries({ queryKey: ["sub-admin-district-transfers", subAdmin?.id] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const message = (err as { data?: { message?: unknown } })?.data?.message;
      toast.error(typeof message === "string" ? message : (t.transfer_failed ?? "Transfer failed."));
    },
  });

  const currentDistrict = subAdmin?.district ?? "";
  const currentName = KERALA_DISTRICTS.find((d) => d.code === currentDistrict)?.name ?? "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.transfer_title ?? "Transfer District"}</DialogTitle>
          <DialogDescription>
            {t.transfer_description ??
              "Move this sub-admin to a different district. The change is audit-logged and the destination cap is checked before the move."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-4 py-2">
          <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <span className="font-mono">{currentDistrict || "—"}</span>
            <span className="text-muted-foreground text-xs">{currentName}</span>
            <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
            <select
              value={toDistrict}
              onChange={(e) => setToDistrict(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-foreground text-sm"
            >
              <option value="">{t.select_placeholder ?? "Select destination"}</option>
              {KERALA_DISTRICTS.filter((d) => d.code !== currentDistrict).map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ta-reason" className="mb-1 block text-sm font-medium">
              {t.reason_label ?? "Reason (optional)"}
            </label>
            <Textarea
              id="ta-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.reason_placeholder ?? "e.g. Reorganisation for FY 2026-27"}
              aria-invalid={reasonTooLong}
              aria-describedby="ta-reason-count"
              className="max-h-48 overflow-y-auto"
            />
            <div id="ta-reason-count" className="mt-1 flex items-start justify-between gap-2 text-xs">
              <span className="text-destructive">
                {reasonTooLong &&
                  (t.reason_too_long ?? "Reason can be at most {max} words.").replace(
                    "{max}",
                    String(REASON_MAX_WORDS),
                  )}
              </span>
              <span
                className={`shrink-0 tabular-nums ${
                  reasonTooLong
                    ? "text-destructive"
                    : reasonWords > REASON_MAX_WORDS * 0.8
                      ? "text-amber-600"
                      : "text-muted-foreground"
                }`}
              >
                {(t.reason_word_count ?? "{count}/{max} words")
                  .replace("{count}", String(reasonWords))
                  .replace("{max}", String(REASON_MAX_WORDS))}
              </span>
            </div>
          </div>

          {history && history.length > 0 && (
            <div>
              <p className="mb-1 font-medium text-sm">{t.history_heading ?? "Transfer History"}</p>
              <ol className="max-h-40 overflow-y-auto rounded-md border divide-y text-xs">
                {history.map((h) => (
                  <li key={h.id} className="flex items-start gap-2 px-2 py-1.5">
                    <span className="shrink-0 whitespace-nowrap font-mono">
                      {h.from_district || "—"} → {h.to_district}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {new Date(h.created_at).toLocaleDateString()}
                    </span>
                    {h.reason && (
                      <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-muted-foreground">
                        · {h.reason}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.cancel ?? "Cancel"}
          </Button>
          <Button disabled={!toDistrict || reasonTooLong || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t.transfer_btn ?? "Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
