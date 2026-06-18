"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { notificationTemplateCodeApi } from "@/app/admin/_api/notification-template-code";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { useConfirmStore } from "@/stores/confirm-store";
import type { NotificationTemplateCode } from "@/types";

type T = Record<string, string>;

const CHANNEL_STYLES: Record<string, string> = {
  email: "border-blue-200 bg-blue-50 text-blue-700",
  sms: "border-green-200 bg-green-50 text-green-700",
  in_app: "border-purple-200 bg-purple-50 text-purple-700",
  push: "border-orange-200 bg-orange-50 text-orange-700",
};

function TemplateCodeActions({ item, tConfirm, tCommon }: { item: NotificationTemplateCode; tConfirm: T; tCommon: T }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const toggleMutation = useMutation({
    mutationFn: () =>
      item.is_active ? notificationTemplateCodeApi.deactivate(item.id) : notificationTemplateCodeApi.activate(item.id),
    onSuccess: () => {
      toast.success(`Template code ${item.is_active ? "deactivated" : "activated"}`);
      queryClient.invalidateQueries({ queryKey: ["notification-template-codes"] });
    },
    onError: () => toast.error(tCommon.action_failed ?? "Action failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => notificationTemplateCodeApi.delete(item.id),
    onSuccess: () => {
      toast.success(`"${item.name}" deleted`);
      queryClient.invalidateQueries({ queryKey: ["notification-template-codes"] });
    },
    onError: () => toast.error(tCommon.delete_failed ?? "Failed to delete"),
  });

  function handleDelete() {
    confirm({
      title: tConfirm.delete_tmpl_code ?? "Delete Template Code",
      description: `Are you sure you want to delete "${item.name}"? This will also remove all language templates linked to this code. This action cannot be undone.`,
      onConfirm: () => deleteMutation.mutateAsync(),
    });
  }

  return (
    <RowActions
      actions={[
        {
          label: tCommon.edit ?? "Edit",
          onClick: () => router.push(`/admin/notification-template-codes/${item.id}/edit`),
        },
        {
          label: item.is_active ? "Deactivate" : "Activate",
          onClick: () => toggleMutation.mutate(),
          disabled: toggleMutation.isPending,
        },
        { label: tCommon.delete_btn ?? "Delete", onClick: handleDelete, destructive: true, separator: true },
      ]}
    />
  );
}

export function getTemplateCodeColumns(
  t: T = {},
  tConfirm: T = {},
  tCommon: T = {},
): ColumnDef<NotificationTemplateCode>[] {
  return [
    {
      accessorKey: "name",
      header: t.col_name ?? "Name",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <code className="font-mono text-muted-foreground text-xs">{row.original.code}</code>
        </div>
      ),
    },
    {
      accessorKey: "channel",
      header: t.col_channel ?? "Channel",
      cell: ({ row }) => (
        <Badge variant="outline" className={CHANNEL_STYLES[row.original.channel] ?? ""}>
          {row.original.channel_display}
        </Badge>
      ),
    },
    {
      accessorKey: "variables",
      header: t.col_variables ?? "Variables",
      cell: ({ row }) => {
        const vars = row.original.variables;
        if (!vars.length) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {vars.map((v) => (
              <code key={v} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                {`{${v}}`}
              </code>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "template_count",
      header: t.col_templates ?? "Templates",
      cell: ({ row }) => <span className="text-sm">{row.original.template_count}</span>,
    },
    {
      accessorKey: "missing_languages",
      header: t.col_missing ?? "Missing",
      cell: ({ row }) => {
        const missing = row.original.missing_languages;
        if (!missing.length) return <span className="text-green-600 text-sm">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {missing.map((lang) => (
              <Badge key={lang} variant="outline" className="border-red-200 bg-red-50 text-red-700 text-xs">
                {lang}
              </Badge>
            ))}
          </div>
        );
      },
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
      cell: ({ row }) => <TemplateCodeActions item={row.original} tConfirm={tConfirm} tCommon={tCommon} />,
    },
  ];
}
