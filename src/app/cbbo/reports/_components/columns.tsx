"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import type { CBBOReportListItem, ReportStatus } from "@/types/cbbo";

type T = Record<string, string>;

export function ReportStatusBadge({ status, t }: { status: ReportStatus; t: T }) {
  return status === "submitted" ? (
    <Badge
      variant="outline"
      className="border-green-500/40 bg-green-500/10 text-[11px] text-green-700 dark:text-green-400"
    >
      {t.status_submitted ?? "Submitted"}
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="border-yellow-500/40 bg-yellow-500/10 text-[11px] text-yellow-700 dark:text-yellow-400"
    >
      {t.status_draft ?? "Draft"}
    </Badge>
  );
}

interface ReportColumnOptions {
  t: T;
  getDistrictLabel: (code: string | undefined, fallback: string | undefined) => string;
  onView: (report: CBBOReportListItem) => void;
  onEdit: (report: CBBOReportListItem) => void;
  onDelete: (report: CBBOReportListItem) => void;
}

export function getReportColumns({
  t,
  getDistrictLabel,
  onView,
  onEdit,
  onDelete,
}: ReportColumnOptions): ColumnDef<CBBOReportListItem>[] {
  return [
    {
      accessorKey: "fpo_name",
      header: t.col_fpo ?? "FPO",
      cell: ({ row }) => <span className="font-medium">{row.original.fpo_name}</span>,
    },
    {
      accessorKey: "district",
      header: t.col_district ?? "District",
      meta: { hideOnMobile: true },
      cell: ({ row }) => (
        <span className="text-sm">{getDistrictLabel(row.original.district, row.original.district_display)}</span>
      ),
    },
    {
      accessorKey: "date",
      header: t.col_date ?? "Date",
      cell: ({ row }) => <span className="text-sm">{new Date(row.original.date).toLocaleDateString()}</span>,
    },
    {
      accessorKey: "participants_count",
      header: t.col_participants ?? "Participants",
      meta: { hideOnMobile: true },
    },
    {
      accessorKey: "status",
      header: t.col_status ?? "Status",
      cell: ({ row }) => <ReportStatusBadge status={row.original.status} t={t} />,
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const report = row.original;
        // Submitted reports are locked, so only drafts can be edited or deleted
        const isDraft = report.status === "draft";
        return (
          <RowActions
            actions={[
              { label: t.action_view ?? t.view ?? "View", onClick: () => onView(report) },
              {
                label: t.action_edit ?? t.edit ?? "Edit",
                onClick: () => onEdit(report),
                separator: true,
                hidden: !isDraft,
              },
              {
                label: t.action_delete ?? t.delete ?? "Delete",
                onClick: () => onDelete(report),
                destructive: true,
                hidden: !isDraft,
              },
            ]}
          />
        );
      },
    },
  ];
}
