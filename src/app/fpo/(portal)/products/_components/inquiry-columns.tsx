"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { type Inquiry, inquiriesApi } from "@/app/fpo/_api/inquiries";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";

type T = Record<string, string>;

function statusClasses(status: Inquiry["status"]): string {
  switch (status) {
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "contacted":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "resolved":
      return "border-green-200 bg-green-50 text-green-700";
  }
}

function InquiryActions({ inquiry, t }: { inquiry: Inquiry; t: T }) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["inquiries"] });

  const markContactedMutation = useMutation({
    mutationFn: () => inquiriesApi.markContacted(inquiry.id),
    onSuccess: () => {
      toast.success(t.toast_marked_contacted ?? "Inquiry marked as contacted");
      invalidate();
    },
    onError: () => toast.error(t.toast_error_contact ?? "Only pending inquiries can be marked as contacted"),
  });

  const markResolvedMutation = useMutation({
    mutationFn: () => inquiriesApi.markResolved(inquiry.id),
    onSuccess: () => {
      toast.success(t.toast_marked_resolved ?? "Inquiry marked as resolved");
      invalidate();
    },
    onError: () => toast.error(t.toast_error_resolve ?? "Only contacted inquiries can be marked as resolved"),
  });

  if (inquiry.status === "resolved") {
    return null;
  }

  return (
    <RowActions
      actions={[
        {
          label: t.action_mark_contacted ?? "Mark as Contacted",
          onClick: () => markContactedMutation.mutate(),
          hidden: inquiry.status !== "pending",
          disabled: markContactedMutation.isPending,
        },
        {
          label: t.action_mark_resolved ?? "Mark as Resolved",
          onClick: () => markResolvedMutation.mutate(),
          hidden: inquiry.status !== "contacted",
          disabled: markResolvedMutation.isPending,
        },
      ]}
    />
  );
}

export function getInquiryColumns(t: T): ColumnDef<Inquiry>[] {
  const statusLabels: Record<Inquiry["status"], string> = {
    pending: t.status_pending ?? "Pending",
    contacted: t.status_contacted ?? "Contacted",
    resolved: t.status_resolved ?? "Resolved",
  };

  return [
    {
      accessorKey: "product_name",
      header: t.col_product_name ?? "Product Name",
      cell: ({ row }) => <div className="font-medium">{row.original.product_name}</div>,
    },
    {
      accessorKey: "buyer_name",
      header: t.col_buyer ?? "Buyer",
      cell: ({ row }) => row.original.buyer_name,
    },
    {
      accessorKey: "quantity_requested",
      header: t.col_quantity_requested ?? "Quantity Requested",
      cell: ({ row }) => row.original.quantity_requested,
    },
    {
      accessorKey: "contact_name",
      header: t.col_contact_person ?? "Contact Person",
      cell: ({ row }) => row.original.contact_name ?? t.contact_unavailable ?? "Contact no longer available",
    },
    {
      accessorKey: "contact_phone",
      header: t.col_phone ?? "Phone",
      cell: ({ row }) => row.original.contact_phone ?? "—",
    },
    {
      accessorKey: "contact_email",
      header: t.col_email ?? "Email",
      cell: ({ row }) => row.original.contact_email ?? "—",
    },
    {
      accessorKey: "message",
      header: t.col_message ?? "Message",
      cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.original.message || "—"}</span>,
    },
    {
      accessorKey: "created_at",
      header: t.col_date_received ?? "Date Received",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{new Date(row.original.created_at).toLocaleDateString()}</span>
      ),
    },
    {
      accessorKey: "status",
      header: t.col_status ?? "Status",
      cell: ({ row }) => (
        <Badge variant="outline" className={statusClasses(row.original.status)}>
          {statusLabels[row.original.status]}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <InquiryActions inquiry={row.original} t={t} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
