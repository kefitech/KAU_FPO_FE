"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { type MarketHubInquiry, marketHubInquiriesApi } from "@/app/fpo/_api/market-hub-inquiries";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<MarketHubInquiry["status"], string> = {
  suggested: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  completed: "Completed",
};

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

function MarketHubInquiryActions({ inquiry }: { inquiry: MarketHubInquiry }) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["market-hub-inquiries"] });

  const markAcceptedMutation = useMutation({
    mutationFn: () => marketHubInquiriesApi.markAccepted(inquiry.id),
    onSuccess: () => {
      toast.success("Inquiry marked as accepted");
      invalidate();
    },
    onError: () => toast.error("Only pending inquiries can be marked as accepted"),
  });

  const markRejectedMutation = useMutation({
    mutationFn: () => marketHubInquiriesApi.markRejected(inquiry.id),
    onSuccess: () => {
      toast.success("Inquiry marked as rejected");
      invalidate();
    },
    onError: () => toast.error("Only pending inquiries can be marked as rejected"),
  });

  if (inquiry.status !== "suggested") {
    return null;
  }

  return (
    <RowActions
      actions={[
        {
          label: "Mark as Accepted",
          onClick: () => markAcceptedMutation.mutate(),
          disabled: markAcceptedMutation.isPending,
        },
        {
          label: "Mark as Rejected",
          onClick: () => markRejectedMutation.mutate(),
          disabled: markRejectedMutation.isPending,
          destructive: true,
        },
      ]}
    />
  );
}

export function getMarketHubInquiryColumns(): ColumnDef<MarketHubInquiry>[] {
  return [
    {
      accessorKey: "product_name",
      header: "Product Name",
      cell: ({ row }) => <div className="font-medium">{row.original.product_name}</div>,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => row.original.name,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.original.email,
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => row.original.phone || "—",
    },
    {
      accessorKey: "message",
      header: "Message",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{row.original.message || "—"}</span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Date Received",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="outline" className={statusClasses(row.original.status)}>
          {STATUS_LABEL[row.original.status]}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <MarketHubInquiryActions inquiry={row.original} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}