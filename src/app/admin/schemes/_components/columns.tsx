"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { adminSchemesApi } from "@/app/admin/_api/schemes";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { useConfirmStore } from "@/stores/confirm-store";
import type { AdminScheme } from "@/types/admin";

function SchemeActions({ scheme }: { scheme: AdminScheme }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const activateMutation = useMutation({
    mutationFn: () =>
      scheme.is_active ? adminSchemesApi.deactivate(scheme.id) : adminSchemesApi.activate(scheme.id),
    onSuccess: () => {
      toast.success(scheme.is_active ? "Scheme deactivated" : "Scheme activated");
      queryClient.invalidateQueries({ queryKey: ["schemes"] });
    },
    onError: (error: unknown) => {
      const msg = (error as { message?: string })?.message;
      toast.error(msg ?? "Failed to update scheme status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminSchemesApi.delete(scheme.id),
    onSuccess: () => {
      toast.success("Scheme deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["schemes"] });
    },
    onError: (error: unknown) => {
      const msg = (error as { message?: string })?.message;
      toast.error(msg ?? "Failed to delete scheme");
    },
  });

  function handleDelete() {
    confirm({
      title: "Delete Scheme",
      description: `Are you sure you want to delete "${scheme.name_en}"? This action cannot be undone.`,
      onConfirm: () => deleteMutation.mutateAsync(),
    });
  }

  return (
    <RowActions
      actions={[
        { label: "Edit", onClick: () => router.push(`/admin/schemes/${scheme.id}/edit`) },
        {
          label: scheme.is_active ? "Deactivate" : "Activate",
          onClick: () => activateMutation.mutate(),
          separator: true,
        },
        { label: "Delete", onClick: handleDelete, destructive: true, separator: true },
      ]}
    />
  );
}

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  credit: "bg-blue-100 text-blue-700",
  insurance: "bg-purple-100 text-purple-700",
  marketing: "bg-green-100 text-green-700",
  infrastructure: "bg-orange-100 text-orange-700",
  capacity_building: "bg-yellow-100 text-yellow-700",
};

export function getSchemeColumns(): ColumnDef<AdminScheme>[] {
  return [
    {
      accessorKey: "name_en",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium max-w-[280px] block truncate">{row.original.name_en}</span>
      ),
    },
    {
      accessorKey: "administering_body",
      header: "Administering Body",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground max-w-[200px] block truncate">
          {row.original.administering_body}
        </span>
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
      cell: ({ row }) => <SchemeActions scheme={row.original} />,
    },
  ];
}
