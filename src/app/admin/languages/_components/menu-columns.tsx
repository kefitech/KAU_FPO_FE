"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { menuApi } from "@/app/admin/_api/menu";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { getIcon } from "@/lib/utils/icon-map";
import { useConfirmStore } from "@/stores/confirm-store";
import type { AdminMenuItem } from "@/types/admin";

type T = Record<string, string>;

function MenuItemActions({ item, t, tCommon }: { item: AdminMenuItem; t: T; tCommon: T }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const toggleMutation = useMutation({
    mutationFn: () => (item.is_active ? menuApi.deactivate(item.id) : menuApi.activate(item.id)),
    onSuccess: () => {
      toast.success(
        item.is_active
          ? (t.toast_deactivated ?? "Menu item deactivated successfully")
          : (t.toast_activated ?? "Menu item activated successfully"),
      );
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
    },
    onError: () => toast.error(tCommon.action_failed ?? "Action failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => menuApi.delete(item.id),
    onSuccess: () => {
      toast.success(t.toast_deleted ?? "Menu item deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
    },
    onError: () => toast.error(tCommon.delete_failed ?? "Failed to delete"),
  });

  function handleDelete() {
    confirm({
      title: "Delete Menu Item",
      description: `Are you sure you want to delete "${item.label_key}"? This action cannot be undone.`,
      onConfirm: () => deleteMutation.mutateAsync(),
    });
  }

  return (
    <RowActions
      actions={[
        { label: tCommon.edit ?? "Edit", onClick: () => router.push(`/admin/menu-items/${item.id}/edit`) },
        {
          label: item.is_active ? (t.action_deactivate ?? "Deactivate") : (t.action_activate ?? "Activate"),
          onClick: () => toggleMutation.mutate(),
          disabled: toggleMutation.isPending,
        },
        { label: tCommon.delete_btn ?? "Delete", onClick: handleDelete, destructive: true, separator: true },
      ]}
    />
  );
}

export function getMenuColumns(t: T = {}, tCommon: T = {}): ColumnDef<AdminMenuItem>[] {
  return [
    {
      accessorKey: "label_key",
      header: t.col_label_key ?? "Label Key",
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-sm">{row.original.label}</span>
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs">
            {row.original.label_key}
          </code>
        </div>
      ),
    },
    {
      accessorKey: "path",
      header: t.col_path ?? "Path",
      cell: ({ row }) => <span className="font-mono text-muted-foreground text-sm">{row.original.path}</span>,
    },
    {
      accessorKey: "icon",
      header: t.col_icon ?? "Icon",
      cell: ({ row }) => {
        const Icon = getIcon(row.original.icon);
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{row.original.icon}</code>
          </div>
        );
      },
    },
    {
      accessorKey: "role_names",
      header: t.col_roles ?? "Roles",
      cell: ({ row }) => {
        const roles = row.original.role_names;
        if (!roles.length) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {roles.map((r: string) => (
              <Badge key={r} variant="outline" className="text-xs">
                {r}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "parent",
      header: t.col_parent ?? "Parent",
      cell: ({ row }) =>
        row.original.parent === null ? (
          <span className="text-muted-foreground text-xs">{t.no_parent ?? "Top Level"}</span>
        ) : (
          <span className="text-sm">{row.original.parent}</span>
        ),
    },
    {
      accessorKey: "order",
      header: t.col_order ?? "Order",
      cell: ({ row }) => <span className="text-sm">{row.original.order}</span>,
    },
    {
      accessorKey: "is_active",
      header: t.col_status ?? "Status",
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            {tCommon.badge_active ?? "Active"}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            {tCommon.badge_inactive ?? "Inactive"}
          </Badge>
        ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <MenuItemActions item={row.original} t={t} tCommon={tCommon} />,
    },
  ];
}
