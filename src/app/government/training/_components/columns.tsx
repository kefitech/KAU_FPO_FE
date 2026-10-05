"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { BellDot, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { govtTrainingApi } from "@/app/government/_api/training";
import { TextCell } from "@/components/data-table/cell-helpers";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { useConfirmStore } from "@/stores/confirm-store";
import type { GovtTrainingSession } from "@/types/government";

type T = Record<string, string>;

function TrainingActions({
  session,
  t,
  tCommon,
  onView,
}: {
  session: GovtTrainingSession;
  t: T;
  tCommon: T;
  onView: (row: GovtTrainingSession) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const deleteMutation = useMutation({
    mutationFn: () => govtTrainingApi.remove(session.id),
    onSuccess: () => {
      toast.success(t.toast_deleted ?? "Training session deleted");
      queryClient.invalidateQueries({ queryKey: ["government-training-sessions"] });
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? tCommon.delete_failed ?? "Failed to delete session");
    },
  });

  function handleDelete() {
    confirm({
      title: t.delete_confirm_title ?? "Delete Training Session",
      description: (
        t.delete_confirm_desc ?? 'Are you sure you want to delete "{topic}"? This action cannot be undone.'
      ).replace("{topic}", session.topic),
      confirmLabel: tCommon.delete_btn ?? "Delete",
      confirmingLabel: tCommon.deleting ?? "Deleting...",
      variant: "destructive",
      onConfirm: () => deleteMutation.mutateAsync(),
    });
  }

  return (
    <RowActions
      actions={[
        { label: t.action_view ?? tCommon.view ?? "View", onClick: () => onView(session) },
        ...(session.can_edit
          ? [
              {
                label: t.action_edit ?? tCommon.edit ?? "Edit",
                onClick: () => router.push(`/government/training/${session.id}`),
                separator: true,
              },
              {
                label: t.action_delete ?? tCommon.delete_btn ?? "Delete",
                onClick: handleDelete,
                destructive: true,
                disabled: deleteMutation.isPending,
              },
            ]
          : []),
      ]}
    />
  );
}

export function getTrainingColumns(
  t: T,
  tCommon: T,
  onView: (row: GovtTrainingSession) => void,
): ColumnDef<GovtTrainingSession>[] {
  return [
    {
      accessorKey: "topic",
      header: t.col_topic ?? "Topic",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.has_unread_comments && (
            <span
              role="img"
              className="h-2 w-2 shrink-0 rounded-full bg-blue-500"
              title={t.new_comment ?? "New comment from KAU"}
              aria-label={t.new_comment ?? "New comment from KAU"}
            />
          )}
          <TextCell value={row.original.topic} maxWidth="max-w-[220px]" />
        </div>
      ),
    },
    {
      accessorKey: "trainer_name",
      header: t.col_trainer_name ?? "Trainer",
      meta: { hideOnMobile: true },
      enableSorting: false,
      cell: ({ row }) => <TextCell value={row.original.trainer_name || "—"} maxWidth="max-w-[160px]" />,
    },
    {
      accessorKey: "fpo_name",
      header: t.col_fpo_name ?? "FPO",
      cell: ({ row }) => <TextCell value={row.original.fpo_name} maxWidth="max-w-[200px]" />,
    },
    {
      accessorKey: "district",
      header: t.col_district ?? "District",
      meta: { hideOnMobile: true },
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {t[`district_${row.original.district}`] ?? row.original.district}
        </span>
      ),
    },
    {
      accessorKey: "date",
      header: t.col_date ?? "Date",
      meta: { hideOnMobile: true },
      cell: ({ row }) =>
        new Date(row.original.date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
    },
    {
      accessorKey: "duration_hours",
      header: t.col_duration ?? "Duration",
      meta: { hideOnMobile: true },
      enableSorting: false,
      cell: ({ row }) => `${row.original.duration_hours}h`,
    },
    {
      accessorKey: "participants_count",
      header: t.col_participants ?? "Participants",
      enableSorting: false,
      cell: ({ row }) => <Badge variant="outline">{row.original.participants_count}</Badge>,
    },
    {
      accessorKey: "created_by_name",
      header: t.col_created_by ?? "Created By",
      meta: { hideOnMobile: true },
      enableSorting: false,
      cell: ({ row }) => <TextCell value={row.original.created_by_name} maxWidth="max-w-[160px]" muted />,
    },
    {
      // KAU admin / sub-admin remarks — the text itself shows in the view sheet
      id: "comments",
      header: t.col_comments ?? "Comments",
      enableSorting: false,
      cell: ({ row }) => {
        const count = row.original.comments?.length ?? 0;
        if (count === 0) return <span className="text-muted-foreground text-xs">—</span>;
        // unread → blue bell, cleared once the user opens the session
        if (row.original.has_unread_comments) {
          return (
            <Badge
              className="gap-1 bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300"
              title={t.new_comment ?? "New comment from KAU"}
            >
              <BellDot className="h-3 w-3" />
              {count}
            </Badge>
          );
        }
        return (
          <Badge variant="secondary" className="gap-1">
            <MessageSquare className="h-3 w-3" />
            {count}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <TrainingActions session={row.original} t={t} tCommon={tCommon} onView={onView} />,
    },
  ];
}
