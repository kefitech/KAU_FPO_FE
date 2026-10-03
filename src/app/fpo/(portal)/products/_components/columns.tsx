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

/**
 * Short summary of how many batches each product has, bucketed by status.
 * Shown in the Batches column so the FPO sees "2 active + 1 draft" at a
 * glance without having to open the Manage Batches sheet.
 */
function batchSummary(product: Product, t: T): string {
  const buckets: Record<ProductStatus, number> = { draft: 0, active: 0, sold: 0, expired: 0 };
  for (const s of product.stocks) buckets[s.status] += 1;
  const parts: string[] = [];
  if (buckets.active) parts.push(`${buckets.active} ${t.status_active ?? "active"}`);
  if (buckets.draft) parts.push(`${buckets.draft} ${t.status_draft ?? "draft"}`);
  if (buckets.sold) parts.push(`${buckets.sold} ${t.status_sold ?? "sold"}`);
  if (buckets.expired) parts.push(`${buckets.expired} ${t.status_expired ?? "expired"}`);
  return parts.length === 0 ? (t.no_batches ?? "No batches") : parts.join(" · ");
}

function ProductActions({
  product,
  t,
  tCommon,
  onManageBatches,
}: {
  product: Product;
  t: T;
  tCommon: T;
  onManageBatches: (product: Product) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["products"] });

  const deleteMutation = useMutation({
    mutationFn: () => productsApi.delete(product.id),
    onSuccess: () => {
      toast.success(t.toast_deleted ?? "Product deleted");
      invalidate();
    },
    onError: () =>
      toast.error(
        t.err_delete_failed ?? "Only products with no active/sold/expired batches can be deleted",
      ),
  });

  const handleDelete = () => {
    confirm({
      title: t.confirm_delete_title ?? "Delete Product",
      description:
        t.confirm_delete_description ??
        "Are you sure you want to delete this product? This action cannot be undone.",
      onConfirm: () => deleteMutation.mutateAsync(),
    });
  };

  return (
    <RowActions
      actions={[
        {
          label: t.action_manage_batches ?? "Manage Batches",
          onClick: () => onManageBatches(product),
        },
        {
          label: tCommon.edit ?? "Edit Product",
          onClick: () => router.push(`/fpo/products/${product.id}/edit`),
        },
        {
          label: tCommon.delete ?? "Delete",
          onClick: handleDelete,
          // A product can only be deleted when it has nothing but draft
          // batches (or no batches). The backend enforces this too; we
          // just hide the action to avoid a confusing 422.
          hidden: product.stocks.some((s) => s.status !== "draft"),
        },
      ]}
    />
  );
}

export function getProductColumns(
  t: T = {},
  tCommon: T = {},
  callbacks: { onManageBatches: (product: Product) => void },
): ColumnDef<Product>[] {
  return [
    {
      accessorKey: "name",
      header: t.col_name ?? "Name",
      cell: ({ row }) => <div className="font-medium">{row.original.name.en}</div>,
    },
    {
      id: "batches",
      header: t.col_batches ?? "Batches",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{batchSummary(row.original, t)}</span>
      ),
    },
    {
      id: "quantity",
      header: t.col_quantity ?? "Latest Qty",
      cell: ({ row }) => {
        const s = row.original.latest_stock;
        if (!s) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <span>
            {s.quantity} {s.unit}
          </span>
        );
      },
    },
    {
      id: "price_per_unit",
      header: t.col_price ?? "Latest Price",
      cell: ({ row }) => {
        const s = row.original.latest_stock;
        if (!s) return <span className="text-muted-foreground text-sm">—</span>;
        return <span>₹{s.price_per_unit}</span>;
      },
    },
    {
      id: "status",
      header: t.col_status ?? "Latest Status",
      cell: ({ row }) => {
        const s = row.original.latest_stock;
        if (!s)
          return (
            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
              {t.no_stock ?? "No stock"}
            </Badge>
          );
        return (
          <Badge variant="outline" className={statusClasses(s.status)}>
            {t[`status_${s.status}`] ?? s.status}
          </Badge>
        );
      },
    },
    {
      id: "is_public",
      header: t.col_public ?? "Public",
      cell: ({ row }) => {
        const s = row.original.latest_stock;
        return s?.is_public ? (
          <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
            {tCommon.yes ?? "Yes"}
          </Badge>
        ) : (
          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
            {tCommon.no ?? "No"}
          </Badge>
        );
      },
    },
    {
      id: "available_from",
      header: t.col_available ?? "Available",
      cell: ({ row }) => {
        const s = row.original.latest_stock;
        if (!s) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <span className="text-muted-foreground text-sm">
            {s.available_from}
            {s.available_until ? ` – ${s.available_until}` : ""}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <ProductActions
          product={row.original}
          t={t}
          tCommon={tCommon}
          onManageBatches={callbacks.onManageBatches}
        />
      ),
    },
  ];
}
