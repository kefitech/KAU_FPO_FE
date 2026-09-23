"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { type MarketHubInquiry, marketHubInquiriesApi } from "@/app/fpo/_api/market-hub-inquiries";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";

function getStatusLabel(t: Record<string, string>): Record<MarketHubInquiry["status"], string> {
  return {
    suggested: t.status_mh_pending ?? "Pending",
    accepted: t.status_mh_accepted ?? "Accepted",
    rejected: t.status_mh_rejected ?? "Rejected",
    completed: t.mh_status_completed ?? "Completed",
  };
}
function statusClasses(status: MarketHubInquiry["status"]): string {
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

function MarketHubInquiryActions({ inquiry, t }: { inquiry: MarketHubInquiry; t: Record<string, string> }) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["market-hub-inquiries"] });

  const markAcceptedMutation = useMutation({
    mutationFn: () => marketHubInquiriesApi.markAccepted(inquiry.id),
    onSuccess: () => {
      toast.success(t.toast_marked_accepted ?? "Inquiry marked as accepted");
      invalidate();
    },
    onError: () => toast.error(t.toast_error_accept ?? "Only pending inquiries can be marked as accepted"),
  });

  const markRejectedMutation = useMutation({
    mutationFn: () => marketHubInquiriesApi.markRejected(inquiry.id),
    onSuccess: () => {
      toast.success(t.toast_marked_rejected ?? "Inquiry marked as rejected");
      invalidate();
    },
    onError: () => toast.error(t.toast_error_reject ?? "Only pending inquiries can be marked as rejected"),
  });

  if (inquiry.status !== "suggested") {
    return null;
  }

  return (
    <RowActions
      actions={[
        {
          label: t.action_mark_accepted ?? "Mark as Accepted",
          onClick: () => markAcceptedMutation.mutate(),
          disabled: markAcceptedMutation.isPending,
        },
        {
          label: t.action_mark_rejected ?? "Mark as Rejected",
          onClick: () => markRejectedMutation.mutate(),
          disabled: markRejectedMutation.isPending,
          destructive: true,
        },
      ]}
    />
  );
}

export function getMarketHubInquiryColumns(t: Record<string, string> = {}): ColumnDef<MarketHubInquiry>[] {
  const statusLabel = getStatusLabel(t);

  return [
    {
      accessorKey: "product_name",
      header: t.col_product_name ?? "Product Name",
      cell: ({ row }) => <div className="font-medium">{row.original.product_name}</div>,
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
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{row.original.message || "—"}</span>
      ),
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
      cell: ({ row }) => <MarketHubInquiryActions inquiry={row.original} t={t} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}