"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { fpoUsersApi } from "@/app/admin/_api/fpo-users";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { useConfirmStore } from "@/stores/confirm-store";
import type { FpoUser } from "@/types/admin";

type T = Record<string, string>;

function FpoUserActions({ user, t, tCommon }: { user: FpoUser; t: T; tCommon: T }) {
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const activateMutation = useMutation({
    mutationFn: () => fpoUsersApi.activate(user.id),
    onSuccess: () => {
      toast.success(t.toast_activated ?? "User activated");
      queryClient.invalidateQueries({ queryKey: ["fpo-users"] });
    },
    onError: () => toast.error(tCommon.update_failed ?? "Failed to activate"),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => fpoUsersApi.deactivate(user.id),
    onSuccess: () => {
      toast.success(t.toast_deactivated ?? "User deactivated");
      queryClient.invalidateQueries({ queryKey: ["fpo-users"] });
    },
    onError: () => toast.error(tCommon.update_failed ?? "Failed to deactivate"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => fpoUsersApi.resetPassword(user.id),
    onSuccess: () => toast.success(t.toast_password_reset ?? "Temporary password sent successfully"),
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Failed to reset password");
    },
  });

  function handleResetPassword() {
    const name = `${user.first_name} ${user.last_name}`.trim() || user.email;
    confirm({
      title: t.reset_password_title ?? "Reset Password",
      description: (
        t.reset_password_description ??
        'A temporary password will be generated and sent to "{name}" via email and SMS. They will be required to change it on next login.'
      ).replace("{name}", name),
      onConfirm: () => resetPasswordMutation.mutateAsync(),
    });
  }

  return (
    <RowActions
      actions={[
        {
          label: user.is_active ? (t.deactivate ?? "Deactivate") : (t.activate ?? "Activate"),
          onClick: () => (user.is_active ? deactivateMutation.mutate() : activateMutation.mutate()),
          disabled: activateMutation.isPending || deactivateMutation.isPending,
        },
        {
          label: t.reset_password ?? "Reset Password",
          onClick: handleResetPassword,
          disabled: resetPasswordMutation.isPending,
          separator: true,
        },
      ]}
    />
  );
}

export function getFpoUserColumns(t: T = {}, tCommon: T = {}): ColumnDef<FpoUser>[] {
  return [
    {
      accessorKey: "first_name",
      header: t.col_name ?? "Name",
      cell: ({ row }) => {
        const name = `${row.original.first_name} ${row.original.last_name}`.trim();
        return <span className="font-medium">{name || "—"}</span>;
      },
    },
    {
      accessorKey: "email",
      header: t.col_email ?? "Email",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
    },
    {
      accessorKey: "phone",
      header: t.col_phone ?? "Phone",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.phone || "—"}</span>,
    },
    {
      accessorKey: "fpo_name",
      header: t.col_fpo ?? "FPO",
      cell: ({ row }) => <span className="text-sm">{row.original.fpo_name}</span>,
    },
    {
      accessorKey: "role",
      header: t.col_role ?? "Role",
      cell: ({ row }) =>
        row.original.role === "primary" ? (
          <Badge variant="secondary" className="text-[11px]">
            {t.role_primary ?? "Primary"}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[11px]">
            {t.role_secondary ?? "Secondary"}
          </Badge>
        ),
    },
    {
      accessorKey: "is_active",
      header: t.col_status ?? "Status",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge
            variant="outline"
            className="border-green-500/40 bg-green-500/10 text-[11px] text-green-700 dark:text-green-400"
          >
            {tCommon.badge_active ?? "Active"}
          </Badge>
        ) : (
          <Badge variant="outline" className="border-muted text-[11px] text-muted-foreground">
            {tCommon.badge_inactive ?? "Inactive"}
          </Badge>
        ),
    },
    {
      accessorKey: "joined_at",
      header: t.col_joined ?? "Joined",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {new Date(row.original.joined_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => <FpoUserActions user={row.original} t={t} tCommon={tCommon} />,
    },
  ];
}
