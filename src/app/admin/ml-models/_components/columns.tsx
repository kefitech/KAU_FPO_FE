"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { adminMlModelsApi, type MLModelVersion } from "@/app/admin/_api/ml-models";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";

type T = Record<string, string>;

function StatusBadge({ model, t }: { model: MLModelVersion; t: T }) {
  if (model.status === "training") {
    return (
      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        <Loader2 className="mr-1 h-3 w-3 animate-spin motion-reduce:animate-none" />
        {t.status_training ?? "Training"}
      </Badge>
    );
  }
  if (model.status === "failed") {
    return (
      <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        {t.status_failed ?? "Failed"}
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className={
        model.is_active
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-muted text-muted-foreground"
      }
    >
      {model.is_active ? (t.status_active ?? "Active") : (t.status_inactive ?? "Inactive")}
    </Badge>
  );
}

function MlModelActions({
  model,
  onViewDetails,
  t,
}: {
  model: MLModelVersion;
  onViewDetails: (model: MLModelVersion) => void;
  t: T;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const activateMutation = useMutation({
    mutationFn: () => adminMlModelsApi.activate(model.id),
    onSuccess: (result) => {
      if (result.warning) {
        toast.warning(result.warning, { duration: 12_000 });
      } else {
        toast.success(t.toast_activated ?? "Model version activated");
      }
      queryClient.invalidateQueries({ queryKey: ["ml-models"] });
    },
    onError: (error: unknown) => {
      const msg = (error as { message?: string })?.message;
      toast.error(msg ?? t.toast_activate_failed ?? "Failed to activate model version");
    },
  });

  return (
    <RowActions
      actions={[
        {
          // Training stats for a ready CSV-trained version; the error for a
          // failed one. Hidden when there is nothing to show (a direct file
          // upload has no stats; a training row has neither yet).
          label:
            model.status === "failed"
              ? (t.action_view_error ?? "View Error")
              : (t.action_view_stats ?? "View Training Stats"),
          onClick: () => onViewDetails(model),
          hidden: model.status === "training" || (model.status === "ready" && !model.training_metrics),
        },
        {
          label: t.action_view_feedback ?? "View Feedback",
          onClick: () => router.push(`/admin/ml-models/${model.id}/feedback`),
        },
        {
          label: t.action_activate ?? "Activate",
          onClick: () => activateMutation.mutate(),
          disabled: activateMutation.isPending,
          // Only a ready, not-yet-active version can be activated -- the
          // backend enforces the same rule (400 otherwise).
          hidden: model.is_active || model.status !== "ready",
          separator: true,
        },
      ]}
    />
  );
}

/**
 * onViewDetails is called both from the row action above and from clicking
 * anywhere on the row (wired in page.tsx via DataTable's onRowClick) --
 * both funnel into the same dialog state at the page level.
 */
export function getMlModelColumns(
  onViewDetails: (model: MLModelVersion) => void,
  t: T,
  tCommon: T,
): ColumnDef<MLModelVersion>[] {
  return [
    {
      accessorKey: "version_code",
      header: t.col_version ?? "Version",
      cell: ({ row }) => <span className="font-medium">{row.original.version_code}</span>,
    },
    {
      accessorKey: "description",
      header: t.col_description ?? "Description",
      meta: { hideOnMobile: true },
      cell: ({ row }) => (
        <span className="line-clamp-1 max-w-xs text-muted-foreground">{row.original.description}</span>
      ),
    },
    {
      accessorKey: "deployed_at",
      header: t.col_deployed ?? "Deployed",
      meta: { hideOnMobile: true },
      cell: ({ row }) => (
        <span className="text-muted-foreground">{new Date(row.original.deployed_at).toLocaleDateString()}</span>
      ),
    },
    {
      accessorKey: "is_active",
      header: tCommon.col_status ?? "Status",
      enableSorting: false,
      cell: ({ row }) => <StatusBadge model={row.original} t={t} />,
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => <MlModelActions model={row.original} onViewDetails={onViewDetails} t={t} />,
    },
  ];
}
