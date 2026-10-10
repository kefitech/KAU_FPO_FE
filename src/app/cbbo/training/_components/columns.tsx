"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { BellDot, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { apiErrorMessage, type CbboTrainingSession, cbboTrainingApi } from "@/app/cbbo/_api/training";
import { TextCell } from "@/components/data-table/cell-helpers";
import { RowActions } from "@/components/data-table/row-actions";
import { CancelSessionDialog } from "@/components/training/cancel-session-dialog";
import { Badge } from "@/components/ui/badge";

type T = Record<string, string>;

function TrainingActions({
  session,
  t,
  tCommon,
  onView,
}: {
  session: CbboTrainingSession;
  t: T;
  tCommon: T;
  onView: (row: CbboTrainingSession) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);

  // Cancelling soft-deletes the session and tells the FPO's members why.
  const cancelMutation = useMutation({
    mutationFn: (reason: string) => cbboTrainingApi.cancel(session.id, reason),
    onSuccess: () => {
      toast.success(t.toast_cancelled ?? "Training session cancelled. The FPO has been notified.");
      setCancelOpen(false);
      queryClient.invalidateQueries({ queryKey: ["cbbo-training-sessions"] });
    },
    onError: (error: unknown) => {
      toast.error(apiErrorMessage(error, t.cancel_failed ?? "Failed to cancel session"));
    },
  });

  return (
    <>
      <RowActions
        actions={[
          { label: t.action_view ?? tCommon.view ?? "View", onClick: () => onView(session) },
          ...(session.can_edit
            ? [
                {
                  label: t.action_edit ?? tCommon.edit ?? "Edit",
                  onClick: () => router.push(`/cbbo/training/${session.id}`),
                  separator: true,
                },
                {
                  label: t.action_cancel ?? "Cancel session",
                  onClick: () => setCancelOpen(true),
                  destructive: true,
                  disabled: cancelMutation.isPending,
                },
              ]
            : []),
        ]}
      />
      <CancelSessionDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        topic={session.topic}
        fpoName={session.fpo_name}
        isPending={cancelMutation.isPending}
        onConfirm={(reason) => cancelMutation.mutate(reason)}
        t={t}
      />
    </>
  );
}

export function getTrainingColumns(
  t: T,
  tCommon: T,
  onView: (row: CbboTrainingSession) => void,
): ColumnDef<CbboTrainingSession>[] {
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
        <span className="text-muted-foreground text-sm">
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
