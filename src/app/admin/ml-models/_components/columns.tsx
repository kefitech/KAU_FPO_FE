"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { adminMlModelsApi, type MLModelVersion } from "@/app/admin/_api/ml-models";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";

function MlModelActions({ model }: { model: MLModelVersion }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const activateMutation = useMutation({
    mutationFn: () => adminMlModelsApi.activate(model.id),
    onSuccess: (result) => {
      if (result.warning) {
        toast.warning(result.warning);
      } else {
        toast.success("Model version activated");
      }
      queryClient.invalidateQueries({ queryKey: ["ml-models"] });
    },
    onError: (error: unknown) => {
      const msg = (error as { message?: string })?.message;
      toast.error(msg ?? "Failed to activate model version");
    },
  });

  return (
    <RowActions
      actions={[
        {
          label: "View Feedback",
          onClick: () => router.push(`/admin/ml-models/${model.id}/feedback`),
        },
        {
          label: "Activate",
          onClick: () => activateMutation.mutate(),
          disabled: activateMutation.isPending,
          hidden: model.is_active,
          separator: true,
        },
      ]}
    />
  );
}

export function getMlModelColumns(): ColumnDef<MLModelVersion>[] {
  return [
    {
      accessorKey: "version_code",
      header: "Version",
      cell: ({ row }) => <span className="font-medium">{row.original.version_code}</span>,
    },
    {
      accessorKey: "description",
      header: "Description",
      meta: { hideOnMobile: true },
      cell: ({ row }) => (
        <span className="line-clamp-1 max-w-xs text-muted-foreground">{row.original.description}</span>
      ),
    },
    {
      accessorKey: "deployed_at",
      header: "Deployed",
      meta: { hideOnMobile: true },
      cell: ({ row }) => (
        <span className="text-muted-foreground">{new Date(row.original.deployed_at).toLocaleDateString()}</span>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => (
        <Badge
          variant="secondary"
          className={
            row.original.is_active
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-muted text-muted-foreground"
          }
        >
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => <MlModelActions model={row.original} />,
    },
  ];
}