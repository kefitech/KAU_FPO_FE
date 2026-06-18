"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { adminExpertsApi } from "@/app/admin/_api/experts";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { useConfirmStore } from "@/stores/confirm-store";
import type { AdminExpert } from "@/types/admin";
import { DISTRICT_OPTIONS } from "@/types/fpo";

function ExpertActions({ expert }: { expert: AdminExpert }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const activateMutation = useMutation({
    mutationFn: () =>
      expert.is_active ? adminExpertsApi.deactivate(expert.id) : adminExpertsApi.activate(expert.id),
    onSuccess: () => {
      toast.success(expert.is_active ? "Expert deactivated" : "Expert activated");
      queryClient.invalidateQueries({ queryKey: ["experts"] });
    },
    onError: (error: unknown) => {
      const msg = (error as { message?: string })?.message;
      toast.error(msg ?? "Failed to update expert status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminExpertsApi.delete(expert.id),
    onSuccess: () => {
      toast.success("Expert deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["experts"] });
    },
    onError: (error: unknown) => {
      const msg = (error as { message?: string })?.message;
      toast.error(msg ?? "Failed to delete expert");
    },
  });

  function handleDelete() {
    confirm({
      title: "Delete Expert",
      description: `Are you sure you want to delete "${expert.name_en}"? This action cannot be undone.`,
      onConfirm: () => deleteMutation.mutateAsync(),
    });
  }

  return (
    <RowActions
      actions={[
        { label: "Edit", onClick: () => router.push(`/admin/experts/${expert.id}/edit`) },
        {
          label: expert.is_active ? "Deactivate" : "Activate",
          onClick: () => activateMutation.mutate(),
          separator: true,
        },
        { label: "Delete", onClick: handleDelete, destructive: true, separator: true },
      ]}
    />
  );
}

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  scientist: "bg-indigo-100 text-indigo-700",
  trainer: "bg-green-100 text-green-700",
  banker: "bg-blue-100 text-blue-700",
  facilitator: "bg-teal-100 text-teal-700",
};

export function getExpertColumns(): ColumnDef<AdminExpert>[] {
  return [
    {
      accessorKey: "name_en",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name_en}</p>
          {row.original.designation && (
            <p className="text-xs text-muted-foreground">{row.original.designation}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "organisation",
      header: "Organisation",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.organisation}</span>
      ),
    },
    {
      accessorKey: "category_display",
      header: "Category",
      cell: ({ row }) => {
        const color = CATEGORY_BADGE_COLORS[row.original.category] ?? "bg-muted text-muted-foreground";
        return (
          <Badge className={`text-xs font-medium ${color}`} variant="secondary">
            {row.original.category_display}
          </Badge>
        );
      },
    },
    {
      accessorKey: "district",
      header: "District",
      cell: ({ row }) => {
        const label = DISTRICT_OPTIONS.find((d) => d.value === row.original.district)?.label ?? row.original.district;
        return <span className="text-sm text-muted-foreground">{label || "—"}</span>;
      },
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
      cell: ({ row }) => <ExpertActions expert={row.original} />,
    },
  ];
}
