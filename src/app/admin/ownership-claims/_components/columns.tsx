"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { TextCell } from "@/components/data-table/cell-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminOwnershipClaim } from "@/types/admin";

type T = Record<string, string>;

const STATUS_BADGE: Record<AdminOwnershipClaim["status"], string> = {
  pending:        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved:       "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected:       "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  docs_requested: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  docs_submitted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const STATUS_LABEL: Record<AdminOwnershipClaim["status"], string> = {
  pending:        "Pending",
  approved:       "Approved",
  rejected:       "Rejected",
  docs_requested: "Docs Requested",
  docs_submitted: "Docs Submitted",
};

export function getOwnershipClaimColumns(
  t: T,
  onReview: (claim: AdminOwnershipClaim) => void,
): ColumnDef<AdminOwnershipClaim>[] {
  return [
    {
      accessorKey: "claimant_name",
      header: t.col_claimant ?? "Claimant",
      cell: ({ row }) => <TextCell value={row.original.claimant_name} maxWidth="max-w-[160px]" />,
    },
    {
      accessorKey: "claimant_email",
      header: t.col_email ?? "Email",
      cell: ({ row }) => <TextCell value={row.original.claimant_email} maxWidth="max-w-[120px]" muted />,
    },
    {
      accessorKey: "reason",
      header: t.col_reason ?? "Reason",
      cell: ({ row }) => <TextCell value={row.original.reason} maxWidth="max-w-[200px]" />,
      enableSorting: false,
    },
    {
      accessorKey: "status",
      header: t.col_status ?? "Status",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <Badge variant="secondary" className={STATUS_BADGE[row.original.status]}>
            {STATUS_LABEL[row.original.status]}
          </Badge>
          {row.original.has_conflict && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs">
              Dispute
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "fpo_name",
      header: t.col_fpo ?? "FPO",
      cell: ({ row }) => {
        const identity = row.original.fpo_identity;
        const parts = [
          identity?.pan_number && `PAN: ${identity.pan_number}`,
          identity?.cin_number && `CIN: ${identity.cin_number}`,
          !identity?.cin_number && identity?.registration_number && `Reg: ${identity.registration_number}`,
        ].filter(Boolean).join(" · ");
        return (
          <div className="flex flex-col gap-0.5 max-w-[160px]">
            <span className="truncate text-sm font-medium">{row.original.fpo_name}</span>
            {parts && <span className="truncate text-xs text-muted-foreground">{parts}</span>}
          </div>
        );
      },
    },

    {
      accessorKey: "claimant_phone",
      header: t.col_phone ?? "Phone",
      cell: ({ row }) => <TextCell value={row.original.claimant_phone} maxWidth="max-w-[120px]" muted />,
      enableSorting: false,
    },
    {
      accessorKey: "created_at",
      header: t.col_submitted ?? "Submitted",
      cell: ({ row }) =>
        new Date(row.original.created_at).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <Button
          size="sm"
          variant={["pending", "docs_requested", "docs_submitted"].includes(row.original.status) ? "default" : "outline"}
          onClick={() => onReview(row.original)}
        >
          {["pending", "docs_requested", "docs_submitted"].includes(row.original.status)
            ? (t.btn_review ?? "Review")
            : (t.btn_view ?? "View")}
        </Button>
      ),
    },
  ];
}
