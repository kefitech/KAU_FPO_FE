"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { type MarketHubInquiry, marketHubInquiriesApi } from "@/app/fpo/_api/market-hub-inquiries";
import { TextCell } from "@/components/data-table/cell-helpers";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";

export function getStatusLabel(t: Record<string, string>): Record<MarketHubInquiry["status"], string> {
  return {
    suggested: t.status_mh_pending ?? "Pending",
    accepted: t.status_mh_accepted ?? "Resolved",
    rejected: t.status_mh_rejected ?? "Spam",
    completed: t.mh_status_completed ?? "Completed",
  };
}
export function statusClasses(status: MarketHubInquiry["status"]): string {
  switch (status) {
    case "suggested":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "accepted":
      return "border-green-200 bg-green-50 text-green-700";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";
    case "completed":
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

/** Accept/reject mutations shared by the row actions and the detail dialog. */
export function useMarketHubInquiryStatusActions(
  inquiryId: number,
  t: Record<string, string>,
  onDone?: (status: MarketHubInquiry["status"]) => void,
) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["market-hub-inquiries"] });

  const markAccepted = useMutation({
    mutationFn: () => marketHubInquiriesApi.markAccepted(inquiryId),
    onSuccess: () => {
      toast.success(t.toast_marked_accepted ?? "Inquiry marked as resolved");
      invalidate();
      onDone?.("accepted");
    },
    onError: () => toast.error(t.toast_error_accept ?? "Only pending inquiries can be marked as resolved"),
  });

  const markRejected = useMutation({
    mutationFn: () => marketHubInquiriesApi.markRejected(inquiryId),
    onSuccess: () => {
      toast.success(t.toast_marked_rejected ?? "Inquiry marked as spam");
      invalidate();
      onDone?.("rejected");
    },
    onError: () => toast.error(t.toast_error_reject ?? "Only pending inquiries can be marked as spam"),
  });

  return { markAccepted, markRejected };
}

function MarketHubInquiryActions({ inquiry, t }: { inquiry: MarketHubInquiry; t: Record<string, string> }) {
  const { markAccepted: markAcceptedMutation, markRejected: markRejectedMutation } =
    useMarketHubInquiryStatusActions(inquiry.id, t);

  if (inquiry.status !== "suggested") {
    return null;
  }

  return (
    <RowActions
      actions={[
        {
          label: t.action_mark_accepted ?? "Mark as Resolved",
          onClick: () => markAcceptedMutation.mutate(),
          disabled: markAcceptedMutation.isPending,
        },
        {
          label: t.action_mark_rejected ?? "Mark as Spam",
          onClick: () => markRejectedMutation.mutate(),
          disabled: markRejectedMutation.isPending,
          destructive: true,
        },
      ]}
    />
  );
}

/** `canManage` (can_manage_products) — without it the accept/reject actions are hidden (view-only). */
export function getMarketHubInquiryColumns(
  t: Record<string, string> = {},
  canManage = true,
): ColumnDef<MarketHubInquiry>[] {
  const statusLabel = getStatusLabel(t);

  return [
    {
      accessorKey: "product_name",
      header: t.col_product_name ?? "Product Name",
      cell: ({ row }) => <div className="font-medium">{row.original.product_name}</div>,
    },
    {
      accessorKey: "batch_number",
      header: t.col_batch ?? "Batch",
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.batch_number ?? "—"}</span>,
    },
    {
      accessorKey: "name",
      header: t.col_name ?? "Name",
      cell: ({ row }) => row.original.name,
    },
    {
      accessorKey: "email",
      header: t.col_email ?? "Email",
      cell: ({ row }) => row.original.email,
    },
    {
      accessorKey: "phone",
      header: t.col_phone ?? "Phone",
      cell: ({ row }) => row.original.phone || "—",
    },
    {
      accessorKey: "message",
      header: t.col_message ?? "Message",
      // One line + ellipsis; full text on hover and in the row's detail dialog.
      cell: ({ row }) => <TextCell value={row.original.message} muted />,
    },
    {
      accessorKey: "created_at",
      header: t.col_date_received ?? "Date Received",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: t.col_status ?? "Status",
      cell: ({ row }) => (
        <Badge variant="outline" className={statusClasses(row.original.status)}>
          {statusLabel[row.original.status]}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (canManage ? <MarketHubInquiryActions inquiry={row.original} t={t} /> : null),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}