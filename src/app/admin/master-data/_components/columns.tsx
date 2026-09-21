"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import {
  type MasterCategory,
  type MasterDataEntry,
  masterDataAdminApi,
  masterDataQueryKey,
} from "@/app/admin/_api/master-data";
import { CodeCell, TextCell } from "@/components/data-table/cell-helpers";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { useConfirmStore } from "@/stores/confirm-store";

type T = Record<string, string>;

/** Turns the API's 409 body, e.g. { in_use: { "FPO.bank_name": 2 } }, into a readable message. */
function errorMessage(error: unknown, fallback: string) {
  const err = error as { message?: string; data?: { errors?: { in_use?: Record<string, number> } } };
  const inUse = err?.data?.errors?.in_use;
  if (inUse) {
    const list = Object.entries(inUse)
      .map(([name, count]) => `${name} (${count})`)
      .join(", ");
    return `${err.message ?? fallback} Used by: ${list}.`;
  }
  return err?.message ?? fallback;
}

function EntryActions({
  category,
  entry,
  t,
  onEdit,
}: {
  category: MasterCategory;
  entry: MasterDataEntry;
  t: T;
  onEdit: (entry: MasterDataEntry) => void;
}) {
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const refresh = () => queryClient.invalidateQueries({ queryKey: [masterDataQueryKey(category)] });

  const toggleMutation = useMutation({
    mutationFn: () =>
      entry.is_active
        ? masterDataAdminApi.deactivate(category, entry.id)
        : masterDataAdminApi.activate(category, entry.id),
    onSuccess: () => {
      toast.success(entry.is_active ? (t.toast_deactivated ?? "Deactivated") : (t.toast_activated ?? "Activated"));
      refresh();
    },
    onError: (e: unknown) => toast.error(errorMessage(e, t.toast_failed ?? "Failed to update")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => masterDataAdminApi.delete(category, entry.id),
    onSuccess: () => {
      toast.success(t.toast_deleted ?? "Deleted");
      refresh();
    },
    onError: (e: unknown) => toast.error(errorMessage(e, t.toast_delete_failed ?? "Failed to delete")),
  });

  function handleDelete() {
    confirm({
      title: t.delete_title ?? "Delete Entry",
      description: (
        t.delete_description ??
        'Are you sure you want to delete "{name}"? This cannot be undone. Entries that are in use cannot be deleted — deactivate them instead.'
      ).replace("{name}", entry.name_en || entry.code),
      // The failure is already shown by the mutation's onError toast; swallow it here so the
      // confirm dialog doesn't rethrow the API's plain error object as an unhandled rejection.
      onConfirm: () => deleteMutation.mutateAsync().catch(() => undefined),
    });
  }

  return (
    <RowActions
      actions={[
        { label: t.action_edit ?? "Edit", onClick: () => onEdit(entry) },
        {
          label: entry.is_active ? (t.action_deactivate ?? "Deactivate") : (t.action_activate ?? "Activate"),
          onClick: () => toggleMutation.mutate(),
          separator: true,
        },
        { label: t.action_delete ?? "Delete", onClick: handleDelete, destructive: true, separator: true },
      ]}
    />
  );
}

export function getMasterDataColumns(
  category: MasterCategory,
  t: T,
  locale: string,
  onEdit: (entry: MasterDataEntry) => void,
): ColumnDef<MasterDataEntry>[] {
  const columns: ColumnDef<MasterDataEntry>[] = [
    {
      accessorKey: "code",
      header: t.col_code ?? "Code",
      cell: ({ row }) => <CodeCell value={row.original.code} />,
    },
    {
      id: "name",
      header: t.col_name ?? "Name",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <TextCell
            value={locale === "ml" ? row.original.name_ml || row.original.name_en : row.original.name_en}
            maxWidth="max-w-[280px]"
          />
          <TextCell
            value={locale === "ml" ? row.original.name_en : row.original.name_ml}
            maxWidth="max-w-[280px]"
            muted
          />
        </div>
      ),
    },
  ];

  if (category === "commodity") {
    columns.push({
      id: "section",
      header: t.col_section ?? "Section",
      enableSorting: false,
      meta: { hideOnMobile: true },
      cell: ({ row }) =>
        row.original.metadata?.section ? (
          <Badge variant="secondary" className="text-xs font-medium">
            {t[`section_${row.original.metadata.section}`] ?? row.original.metadata.section.replace(/_/g, " ")}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    });
  }

  columns.push(
    {
      accessorKey: "display_order",
      header: t.col_order ?? "Order",
      meta: { hideOnMobile: true },
      cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.display_order}</span>,
    },
    {
      accessorKey: "is_active",
      header: t.col_status ?? "Status",
      cell: ({ row }) => (
        <Badge
          variant="secondary"
          className={
            row.original.is_active
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-muted text-muted-foreground"
          }
        >
          {row.original.is_active ? (t.status_active ?? "Active") : (t.status_inactive ?? "Inactive")}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      meta: { width: "56px" },
      cell: ({ row }) => <EntryActions category={category} entry={row.original} t={t} onEdit={onEdit} />,
    },
  );

  return columns;
}
