"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { type Inquiry, inquiriesApi } from "@/app/fpo/_api/inquiries";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";

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

function InquiryActions({ inquiry }: { inquiry: Inquiry }) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["inquiries"] });

  const markContactedMutation = useMutation({
    mutationFn: () => inquiriesApi.markContacted(inquiry.id),
    onSuccess: () => {
      toast.success("Inquiry marked as contacted");
      invalidate();
    },
    onError: () => toast.error("Only pending inquiries can be marked as contacted"),
  });

  const markResolvedMutation = useMutation({
    mutationFn: () => inquiriesApi.markResolved(inquiry.id),
    onSuccess: () => {
      toast.success("Inquiry marked as resolved");
      invalidate();
    },
    onError: () => toast.error("Only contacted inquiries can be marked as resolved"),
  });

  if (inquiry.status === "resolved") {
    return null;
  }

  return (
    <RowActions
      actions={[
        {
          label: "Mark as Contacted",
          onClick: () => markContactedMutation.mutate(),
          hidden: inquiry.status !== "pending",
          disabled: markContactedMutation.isPending,
        },
        {
          label: "Mark as Resolved",
          onClick: () => markResolvedMutation.mutate(),
          hidden: inquiry.status !== "contacted",
          disabled: markResolvedMutation.isPending,
        },
      ]}
    />
  );
}

export function getInquiryColumns(): ColumnDef<Inquiry>[] {
  return [
    {
      accessorKey: "product_name",
      header: "Product Name",
      cell: ({ row }) => <div className="font-medium">{row.original.product_name}</div>,
    },
    {
      accessorKey: "buyer_name",
      header: "Buyer",
      cell: ({ row }) => row.original.buyer_name,
    },
    {
      accessorKey: "quantity_requested",
      header: "Quantity Requested",
      cell: ({ row }) => row.original.quantity_requested,
    },
    {
      accessorKey: "contact_name",
      header: "Contact Person",
      cell: ({ row }) => row.original.contact_name ?? "Contact no longer available",
    },
    {
      accessorKey: "contact_phone",
      header: "Phone",
      cell: ({ row }) => row.original.contact_phone ?? "—",
    },
    {
      accessorKey: "contact_email",
      header: "Email",
      cell: ({ row }) => row.original.contact_email ?? "—",
    },
    {
      accessorKey: "message",
      header: "Message",
      cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.original.message || "—"}</span>,
    },
    {
      accessorKey: "created_at",
      header: "Date Received",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{new Date(row.original.created_at).toLocaleDateString()}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="outline" className={statusClasses(row.original.status)}>
          {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <InquiryActions inquiry={row.original} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
