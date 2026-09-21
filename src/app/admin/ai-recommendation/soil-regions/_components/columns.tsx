"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { adminSoilRegionsApi, type SoilRegionVersion } from "@/app/admin/_api/soil-regions";
import { Badge } from "@/components/ui/badge";
import { useConfirmStore } from "@/stores/confirm-store";
import { RowActions } from "@/components/data-table/row-actions";

type T = Record<string, string>;

function StatusAndActions({ version, t }: { version: SoilRegionVersion; t: T }) {
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const activateMutation = useMutation({
    mutationFn: () => adminSoilRegionsApi.activate(version.id),
    onSuccess: (result) => {
      toast.success(
        (t.toast_activated ?? "Soil regions updated: {regions}").replace(
          "{regions}",
          result.upserted_regions.join(", "),
        ),
      );
      queryClient.invalidateQueries({ queryKey: ["soil-region-versions"] });
      queryClient.invalidateQueries({ queryKey: ["soil-regions-map"] });
    },
    onError: (error: unknown) => {
      const msg = (error as { message?: string })?.message;
      toast.error(msg ?? t.toast_activate_failed ?? "Failed to activate this version");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminSoilRegionsApi.delete(version.id),
    onSuccess: () => {
      toast.success((t.toast_deleted ?? 'Deleted "{label}"').replace("{label}", version.label));
      queryClient.invalidateQueries({ queryKey: ["soil-region-versions"] });
    },
    onError: (error: unknown) => {
      const msg = (error as { message?: string })?.message;
      toast.error(msg ?? t.toast_delete_failed ?? "Failed to delete this version");
    },
  });

  function handleDelete() {
    confirm({
      title: t.delete_confirm_title ?? "Delete Soil Region Version",
      description: (t.delete_confirm_desc ?? 'Are you sure you want to delete "{label}"? This cannot be undone.').replace(
        "{label}",
        version.label,
      ),
      onConfirm: () => deleteMutation.mutateAsync(),
    });
  }

  const actions = [
    ...(!version.is_active
      ? [{ label: t.action_activate ?? "Activate", onClick: () => activateMutation.mutate() }]
      : []),
    ...(!version.is_active
      ? [{ label: t.action_delete ?? "Delete", onClick: handleDelete, destructive: true, separator: true }]
      : []),
  ];

  return (
    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
      {version.is_active ? (
        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          {t.badge_active ?? "Active"}
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          {t.badge_inactive ?? "Inactive"}
        </Badge>
      )}
      {actions.length > 0 && <RowActions actions={actions} />}
    </div>
  );
}

export function getSoilRegionVersionColumns(t: T): ColumnDef<SoilRegionVersion>[] {
  return [
    {
      accessorKey: "label",
      header: t.col_file ?? "File",
      cell: ({ row }) => <span className="font-medium">{row.original.label}</span>,
    },
    {
      accessorKey: "created_at",
      header: t.col_uploaded ?? "Uploaded",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {new Date(row.original.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => <StatusAndActions version={row.original} t={t} />,
    },
  ];
}
