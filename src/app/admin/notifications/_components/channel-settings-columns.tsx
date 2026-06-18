"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { channelSettingsApi } from "@/app/admin/_api/notification-channel-settings";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { useConfirmStore } from "@/stores/confirm-store";
import type { ChannelSetting } from "@/types";

type T = Record<string, string>;

const CHANNEL_STYLES: Record<string, string> = {
  email: "border-blue-200 bg-blue-50 text-blue-700",
  sms: "border-green-200 bg-green-50 text-green-700",
  in_app: "border-purple-200 bg-purple-50 text-purple-700",
};

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  in_app: "In-App",
};

function getConfigPreview(config: string | Record<string, unknown>): string {
  try {
    const parsed = typeof config === "string" ? JSON.parse(config) : config;
    const keys = Object.keys(parsed);
    if (!keys.length) return "—";
    return keys.join(", ");
  } catch {
    return "—";
  }
}

function ChannelSettingActions({
  item,
  onTest,
  tConfirm,
  tCommon,
}: {
  item: ChannelSetting;
  onTest: (item: ChannelSetting) => void;
  tConfirm: T;
  tCommon: T;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const toggleMutation = useMutation({
    mutationFn: () => (item.is_active ? channelSettingsApi.deactivate(item.id) : channelSettingsApi.activate(item.id)),
    onSuccess: () => {
      toast.success(`Channel ${item.is_active ? "deactivated" : "activated"}`);
      queryClient.invalidateQueries({ queryKey: ["channel-settings"] });
    },
    onError: () => toast.error(tCommon.action_failed ?? "Action failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => channelSettingsApi.delete(item.id),
    onSuccess: () => {
      toast.success(`${item.channel_display ?? CHANNEL_LABELS[item.channel] ?? item.channel} setting deleted`);
      queryClient.invalidateQueries({ queryKey: ["channel-settings"] });
    },
    onError: () => toast.error(tCommon.delete_failed ?? "Failed to delete"),
  });

  function handleDelete() {
    confirm({
      title: tConfirm.delete_channel_setting ?? "Delete Channel Setting",
      description: `Are you sure you want to delete the ${item.channel_display ?? CHANNEL_LABELS[item.channel] ?? item.channel} channel setting? This action cannot be undone.`,
      onConfirm: () => deleteMutation.mutateAsync(),
    });
  }

  return (
    <RowActions
      actions={[
        {
          label: tCommon.edit ?? "Edit",
          onClick: () => router.push(`/admin/notification-channel-settings/${item.id}/edit`),
        },
        {
          label: item.is_active ? (tCommon.deactivate ?? "Deactivate") : (tCommon.activate ?? "Activate"),
          onClick: () => toggleMutation.mutate(),
          disabled: toggleMutation.isPending,
        },
        { label: tCommon.send_test ?? "Send Test", onClick: () => onTest(item) },
        { label: tCommon.delete_btn ?? "Delete", onClick: handleDelete, destructive: true, separator: true },
      ]}
    />
  );
}

export function getChannelSettingsColumns(
  onTest: (item: ChannelSetting) => void,
  t: T = {},
  tConfirm: T = {},
  tCommon: T = {},
): ColumnDef<ChannelSetting>[] {
  return [
    {
      accessorKey: "channel",
      header: t.col_channel ?? "Channel",
      cell: ({ row }) => (
        <Badge variant="outline" className={CHANNEL_STYLES[row.original.channel] ?? ""}>
          {row.original.channel_display ?? CHANNEL_LABELS[row.original.channel] ?? row.original.channel}
        </Badge>
      ),
    },
    {
      accessorKey: "config",
      header: t.col_config ?? "Configuration",
      cell: ({ row }) => {
        const preview = getConfigPreview(row.original.config);
        return <span className="font-mono text-muted-foreground text-xs">{preview}</span>;
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
      accessorKey: "updated_at",
      header: t.col_updated ?? "Last Updated",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{new Date(row.original.updated_at).toLocaleDateString()}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <ChannelSettingActions item={row.original} onTest={onTest} tConfirm={tConfirm} tCommon={tCommon} />
      ),
    },
  ];
}
