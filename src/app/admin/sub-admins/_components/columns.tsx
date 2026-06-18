"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { subAdminsApi } from "@/app/admin/_api/sub-admins";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { twoFactorApi } from "@/lib/api/two-factor";
import { useConfirmStore } from "@/stores/confirm-store";
import type { SubAdmin } from "@/types/admin";

type T = Record<string, string>;

function SubAdminActions({ subAdmin, t, tConfirm, tCommon }: { subAdmin: SubAdmin; t: T; tConfirm: T; tCommon: T }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const activateMutation = useMutation({
    mutationFn: () => subAdminsApi.activate(subAdmin.id),
    onSuccess: () => {
      toast.success(t.toast_activated ?? "Sub-admin activated");
      queryClient.invalidateQueries({ queryKey: ["sub-admins"] });
    },
    onError: () => toast.error(tCommon.update_failed ?? "Failed to activate"),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => subAdminsApi.deactivate(subAdmin.id),
    onSuccess: () => {
      toast.success(t.toast_deactivated ?? "Sub-admin deactivated");
      queryClient.invalidateQueries({ queryKey: ["sub-admins"] });
    },
    onError: () => toast.error(tCommon.update_failed ?? "Failed to deactivate"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => subAdminsApi.resetPassword(subAdmin.id),
    onSuccess: () => toast.success(t.toast_password_reset ?? "Temporary password sent successfully"),
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Failed to reset password");
    },
  });

  const disable2faMutation = useMutation({
    mutationFn: () => twoFactorApi.disableForUser(subAdmin.id),
    onSuccess: () => toast.success(t.toast_2fa_disabled ?? "2FA disabled for this user"),
    onError: () => toast.error("Failed to disable 2FA"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => subAdminsApi.delete(subAdmin.id),
    onSuccess: () => {
      toast.success(t.toast_deleted ?? "Sub-admin deleted");
      queryClient.invalidateQueries({ queryKey: ["sub-admins"] });
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? tCommon.delete_failed ?? "Failed to delete");
    },
  });

  function handleResetPassword() {
    const name = `${subAdmin.first_name} ${subAdmin.last_name}`.trim() || subAdmin.email;
    confirm({
      title: t.reset_password_title ?? "Reset Password",
      description: (
        t.reset_password_description ??
        'A temporary password will be generated and sent to "{name}" via email. They will be required to change it on next login.'
      ).replace("{name}", name),
      onConfirm: () => resetPasswordMutation.mutateAsync(),
    });
  }

  function handleDelete() {
    const name = `${subAdmin.first_name} ${subAdmin.last_name}`.trim() || subAdmin.email;
    confirm({
      title: tConfirm.delete_sub_admin ?? "Delete Sub-Admin",
      description: (
        t.delete_description ?? 'Are you sure you want to delete "{name}"? This action cannot be undone.'
      ).replace("{name}", name),
      onConfirm: () => deleteMutation.mutateAsync(),
    });
  }

  return (
    <RowActions
      actions={[
        { label: tCommon.edit ?? "Edit", onClick: () => router.push(`/admin/sub-admins/${subAdmin.id}/edit`) },
        {
          label: subAdmin.is_active ? (t.deactivate ?? "Deactivate") : (t.activate ?? "Activate"),
          onClick: () => (subAdmin.is_active ? deactivateMutation.mutate() : activateMutation.mutate()),
          disabled: activateMutation.isPending || deactivateMutation.isPending,
          separator: true,
        },
        {
          label: t.disable_2fa ?? "Disable 2FA",
          onClick: () => disable2faMutation.mutate(),
          disabled: disable2faMutation.isPending,
          separator: true,
        },
        {
          label: t.reset_password ?? "Reset Password",
          onClick: handleResetPassword,
          disabled: resetPasswordMutation.isPending,
        },
        { label: tCommon.delete_btn ?? "Delete", onClick: handleDelete, destructive: true, separator: true },
      ]}
    />
  );
}

export function getSubAdminColumns(t: T = {}, tConfirm: T = {}, tCommon: T = {}): ColumnDef<SubAdmin>[] {
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
      accessorKey: "permissions",
      header: t.col_permissions ?? "Permissions",
      cell: ({ row }) => {
        const perms = row.original.permissions;
        if (perms.length === 0) {
          return <span className="text-muted-foreground text-xs">{t.no_permissions ?? "None"}</span>;
        }
        const visible = perms.slice(0, 2);
        const rest = perms.length - 2;
        return (
          <div className="flex flex-wrap gap-1">
            {visible.map((p) => (
              <Badge key={p} variant="secondary" className="font-mono text-[10px]">
                {p}
              </Badge>
            ))}
            {rest > 0 && (
              <Badge variant="outline" className="text-[10px]">
                +{rest}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "is_active",
      header: t.col_status ?? "Status",
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge
            variant="outline"
            className="border-green-500/40 bg-green-500/10 text-[11px] text-green-700 dark:text-green-400"
          >
            {t.status_active ?? "Active"}
          </Badge>
        ) : (
          <Badge variant="outline" className="border-muted text-[11px] text-muted-foreground">
            {t.status_inactive ?? "Inactive"}
          </Badge>
        ),
    },
    {
      accessorKey: "date_joined",
      header: t.col_joined ?? "Joined",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{new Date(row.original.date_joined).toLocaleDateString()}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <SubAdminActions subAdmin={row.original} t={t} tConfirm={tConfirm} tCommon={tCommon} />,
    },
  ];
}
