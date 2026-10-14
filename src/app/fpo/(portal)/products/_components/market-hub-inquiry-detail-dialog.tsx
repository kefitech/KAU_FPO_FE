"use client";

import { useState } from "react";

import { Ban, Check, Mail, Phone, User } from "lucide-react";

import type { MarketHubInquiry } from "@/app/fpo/_api/market-hub-inquiries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { getStatusLabel, statusClasses, useMarketHubInquiryStatusActions } from "./market-hub-inquiry-columns";

type T = Record<string, string>;

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium text-muted-foreground text-xs">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

interface MarketHubInquiryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inquiry: MarketHubInquiry | null;
  /** can_manage_products — without it the dialog is view-only (no accept/reject). */
  canManage: boolean;
  t: T;
  tCommon: T;
}

/**
 * Market Hub inquiry details + accept/reject, opened by clicking a row in the
 * /fpo/products "Market Hub Inquiries" table. The visitor has no account, so
 * the contact details here are the only way to reach them. Render with
 * `key={inquiry.id}` so the local status resets per inquiry.
 */
export function MarketHubInquiryDetailDialog({
  open,
  onOpenChange,
  inquiry,
  canManage,
  t,
  tCommon,
}: MarketHubInquiryDetailDialogProps) {
  // Reflect a status change straight away — the table refetches in the
  // background, but the dialog keeps the row it was opened with.
  const [status, setStatus] = useState<MarketHubInquiry["status"] | null>(inquiry?.status ?? null);
  const { markAccepted, markRejected } = useMarketHubInquiryStatusActions(inquiry?.id ?? 0, t, setStatus);

  if (!inquiry || !status) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.mh_inquiry_view_title ?? "Market Hub Inquiry Details"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">{t.col_product_name ?? "Product Name"}</p>
              <p className="font-semibold">{inquiry.product_name}</p>
              {inquiry.batch_number && (
                <p className="font-mono text-muted-foreground text-xs">
                  {t.col_batch ?? "Batch"}: {inquiry.batch_number}
                </p>
              )}
            </div>
            <Badge variant="outline" className={`shrink-0 ${statusClasses(status)}`}>
              {getStatusLabel(t)[status]}
            </Badge>
          </div>

          <InfoRow
            label={t.col_date_received ?? "Date Received"}
            value={new Date(inquiry.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          />

          <div className="flex flex-col gap-2 rounded-lg border p-3">
            <p className="font-medium text-xs">{t.section_buyer_contact ?? "Buyer Contact"}</p>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {inquiry.name}
            </div>
            {inquiry.phone && (
              <a
                href={`tel:${inquiry.phone}`}
                className="flex w-fit items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
              >
                <Phone className="h-3.5 w-3.5 shrink-0" />
                {inquiry.phone}
              </a>
            )}
            {inquiry.email && (
              <a
                href={`mailto:${inquiry.email}`}
                className="flex w-fit items-center gap-2 break-all text-muted-foreground text-sm hover:text-foreground"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                {inquiry.email}
              </a>
            )}
          </div>

          <InfoRow
            label={t.col_message ?? "Message"}
            value={
              inquiry.message ? (
                <span className="whitespace-pre-wrap break-words">{inquiry.message}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
          />
        </div>

        <DialogFooter className="gap-2 sm:flex-wrap">
          <Button
            variant="outline"
            className="h-auto min-h-9 shrink whitespace-normal py-1.5 sm:grow"
            onClick={() => onOpenChange(false)}
          >
            {tCommon.close ?? "Close"}
          </Button>
          {canManage && status === "suggested" && (
            <>
              <Button
                variant="outline"
                onClick={() => markRejected.mutate()}
                disabled={markRejected.isPending || markAccepted.isPending}
                className="h-auto min-h-9 shrink gap-1.5 whitespace-normal py-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive sm:grow"
              >
                <Ban className="h-4 w-4" />
                {t.action_mark_rejected ?? "Mark as Spam"}
              </Button>
              <Button
                onClick={() => markAccepted.mutate()}
                disabled={markAccepted.isPending || markRejected.isPending}
                className="h-auto min-h-9 shrink gap-1.5 whitespace-normal py-1.5 sm:grow"
              >
                <Check className="h-4 w-4" />
                {t.action_mark_accepted ?? "Mark as Resolved"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
