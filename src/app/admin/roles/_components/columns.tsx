"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { rolesApi } from "@/app/admin/_api/roles";
import { RowActions } from "@/components/data-table/row-actions";
import { useConfirmStore } from "@/stores/confirm-store";
import type { Role } from "@/types/admin";

type T = Record<string, string>;

function RoleActions({ role, t, tConfirm, tCommon }: { role: Role; t: T; tConfirm: T; tCommon: T }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const deleteMutation = useMutation({
    mutationFn: () => rolesApi.delete(role.id),
    onSuccess: () => {
      toast.success(t.toast_deleted ?? "Role deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? tCommon.delete_failed ?? "Failed to delete");
    },
  });

  function handleDelete() {
    confirm({
      title: tConfirm.delete_role ?? "Delete Role",
      description: (
        t.delete_description ?? 'Are you sure you want to delete "{name}"? This action cannot be undone.'
      ).replace("{name}", role.name),
      onConfirm: () => deleteMutation.mutateAsync(),
    });
  }

  return (
    <RowActions
      actions={[
        { label: tCommon.edit ?? "Edit", onClick: () => router.push(`/admin/roles/${role.id}/edit`) },
        { label: tCommon.delete_btn ?? "Delete", onClick: handleDelete, destructive: true, separator: true },
      ]}
    />
  );
}

export function getRoleColumns(t: T = {}, tConfirm: T = {}, tCommon: T = {}): ColumnDef<Role>[] {
  return [
    {
      accessorKey: "name",
      header: t.col_name ?? "Role Name",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <RoleActions role={row.original} t={t} tConfirm={tConfirm} tCommon={tCommon} />,
    },
  ];
}
