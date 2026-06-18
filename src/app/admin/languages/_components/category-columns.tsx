"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { translationCategoryApi } from "@/app/admin/_api/translation-category";
import { CodeCell, TextCell } from "@/components/data-table/cell-helpers";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { useConfirmStore } from "@/stores/confirm-store";
import type { TranslationCategory } from "@/types";

type T = Record<string, string>;

function CategoryActions({ category, tCommon }: { category: TranslationCategory; tCommon: T }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const deleteMutation = useMutation({
    mutationFn: () => translationCategoryApi.delete(category.id),
    onSuccess: () => {
      toast.success(`"${category.name}" deleted`);
      queryClient.invalidateQueries({ queryKey: ["translation-categories"] });
    },
    onError: () => toast.error(tCommon.delete_failed ?? "Failed to delete"),
  });

  function handleDelete() {
    confirm({
      title: "Delete Category",
      description: `Are you sure you want to delete "${category.name}"? All translations in this category will also be removed. This action cannot be undone.`,
      onConfirm: () => deleteMutation.mutateAsync(),
    });
  }

  return (
    <RowActions
      actions={[
        { label: tCommon.edit ?? "Edit", onClick: () => router.push(`/admin/categories/${category.id}/edit`) },
        { label: tCommon.delete_btn ?? "Delete", onClick: handleDelete, destructive: true, separator: true },
      ]}
    />
  );
}

export function getCategoryColumns(t: T = {}, tCommon: T = {}): ColumnDef<TranslationCategory>[] {
  return [
    {
      accessorKey: "name",
      header: t.col_name ?? "Name",
      cell: ({ row }) => <TextCell value={row.original.name} />,
    },
    {
      accessorKey: "code",
      header: t.col_code ?? "Code",
      cell: ({ row }) => <CodeCell value={row.original.code} />,
    },
    {
      accessorKey: "description",
      meta: { width: "40%" },
      header: t.col_description ?? "Description",
      cell: ({ row }) => <TextCell value={row.original.description} muted />,
    },
    {
      accessorKey: "translation_count",
      header: t.col_translations ?? "Translations",
      cell: ({ row }) => <Badge variant="secondary">{row.original.translation_count}</Badge>,
    },
    {
      accessorKey: "display_order",
      header: t.col_order ?? "Order",
      cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.original.display_order}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <CategoryActions category={row.original} tCommon={tCommon} />,
    },
  ];
}
