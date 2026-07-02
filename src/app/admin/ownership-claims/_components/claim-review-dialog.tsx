"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";

import { adminOwnershipClaimsApi } from "@/app/admin/_api/ownership-claims";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/auth-store";
import { useConfirmStore } from "@/stores/confirm-store";
import type { AdminOwnershipClaim } from "@/types/admin";

interface ClaimReviewDialogProps {
  claim: AdminOwnershipClaim | null;
  onOpenChange: (open: boolean) => void;
}

const STATUS_BADGE: Record<AdminOwnershipClaim["status"], { label: string; className: string; icon: React.ElementType }> = {
  pending:  { label: "Pending",  icon: Clock,        className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  approved: { label: "Approved", icon: CheckCircle2, className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"  },
  rejected: { label: "Rejected", icon: XCircle,      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"          },
};

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

export function ClaimReviewDialog({ claim, onOpenChange }: ClaimReviewDialogProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const confirm = useConfirmStore((s) => s.confirm);
  const isSuperAdmin = user?.role === "super_admin";

  const [notes, setNotes] = useState("");
  const notesValid = notes.trim().length >= 10;

  const approveMutation = useMutation({
    mutationFn: () => adminOwnershipClaimsApi.approve(claim!.id, notes.trim()),
    onSuccess: () => {
      toast.success("Claim approved. Ownership has been transferred.");
      queryClient.invalidateQueries({ queryKey: ["admin-ownership-claims"] });
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to approve claim."),
  });

  const rejectMutation = useMutation({
    mutationFn: () => adminOwnershipClaimsApi.reject(claim!.id, notes.trim()),
    onSuccess: () => {
      toast.success("Claim rejected.");
      queryClient.invalidateQueries({ queryKey: ["admin-ownership-claims"] });
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to reject claim."),
  });

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  if (!claim) return null;

  const statusCfg = STATUS_BADGE[claim.status];
  const StatusIcon = statusCfg.icon;
  const isActionable = claim.status === "pending";

  function handleApprove() {
    if (!notesValid) return;
    confirm({
      title: "Approve Ownership Claim",
      description: `This will transfer ownership of "${claim!.fpo_name}" to ${claim!.claimant_name}. The previous primary user's access will be deactivated. This cannot be undone.`,
      confirmLabel: "Approve",
      confirmingLabel: "Approving...",
      variant: "default",
      onConfirm: () => approveMutation.mutateAsync(),
    });
  }

  function handleReject() {
    if (!notesValid) return;
    rejectMutation.mutate();
  }

  return (
    <Dialog open={!!claim} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ownership Claim Review</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={`flex items-center gap-1 ${statusCfg.className}`}>
              <StatusIcon className="h-3 w-3" />
              {statusCfg.label}
            </Badge>
            <span className="text-muted-foreground text-xs">
              Submitted {new Date(claim.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>

          {/* FPO info */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-2 font-medium text-xs text-muted-foreground uppercase tracking-wide">FPO</p>
            <p className="font-semibold">{claim.fpo_name}</p>
            <p className="text-muted-foreground text-xs">ID: {claim.fpo_id}</p>
          </div>

          {/* Claimant info */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Claimant</p>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="Name" value={claim.claimant_name} />
              <InfoRow label="Email" value={claim.claimant_email} />
              <InfoRow label="Phone" value={claim.claimant_phone} />
            </div>
          </div>

          {/* Reason */}
          <div>
            <p className="mb-1.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">Reason</p>
            <p className="rounded-lg border bg-muted/20 p-3 text-sm leading-relaxed whitespace-pre-wrap">
              {claim.reason}
            </p>
          </div>

          {/* Previous review notes (if already decided) */}
          {claim.status !== "pending" && claim.review_notes && (
            <div>
              <p className="mb-1.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">Review Notes</p>
              <p className="rounded-lg border bg-muted/20 p-3 text-sm">{claim.review_notes}</p>
              {claim.reviewed_by && (
                <p className="mt-1 text-muted-foreground text-xs">By {claim.reviewed_by}</p>
              )}
            </div>
          )}

          {/* Action area — only for pending claims */}
          {isActionable && (
            <div className="flex flex-col gap-3 border-t pt-4">
              <div>
                <label className="mb-1.5 block font-medium text-sm" htmlFor="review-notes">
                  Review Notes <span className="text-destructive">*</span>
                </label>
                <textarea
                  id="review-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes explaining your decision (min. 10 characters)…"
                  disabled={isPending}
                  className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                />
                {notes.trim().length > 0 && !notesValid && (
                  <p className="mt-1 text-destructive text-xs">Minimum 10 characters required.</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 text-destructive hover:text-destructive"
                  disabled={!notesValid || isPending}
                  onClick={handleReject}
                >
                  {rejectMutation.isPending ? "Rejecting…" : "Reject"}
                </Button>
                {isSuperAdmin && (
                  <Button
                    className="flex-1"
                    disabled={!notesValid || isPending}
                    onClick={handleApprove}
                  >
                    {approveMutation.isPending ? "Approving…" : "Approve"}
                  </Button>
                )}
              </div>

              {!isSuperAdmin && (
                <p className="text-center text-muted-foreground text-xs">
                  Only super admins can approve claims.
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
