"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { adminSchemesApi } from "@/app/admin/_api/schemes";
import { TextCell } from "@/components/data-table/cell-helpers";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { useConfirmStore } from "@/stores/confirm-store";
import type { AdminScheme } from "@/types/admin";

type T = Record<string, string>;

function SchemeActions({ scheme, t, tCommon }: { scheme: AdminScheme; t: T; tCommon: T }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const activateMutation = useMutation({
    mutationFn: () =>
      scheme.is_active ? adminSchemesApi.deactivate(scheme.id) : adminSchemesApi.activate(scheme.id),
    onSuccess: () => {
      toast.success(scheme.is_active ? (t.toast_deactivated ?? "Scheme deactivated") : (t.toast_activated ?? "Scheme activated"));
      queryClient.invalidateQueries({ queryKey: ["schemes"] });
    },
    onError: (error: unknown) => {
      const msg = (error as { message?: string })?.message;
      toast.error(msg ?? (tCommon.update_failed ?? "Failed to update scheme status"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminSchemesApi.delete(scheme.id),
    onSuccess: () => {
      toast.success(t.toast_deleted ?? "Scheme deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["schemes"] });
    },
    onError: (error: unknown) => {
      const msg = (error as { message?: string })?.message;
      toast.error(msg ?? (tCommon.delete_failed ?? "Failed to delete scheme"));
    },
  });

  function handleDelete() {
    confirm({
      title: t.delete_title ?? "Delete Scheme",
      description: (t.delete_description ?? 'Are you sure you want to delete "{name}"? This action cannot be undone.').replace("{name}", scheme.name_en ?? ""),
      onConfirm: () => deleteMutation.mutateAsync(),
    });
  }

  return (
    <RowActions
      actions={[
        { label: t.action_edit ?? "Edit", onClick: () => router.push(`/admin/schemes/${scheme.id}/edit`) },
        {
          label: scheme.is_active ? (t.action_deactivate ?? "Deactivate") : (t.action_activate ?? "Activate"),
          onClick: () => activateMutation.mutate(),
          separator: true,
        },
        { label: t.action_delete ?? "Delete", onClick: handleDelete, destructive: true, separator: true },
      ]}
    />
  );
}

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  credit: "bg-blue-100 text-blue-700",
  insurance: "bg-purple-100 text-purple-700",
  marketing: "bg-green-100 text-green-700",
  infrastructure: "bg-orange-100 text-orange-700",
  capacity_building: "bg-yellow-100 text-yellow-700",
};

export function getSchemeColumns(t: T = {}, tCommon: T = {}): ColumnDef<AdminScheme>[] {
  return [
    {
      accessorKey: "name_en",
      header: t.col_name ?? "Name",
      cell: ({ row }) => <TextCell value={row.original.name_en} maxWidth="max-w-[280px]" />,
    },
    {
      accessorKey: "administering_body",
      header: t.col_administering_body ?? "Administering Body",
      meta: { hideOnMobile: true },
      cell: ({ row }) => <TextCell value={row.original.administering_body} maxWidth="max-w-[200px]" muted />,
    },
    {
      accessorKey: "category_display",
      header: t.col_category ?? "Category",
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const color = CATEGORY_BADGE_COLORS[row.original.category] ?? "bg-muted text-muted-foreground";
        return (
          <Badge className={`text-xs font-medium ${color}`} variant="secondary">
            {t[`cat_${row.original.category}`] ?? row.original.category_display}
          </Badge>
        );
      },
    },
    {
      accessorKey: "is_active",
      header: t.col_status ?? "Status",
      enableSorting: false,
      cell: ({ row }) => (
        <Badge
          variant="secondary"
          className={
            row.original.is_active
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-muted text-muted-foreground"
          }
        >
          {row.original.is_active ? (tCommon.badge_active ?? "Active") : (tCommon.badge_inactive ?? "Inactive")}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => <SchemeActions scheme={row.original} t={t} tCommon={tCommon} />,
    },
  ];
}
