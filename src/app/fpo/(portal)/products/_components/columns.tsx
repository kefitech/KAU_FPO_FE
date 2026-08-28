"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { productsApi } from "@/app/fpo/_api/products";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { useConfirmStore } from "@/stores/confirm-store";
import type { Product, ProductStatus } from "@/types/fpo";

type T = Record<string, string>;

function statusClasses(status: ProductStatus): string {
  switch (status) {
    case "draft":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "active":
      return "border-green-200 bg-green-50 text-green-700";
    case "sold":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "expired":
      return "border-red-200 bg-red-50 text-red-700";
  }
}

function ProductActions({ product, t, tCommon }: { product: Product; t: T; tCommon: T }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["products"] });

  const publishMutation = useMutation({
    mutationFn: () => productsApi.publish(product.id),
    onSuccess: () => {
      toast.success(t.toast_published ?? "Product published");
      invalidate();
    },
    onError: () => toast.error(t.err_publish_failed ?? "Only draft products can be published"),
  });

  const markSoldMutation = useMutation({
    mutationFn: () => productsApi.markSold(product.id),
    onSuccess: () => {
      toast.success(t.toast_marked_sold ?? "Product marked as sold");
      invalidate();
    },
    onError: () => toast.error(t.err_mark_sold_failed ?? "Only active products can be marked sold"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => productsApi.delete(product.id),
    onSuccess: () => {
      toast.success(t.toast_deleted ?? "Product deleted");
      invalidate();
    },
    onError: () => toast.error(t.err_delete_failed ?? "Only draft products can be deleted"),
  });

  const handleDelete = () => {
    confirm({
      title: t.confirm_delete_title ?? "Delete Product",
      description:
        t.confirm_delete_description ?? "Are you sure you want to delete this product? This action cannot be undone.",
      onConfirm: () => deleteMutation.mutateAsync(),
    });
  };

  return (
    <RowActions
      actions={[
        {
          label: tCommon.edit ?? "Edit",
          onClick: () => router.push(`/fpo/products/${product.id}/edit`),
          hidden: product.status === "sold" || product.status === "expired",
        },
        {
          label: t.action_publish ?? "Publish",
          onClick: () => publishMutation.mutate(),
          hidden: product.status !== "draft",
        },
        {
          label: t.action_mark_sold ?? "Mark Sold",
          onClick: () => markSoldMutation.mutate(),
          hidden: product.status !== "active",
        },
        {
          label: tCommon.delete ?? "Delete",
          onClick: handleDelete,
          hidden: product.status !== "draft",
        },
      ]}
    />
  );
}

export function getProductColumns(t: T = {}, tCommon: T = {}): ColumnDef<Product>[] {
  return [
    {
      accessorKey: "name",
      header: t.col_name ?? "Name",
      cell: ({ row }) => <div className="font-medium">{row.original.name.en}</div>,
    },
    {
      accessorKey: "quantity",
      header: t.col_quantity ?? "Quantity",
      cell: ({ row }) => (
        <span>
          {row.original.quantity} {row.original.unit}
        </span>
      ),
    },
    {
      accessorKey: "price_per_unit",
      header: t.col_price ?? "Price",
      cell: ({ row }) => <span>₹{row.original.price_per_unit}</span>,
    },
    {
      accessorKey: "status",
      header: t.col_status ?? "Status",
      cell: ({ row }) => (
        <Badge variant="outline" className={statusClasses(row.original.status)}>
          {t[`status_${row.original.status}`] ?? row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "is_public",
      header: t.col_public ?? "Public",
      cell: ({ row }) =>
        row.original.is_public ? (
          <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
            {tCommon.yes ?? "Yes"}
          </Badge>
        ) : (
          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
            {tCommon.no ?? "No"}
          </Badge>
        ),
    },
    {
      accessorKey: "available_from",
      header: t.col_available ?? "Available",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.original.available_from}
          {row.original.available_until ? ` – ${row.original.available_until}` : ""}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        // No actions are ever available on sold/expired products (every
        // individual action below is already gated to hide for these
        // statuses) — so skip rendering the "..." trigger entirely rather
        // than showing an empty menu.
        if (row.original.status === "sold" || row.original.status === "expired") {
          return null;
        }
        return <ProductActions product={row.original} t={t} tCommon={tCommon} />;
      },
    },
  ];
}
