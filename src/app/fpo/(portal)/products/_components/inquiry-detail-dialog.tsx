"use client";

import { useState } from "react";

import { CheckCheck, Mail, Phone, PhoneCall, User } from "lucide-react";

import type { Inquiry } from "@/app/fpo/_api/inquiries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { inquiryStatusLabel, statusClasses, useInquiryStatusActions } from "./inquiry-columns";

type T = Record<string, string>;

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium text-muted-foreground text-xs">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

interface InquiryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inquiry: Inquiry | null;
  /** can_manage_products — without it the dialog is view-only (no status actions). */
  canManage: boolean;
  t: T;
  tCommon: T;
}

/**
 * Inquiry details + status actions, opened by clicking a row in the
 * /fpo/products "Inquiries" table. Render with `key={inquiry.id}` so the local
 * status resets per inquiry.
 */
export function InquiryDetailDialog({ open, onOpenChange, inquiry, canManage, t, tCommon }: InquiryDetailDialogProps) {
  // Reflect a status change straight away — the table refetches in the
  // background, but the dialog keeps the row it was opened with.
  const [status, setStatus] = useState<Inquiry["status"] | null>(inquiry?.status ?? null);
  const { markContacted, markResolved } = useInquiryStatusActions(inquiry?.id ?? 0, t, setStatus);

  if (!inquiry || !status) return null;

  const contactMissing = t.contact_unavailable ?? "Contact no longer available";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.inquiry_view_title ?? "Inquiry Details"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">{t.col_product_name ?? "Product Name"}</p>
              <p className="font-semibold">{inquiry.product_name}</p>
            </div>
            <Badge variant="outline" className={`shrink-0 ${statusClasses(status)}`}>
              {inquiryStatusLabel(status, t)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InfoRow label={t.col_buyer ?? "Buyer"} value={inquiry.buyer_name} />
            <InfoRow label={t.col_quantity_requested ?? "Quantity Requested"} value={inquiry.quantity_requested} />
            <InfoRow
              label={t.col_date_received ?? "Date Received"}
              value={new Date(inquiry.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            />
          </div>

          <div className="flex flex-col gap-2 rounded-lg border p-3">
            <p className="font-medium text-xs">{t.section_buyer_contact ?? "Buyer Contact"}</p>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {inquiry.contact_name ?? <span className="text-muted-foreground">{contactMissing}</span>}
            </div>
            {inquiry.contact_phone && (
              <a
                href={`tel:${inquiry.contact_phone}`}
                className="flex w-fit items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
              >
                <Phone className="h-3.5 w-3.5 shrink-0" />
                {inquiry.contact_phone}
              </a>
            )}
            {inquiry.contact_email && (
              <a
                href={`mailto:${inquiry.contact_email}`}
                className="flex w-fit items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                {inquiry.contact_email}
              </a>
            )}
          </div>

          <InfoRow
            label={t.col_message ?? "Message"}
            value={
              inquiry.message ? (
                <span className="whitespace-pre-wrap">{inquiry.message}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon.close ?? "Close"}
          </Button>
          {canManage && status === "pending" && (
            <Button onClick={() => markContacted.mutate()} disabled={markContacted.isPending} className="gap-1.5">
              <PhoneCall className="h-4 w-4" />
              {t.action_mark_contacted ?? "Mark as Contacted"}
            </Button>
          )}
          {canManage && status === "contacted" && (
            <Button onClick={() => markResolved.mutate()} disabled={markResolved.isPending} className="gap-1.5">
              <CheckCheck className="h-4 w-4" />
              {t.action_mark_resolved ?? "Mark as Resolved"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
