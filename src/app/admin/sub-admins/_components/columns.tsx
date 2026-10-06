"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { subAdminsApi } from "@/app/admin/_api/sub-admins";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { twoFactorApi } from "@/lib/api/two-factor";
import { getErrorMessage } from "@/lib/get-error-message";
import { useConfirmStore } from "@/stores/confirm-store";
import type { SubAdmin } from "@/types/admin";

type T = Record<string, string>;

export interface SubAdminColumnHandlers {
  /** opens the Transfer District dialog (rendered at page level) */
  onTransferDistrict?: (subAdmin: SubAdmin) => void;
}

function SubAdminActions({
  subAdmin,
  t,
  tConfirm,
  tCommon,
  handlers,
}: {
  subAdmin: SubAdmin;
  t: T;
  tConfirm: T;
  tCommon: T;
  handlers: SubAdminColumnHandlers;
}) {
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
    onError: (error: unknown) =>
      toast.error(getErrorMessage(error, t.reset_password_failed ?? "Failed to reset password")),
  });

  const disable2faMutation = useMutation({
    mutationFn: () => twoFactorApi.disableForUser(subAdmin.id),
    onSuccess: () => toast.success(t.toast_2fa_disabled ?? "2FA disabled for this user"),
    onError: () => toast.error(t.disable_2fa_failed ?? "Failed to disable 2FA"),
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
      confirmLabel: t.reset_confirm ?? "Reset",
      confirmingLabel: t.sending ?? "Sending...",
      variant: "default",
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
      confirmLabel: tCommon.delete_btn ?? "Delete",
      confirmingLabel: tCommon.deleting ?? "Deleting...",
      variant: "destructive",
      onConfirm: () => deleteMutation.mutateAsync(),
    });
  }

  return (
    <RowActions
      actions={[
        { label: tCommon.edit ?? "Edit", onClick: () => router.push(`/admin/sub-admins/${subAdmin.id}/edit`) },
        {
          label: t.transfer_district ?? "Transfer District",
          onClick: () => handlers.onTransferDistrict?.(subAdmin),
          hidden: !handlers.onTransferDistrict,
        },
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

export function getSubAdminColumns(
  t: T = {},
  tConfirm: T = {},
  tCommon: T = {},
  handlers: SubAdminColumnHandlers = {},
): ColumnDef<SubAdmin>[] {
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
      meta: { hideOnMobile: true },
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
    },
    {
      accessorKey: "permissions",
      header: t.col_permissions ?? "Permissions",
      meta: { hideOnMobile: true },
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
      accessorKey: "district",
      header: t.col_district ?? "District",
      cell: ({ row }) => {
        const code = row.original.district;
        // No district → sees no FPOs; the super admin fixes it with Transfer District.
        if (!code) {
          return (
            <Badge
              variant="outline"
              className="border-amber-500/50 bg-amber-500/10 text-[11px] text-amber-700 dark:text-amber-400"
              title={t.no_district_hint ?? "Sees no FPOs until transferred to a district"}
            >
              {t.no_district ?? "No district"}
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="font-mono text-[11px]">
            {code}
          </Badge>
        );
      },
    },
    {
      accessorKey: "visible_fpos_count",
      header: t.col_visible_fpos ?? "FPOs in Scope",
      meta: { hideOnMobile: true },
      enableSorting: false,
      cell: ({ row }) => {
        const sa = row.original;
        const count = sa.visible_fpos_count ?? 0;
        if (!sa.district || count === 0) {
          return <span className="text-muted-foreground text-xs">{t.no_assigned_fpos_short ?? "None"}</span>;
        }
        // Clickable — jump to the applications list pre-filtered so the admin
        // can drill into each FPO for tier / products / documents / etc.
        return (
          <Link
            href={`/admin/applications?district=${sa.district}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex"
          >
            <Badge
              variant="secondary"
              className="cursor-pointer text-[11px] hover:bg-primary hover:text-primary-foreground"
              title={t.view_fpos_hint ?? "View FPOs in scope"}
            >
              {count}
            </Badge>
          </Link>
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
      meta: { hideOnMobile: true },
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{new Date(row.original.date_joined).toLocaleDateString()}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <SubAdminActions subAdmin={row.original} t={t} tConfirm={tConfirm} tCommon={tCommon} handlers={handlers} />
      ),
    },
  ];
}
