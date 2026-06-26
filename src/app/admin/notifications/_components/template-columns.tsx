"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";

import { notificationTemplateApi } from "@/app/admin/_api/notification-template";
import { TextCell } from "@/components/data-table/cell-helpers";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { useConfirmStore } from "@/stores/confirm-store";
import type { NotificationTemplate } from "@/types";

type T = Record<string, string>;

const CHANNEL_STYLES: Record<string, string> = {
  email: "border-blue-200 bg-blue-50 text-blue-700",
  sms: "border-green-200 bg-green-50 text-green-700",
  in_app: "border-purple-200 bg-purple-50 text-purple-700",
  push: "border-orange-200 bg-orange-50 text-orange-700",
};

function TemplateActions({
  item,
  onTestRender,
  t,
  tConfirm,
  tCommon,
}: {
  item: NotificationTemplate;
  onTestRender: (item: NotificationTemplate) => void;
  t: T;
  tConfirm: T;
  tCommon: T;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const toggleMutation = useMutation({
    mutationFn: () =>
      item.is_active ? notificationTemplateApi.deactivate(item.id) : notificationTemplateApi.activate(item.id),
    onSuccess: () => {
      toast.success(`Template ${item.is_active ? "deactivated" : "activated"}`);
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
    },
    onError: () => toast.error(tCommon.action_failed ?? "Action failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => notificationTemplateApi.delete(item.id),
    onSuccess: () => {
      toast.success("Template deleted");
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
      queryClient.invalidateQueries({ queryKey: ["notification-template-codes"] });
    },
    onError: () => toast.error(tCommon.delete_failed ?? "Failed to delete"),
  });

  function handleDelete() {
    confirm({
      title: tConfirm.delete_template ?? "Delete Template",
      description: `Are you sure you want to delete the ${item.language_name} version of "${item.template_code_detail.name}"? This action cannot be undone.`,
      onConfirm: () => deleteMutation.mutateAsync(),
    });
  }

  return (
    <RowActions
      actions={[
        { label: tCommon.edit ?? "Edit", onClick: () => router.push(`/admin/notification-templates/${item.id}/edit`) },
        {
          label: (
            <>
              <FlaskConical className="mr-2 h-4 w-4 text-blue-600" />
              {t.action_test_render ?? "Test Render"}
            </>
          ),
          onClick: () => onTestRender(item),
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

export function getTemplateColumns(
  onTestRender: (item: NotificationTemplate) => void,
  t: T = {},
  tConfirm: T = {},
  tCommon: T = {},
): ColumnDef<NotificationTemplate>[] {
  return [
    {
      accessorKey: "template_code_detail",
      header: t.col_code ?? "Template Code",
      cell: ({ row }) => {
        const tc = row.original.template_code_detail;
        return (
          <div>
            <p className="font-medium">{tc.name}</p>
            <code className="font-mono text-muted-foreground text-xs">{tc.code}</code>
          </div>
        );
      },
    },
    {
      accessorKey: "channel_display",
      header: t.col_channel ?? "Channel",
      cell: ({ row }) => (
        <Badge variant="outline" className={CHANNEL_STYLES[row.original.channel] ?? ""}>
          {row.original.channel_display}
        </Badge>
      ),
    },
    {
      accessorKey: "language_name",
      header: t.col_language ?? "Language",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{row.original.language_name}</span>
          <Badge variant="outline" className="px-1 py-0 font-mono text-xs">
            {row.original.language_code}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "subject",
      meta: { width: "30%" },
      header: t.col_subject ?? "Subject",
      cell: ({ row }) => (
        <span className="block truncate max-w-xs" title={row.original.subject}>
          <TextCell value={row.original.subject} muted />
        </span>
      ),
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
      cell: ({ row }) => (
        <TemplateActions item={row.original} onTestRender={onTestRender} t={t} tConfirm={tConfirm} tCommon={tCommon} />
      ),
    },
  ];
}
