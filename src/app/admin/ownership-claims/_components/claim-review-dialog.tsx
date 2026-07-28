"use client";

import { useEffect, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, ExternalLink, FileSearch, FileUp, XCircle } from "lucide-react";
import { toast } from "sonner";

import { adminOwnershipClaimsApi } from "@/app/admin/_api/ownership-claims";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AdminOwnershipClaimDoc } from "@/types/admin";
import { useAuthStore } from "@/stores/auth-store";
import { useConfirmStore } from "@/stores/confirm-store";
import type { AdminOwnershipClaim } from "@/types/admin";

type T = Record<string, string>;

interface ClaimReviewDialogProps {
  claim: AdminOwnershipClaim | null;
  onOpenChange: (open: boolean) => void;
  t?: T;
}

const STATUS_ICON: Record<AdminOwnershipClaim["status"], React.ElementType> = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
  docs_requested: FileSearch,
  docs_submitted: FileUp,
};

const STATUS_CLASS: Record<AdminOwnershipClaim["status"], string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  docs_requested: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  docs_submitted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

type ActionMode = "decide" | "request_docs";

function InfoRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string | null | undefined;
  valueClassName?: string;
}) {
  if (!value) return null;

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={`text-sm ${valueClassName ?? ""}`}>{value}</span>
    </div>
  );
}

export function ClaimReviewDialog({ claim, onOpenChange, t = {} }: ClaimReviewDialogProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const confirm = useConfirmStore((s) => s.confirm);
  const isSuperAdmin = user?.role === "super_admin";

  const [mode, setMode] = useState<ActionMode>("decide");
  const [notes, setNotes] = useState("");
  const [docsMessage, setDocsMessage] = useState("");

  useEffect(() => {
    setMode("decide");
    setNotes("");
    setDocsMessage("");
  }, [claim?.id]);

  const notesValid = notes.trim().length >= 10;
  const docsMessageValid = docsMessage.trim().length >= 10;

  const approveMutation = useMutation({
    mutationFn: () => adminOwnershipClaimsApi.approve(claim!.id, notes.trim()),
    onSuccess: (msg) => {
      toast.success(msg || (t.toast_approved ?? "Claim approved. Ownership has been transferred."));
      queryClient.invalidateQueries({ queryKey: ["ownership-claims"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? (t.toast_approve_failed ?? "Failed to approve claim."));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => adminOwnershipClaimsApi.reject(claim!.id, notes.trim()),
    onSuccess: (msg) => {
      toast.success(msg || (t.toast_rejected ?? "Claim rejected."));
      queryClient.invalidateQueries({ queryKey: ["ownership-claims"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? (t.toast_reject_failed ?? "Failed to reject claim."));
    },
  });

  const requestDocsMutation = useMutation({
    mutationFn: () => adminOwnershipClaimsApi.requestDocuments(claim!.id, docsMessage.trim()),
    onSuccess: (msg) => {
      toast.success(msg || (t.toast_docs_requested ?? "Document request sent. Claimant has been notified."));
      queryClient.invalidateQueries({ queryKey: ["ownership-claims"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? (t.toast_docs_request_failed ?? "Failed to send document request."));
    },
  });

  const isPending = approveMutation.isPending || rejectMutation.isPending || requestDocsMutation.isPending;

  if (!claim) return null;

  const StatusIcon = STATUS_ICON[claim.status];
  const statusLabel = t[`status_${claim.status}`] ?? claim.status;
  const isActionable = ["pending", "docs_requested", "docs_submitted"].includes(claim.status);

  function handleApprove() {
    if (!notesValid) return;
    confirm({
      title: t.confirm_approve_title ?? "Approve Ownership Claim",
      description: (t.confirm_approve_description_dynamic ?? 'This will transfer ownership of "{fpo}" to {claimant}. The previous primary user\'s access will be deactivated. This cannot be undone.')
        .replace("{fpo}", claim!.fpo_name)
        .replace("{claimant}", claim!.claimant_name),
      confirmLabel: t.btn_approve ?? "Approve",
      confirmingLabel: t.approving ?? "Approving...",
      variant: "default",
      onConfirm: () => approveMutation.mutateAsync(),
    });
  }

  function handleReject() {
    if (!notesValid) return;
    rejectMutation.mutate();
  }

  function handleRequestDocs() {
    if (!docsMessageValid) return;
    requestDocsMutation.mutate();
  }

  return (
    <Dialog open={!!claim} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[90vh] sm:max-w-lg gap-0 p-0">
        {/* Sticky header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>{t.review_dialog_title ?? "Ownership Claim Review"}</DialogTitle>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={`flex items-center gap-1 ${STATUS_CLASS[claim.status]}`}>
              <StatusIcon className="h-3 w-3" />
              {statusLabel}
            </Badge>
            <span className="text-muted-foreground text-xs">
              {(t.submitted_on ?? "Submitted {date}").replace(
                "{date}",
                new Date(claim.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
              )}
            </span>
          </div>

          {/* Dispute / conflict warning */}
          {claim.has_conflict && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-900/40 dark:bg-orange-900/10">
              <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
                {"⚠ "}
                {(claim.conflict_count === 1
                  ? (t.dispute_warning_singular ?? "Dispute — {n} other active claim exists for this FPO")
                  : (t.dispute_warning_plural ?? "Dispute — {n} other active claims exist for this FPO")
                ).replace("{n}", String(claim.conflict_count))}
              </p>
              <p className="mt-0.5 text-xs text-orange-600 dark:text-orange-500">
                {t.dispute_review_hint ?? "Review all claims for this FPO before approving."}
              </p>
            </div>
          )}

          {/* FPO info */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-2 font-medium text-xs text-muted-foreground uppercase tracking-wide">
              {t.section_fpo_info ?? "FPO"}
            </p>
            <p className="font-semibold">{claim.fpo_name}</p>
            <p className="text-muted-foreground text-xs">
              {(t.label_fpo_id ?? "ID: {id}").replace("{id}", String(claim.fpo_id))}
            </p>
            <p className="text-muted-foreground text-xs">
              {(t.label_fpo_email ?? "FPO Email: {email}").replace("{email}", claim.fpo_email)}
            </p>
            

            {claim.fpo_identity && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {claim.fpo_identity.pan_number && (
                  <span className="text-xs text-muted-foreground">PAN: <span className="font-mono text-foreground">{claim.fpo_identity.pan_number}</span></span>
                )}
                {claim.fpo_identity.gst_number && (
                  <span className="text-xs text-muted-foreground">GST: <span className="font-mono text-foreground">{claim.fpo_identity.gst_number}</span></span>
                )}
                {claim.fpo_identity.cin_number && (
                  <span className="text-xs text-muted-foreground">CIN: <span className="font-mono text-foreground">{claim.fpo_identity.cin_number}</span></span>
                )}
                {!claim.fpo_identity.cin_number && claim.fpo_identity.registration_number && (
                  <span className="text-xs text-muted-foreground">{t.label_reg_no ?? "Reg No"}: <span className="font-mono text-foreground">{claim.fpo_identity.registration_number}</span></span>
                )}
              </div>
            )}
          </div>

          {/* Claimant info */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">
              {t.section_claimant ?? "Claimant"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label={t.label_claimant_name ?? "Name"} value={claim.claimant_name} />
              <InfoRow label={t.label_claimant_email ?? "Email"} value={claim.claimant_email} valueClassName="break-all" />
              <InfoRow label={t.label_claimant_phone ?? "Phone"} value={claim.claimant_phone} />
              
            </div>
            {claim.fpo_identity?.matched_label && claim.fpo_identity?.matched_value && (
              <div className="mt-2 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">{t.claimed_via_label ?? "Claimed For"}</p>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {claim.fpo_identity.matched_label}: <span className="font-mono">{claim.fpo_identity.matched_value}</span>
                </p>
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <p className="mb-1.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">
              {t.label_claim_notes ?? "Reason"}
            </p>
            <p className="rounded-lg border bg-muted/20 p-3 text-sm leading-relaxed whitespace-pre-wrap break-words">
              {claim.reason}
            </p>
          </div>

          {/* Supporting documents */}
          {claim.supporting_docs?.length > 0 && (
            <div>
              <p className="mb-2 font-medium text-xs text-muted-foreground uppercase tracking-wide">
                {(t.supporting_docs_heading ?? "Supporting Documents ({n})").replace("{n}", String(claim.supporting_docs.length))}
              </p>
              <div className="flex flex-col gap-1.5">
                {claim.supporting_docs.map((doc: AdminOwnershipClaimDoc) => (
                  <a
                   key={doc.id}
                   href={doc.file_url}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
                 >
                    <FileSearch className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 capitalize">{doc.document_type.replace(/_/g, " ")}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(doc.uploaded_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-primary" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Previous review notes / docs request message */}
          {claim.status !== "pending" && claim.review_notes && (
            <div>
              <p className="mb-1.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">
                {claim.status === "docs_requested" || claim.status === "docs_submitted"
                  ? (t.docs_requested_heading ?? "Documents Requested — Message Sent")
                  : (t.review_notes_heading ?? "Review Notes")}
              </p>
              <p className={`rounded-lg border p-3 text-sm ${
                claim.status === "docs_requested" || claim.status === "docs_submitted"
                  ? "border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20"
                  : "bg-muted/20"
              }`}>
                {claim.review_notes}
              </p>
              {claim.status === "docs_submitted" && (
                <p className="mt-1.5 text-purple-600 dark:text-purple-400 text-xs font-medium">
                  {t.docs_submitted_note ?? "✓ Claimant has submitted documents in response."}
                </p>
              )}
              {claim.reviewed_by && (
                <p className="mt-1 text-muted-foreground text-xs">
                  {claim.status === "docs_requested" || claim.status === "docs_submitted"
                    ? (t.requested_by ?? "Requested by")
                    : (t.by_label ?? "By")}{" "}
                  {claim.reviewed_by}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Sticky footer — action area always visible */}
        {isActionable && (
          <div className="shrink-0 border-t px-6 py-4 flex flex-col gap-3 bg-background">
            {/* Mode toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("decide")}
               className={`flex-1 min-w-0 rounded-md border px-2 py-2 text-xs sm:text-sm font-medium leading-snug break-words text-center transition-colors ${
                  mode === "decide"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {t.mode_decide ?? "Approve / Reject"}
              </button>
              <button
                type="button"
                onClick={() => setMode("request_docs")}
                disabled={claim.status === "docs_requested"}
                className={`flex-1 min-w-0 rounded-md border px-2 py-2 text-xs sm:text-sm font-medium leading-snug break-words text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  mode === "request_docs"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {t.mode_request_docs ?? "Request Documents"}
              </button>
            </div>

            {/* Decide mode */}
            {mode === "decide" && (
              <>
                <div>
                  <label className="mb-1.5 block font-medium text-sm" htmlFor="review-notes">
                    {t.review_notes_label ?? "Review Notes"} <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    id="review-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t.placeholder_review_notes ?? "Add notes explaining your decision (min. 10 characters)…"}
                    disabled={isPending}
                    className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                  {notes.trim().length > 0 && !notesValid && (
                    <p className="mt-1 text-destructive text-xs">{t.validation_min_chars ?? "Minimum 10 characters required."}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 min-w-0 text-destructive hover:text-destructive"
                    disabled={!notesValid || isPending}
                    onClick={handleReject}
                  >
                    {rejectMutation.isPending ? (t.rejecting ?? "Rejecting…") : (t.btn_reject ?? "Reject")}
                  </Button>
                  {isSuperAdmin && (
                    <Button
                      className="flex-1 min-w-0"
                      disabled={!notesValid || isPending}
                      onClick={handleApprove}
                    >
                      {approveMutation.isPending ? (t.approving ?? "Approving…") : (t.btn_approve ?? "Approve")}
                    </Button>
                  )}
                </div>

                {!isSuperAdmin && (
                  <p className="text-center text-muted-foreground text-xs">
                    {t.super_admin_only ?? "Only super admins can approve claims."}
                  </p>
                )}
              </>
            )}

            {/* Request documents mode */}
            {mode === "request_docs" && (
              <>
                <div>
                  <label className="mb-1.5 block font-medium text-sm" htmlFor="docs-message">
                    {t.docs_message_label ?? "Message to Claimant"} <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    id="docs-message"
                    rows={3}
                    value={docsMessage}
                    onChange={(e) => setDocsMessage(e.target.value)}
                    placeholder={t.placeholder_docs_message ?? "Describe which documents are needed and why (min. 10 characters)…"}
                    disabled={isPending}
                    className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                  {docsMessage.trim().length > 0 && !docsMessageValid && (
                    <p className="mt-1 text-destructive text-xs">{t.validation_min_chars ?? "Minimum 10 characters required."}</p>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  {t.docs_message_notice ?? "The claimant will be notified via email, SMS, and in-app notification with your message."}
                </p>
                <Button
                  disabled={!docsMessageValid || isPending}
                  onClick={handleRequestDocs}
                  className="w-full whitespace-normal break-words leading-snug h-auto py-2.5"
                >
                  <FileSearch className="mr-2 h-4 w-4" />
                  {requestDocsMutation.isPending ? (t.sending ?? "Sending…") : (t.btn_send_docs_request ?? "Send Document Request")}
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}