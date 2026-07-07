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
      cell: ({ row }) => <TextCell value={row.original.claimant_email} maxWidth="max-w-[180px]" muted />,
    },
    {
      accessorKey: "claimant_phone",
      header: t.col_phone ?? "Phone",
      cell: ({ row }) => <TextCell value={row.original.claimant_phone} maxWidth="max-w-[120px]" muted />,
      enableSorting: false,
    },
    {
      accessorKey: "fpo_name",
      header: t.col_fpo ?? "FPO",
      cell: ({ row }) => <TextCell value={row.original.fpo_name} maxWidth="max-w-[200px]" />,
    },
    {
      accessorKey: "status",
      header: t.col_status ?? "Status",
      cell: ({ row }) => (
        <Badge variant="secondary" className={STATUS_BADGE[row.original.status]}>
          {STATUS_LABEL[row.original.status]}
        </Badge>
      ),
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
