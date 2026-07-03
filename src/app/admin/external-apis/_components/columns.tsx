"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { externalApisApi } from "@/app/admin/_api/external-apis";
import { TextCell } from "@/components/data-table/cell-helpers";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { useConfirmStore } from "@/stores/confirm-store";
import type { ExternalApi } from "@/types/admin";

type T = Record<string, string>;

const CHANNEL_STYLES: Record<string, string> = {
  email: "border-blue-200 bg-blue-50 text-blue-700",
  sms: "border-green-200 bg-green-50 text-green-700",
  in_app: "border-purple-200 bg-purple-50 text-purple-700",
};

function ExternalApiActions({
  item,
  t,
  tCommon,
  onEdit,
}: {
  item: ExternalApi;
  t: T;
  tCommon: T;
  onEdit: (item: ExternalApi) => void;
}) {
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const activateMutation = useMutation({
    mutationFn: () => externalApisApi.activate(item.id),
    onSuccess: () => {
      toast.success(t.toast_activated ?? "External API activated");
      queryClient.invalidateQueries({ queryKey: ["external-apis"] });
    },
    onError: () => toast.error(tCommon.update_failed ?? "Failed to activate"),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => externalApisApi.deactivate(item.id),
    onSuccess: () => {
      toast.success(t.toast_deactivated ?? "External API deactivated");
      queryClient.invalidateQueries({ queryKey: ["external-apis"] });
    },
    onError: () => toast.error(tCommon.update_failed ?? "Failed to deactivate"),
  });

  function handleToggle() {
    if (item.is_active) {
      confirm({
        title: t.deactivate_title ?? "Deactivate API",
        description: (
          t.deactivate_description ??
          'Deactivate "{name}"? Live verification will fall back to format-only validation.'
        ).replace("{name}", item.service_display),
        onConfirm: () => deactivateMutation.mutateAsync(),
      });
    } else {
      activateMutation.mutate();
    }
  }

  const isPending = activateMutation.isPending || deactivateMutation.isPending;

  return (
    <RowActions
      actions={[
        { label: tCommon.edit ?? "Edit", onClick: () => onEdit(item) },
        {
          label: item.is_active ? (tCommon.deactivate ?? "Deactivate") : (tCommon.activate ?? "Activate"),
          onClick: handleToggle,
          disabled: isPending,
          separator: true,
        },
      ]}
    />
  );
}

export function getExternalApiColumns(
  t: T,
  tCommon: T,
  onEdit: (item: ExternalApi) => void,
): ColumnDef<ExternalApi>[] {
  return [
    {
      accessorKey: "service_display",
      header: t.col_service ?? "Service",
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <TextCell value={row.original.service_display} maxWidth="max-w-[160px]" />
          <TextCell value={row.original.service} maxWidth="max-w-[160px]" muted mono />
        </div>
      ),
    },
    {
      accessorKey: "api_url",
      header: t.col_api_url ?? "API URL",
      cell: ({ row }) => (
        <TextCell
          value={row.original.api_url || (t.no_url ?? "Not set")}
          maxWidth="max-w-[260px]"
          muted
          mono={!!row.original.api_url}
        />
      ),
    },
    {
      accessorKey: "is_active",
      header: t.col_status ?? "Status",
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge variant="outline" className="border-green-500/40 bg-green-500/10 text-[11px] text-green-700 dark:text-green-400">
            {tCommon.badge_active ?? "Active"}
          </Badge>
        ) : (
          <Badge variant="outline" className="border-muted text-[11px] text-muted-foreground">
            {tCommon.badge_inactive ?? "Inactive"}
          </Badge>
        ),
      enableSorting: false,
    },
    {
      accessorKey: "updated_at",
      header: t.col_updated ?? "Last Updated",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {new Date(row.original.updated_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => <ExternalApiActions item={row.original} t={t} tCommon={tCommon} onEdit={onEdit} />,
    },
  ];
}
