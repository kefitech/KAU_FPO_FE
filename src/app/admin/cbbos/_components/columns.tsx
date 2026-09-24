"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { cbbosApi } from "@/app/admin/_api/cbbos";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { useConfirmStore } from "@/stores/confirm-store";
import type { CBBO } from "@/types/admin";

type T = Record<string, string>;

function getErrorMessage(error: unknown): string | undefined {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

function CBBOActions({ cbbo, t, tConfirm, tCommon }: { cbbo: CBBO; t: T; tConfirm: T; tCommon: T }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const isPending = cbbo.registration_status === "pending";
  const displayName = `${cbbo.first_name} ${cbbo.last_name}`.trim() || cbbo.email;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["cbbos"] });

  const activateMutation = useMutation({
    mutationFn: () => cbbosApi.activate(cbbo.id),
    onSuccess: () => {
      toast.success(t.toast_activated ?? "CBBO activated");
      invalidate();
    },
    onError: () => toast.error(tCommon.update_failed ?? "Failed to activate"),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => cbbosApi.deactivate(cbbo.id),
    onSuccess: () => {
      toast.success(t.toast_deactivated ?? "CBBO deactivated");
      invalidate();
    },
    onError: () => toast.error(tCommon.update_failed ?? "Failed to deactivate"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => cbbosApi.resetPassword(cbbo.id),
    onSuccess: () => toast.success(t.toast_password_reset ?? "Temporary password sent successfully"),
    onError: (error: unknown) => toast.error(getErrorMessage(error) ?? "Failed to reset password"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => cbbosApi.delete(cbbo.id),
    onSuccess: () => {
      toast.success(t.toast_deleted ?? "CBBO deleted");
      invalidate();
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error) ?? tCommon.delete_failed ?? "Failed to delete"),
  });

  const approveMutation = useMutation({
    mutationFn: () => cbbosApi.approveRegistration(cbbo.id),
    onSuccess: () => {
      toast.success(t.toast_approved ?? "Registration approved");
      invalidate();
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error) ?? t.toast_approve_failed ?? "Failed to approve"),
  });

  const rejectRegistrationMutation = useMutation({
    mutationFn: () => cbbosApi.rejectRegistration(cbbo.id),
    onSuccess: () => {
      toast.success(t.toast_rejected ?? "Registration rejected");
      invalidate();
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error) ?? t.toast_reject_failed ?? "Failed to reject"),
  });

  function handleResetPassword() {
    confirm({
      title: t.reset_password_title ?? "Reset Password",
      description: (
        t.reset_password_description ??
        'A temporary password will be generated and sent to "{name}" via email. They will be required to change it on next login.'
      ).replace("{name}", displayName),
      confirmLabel: "Reset",
      confirmingLabel: "Sending...",
      variant: "default",
      onConfirm: () => resetPasswordMutation.mutateAsync(),
    });
  }

  function handleDelete() {
    confirm({
      title: tConfirm.delete_cbbo ?? "Delete CBBO",
      description: (
        t.delete_description ?? 'Are you sure you want to delete "{name}"? This action cannot be undone.'
      ).replace("{name}", displayName),
      confirmLabel: tCommon.delete_btn ?? "Delete",
      confirmingLabel: tCommon.deleting ?? "Deleting...",
      variant: "destructive",
      onConfirm: () => deleteMutation.mutateAsync(),
    });
  }

  function handleApprove() {
    confirm({
      title: t.approve_title ?? "Approve Registration",
      description: (
        t.approve_description ?? 'Approve "{name}"\'s registration? They will receive login credentials by email.'
      ).replace("{name}", displayName),
      confirmLabel: t.approve_button ?? "Approve",
      confirmingLabel: t.approving ?? "Approving...",
      variant: "default",
      onConfirm: () => approveMutation.mutateAsync(),
    });
  }

  function handleRejectRegistration() {
    confirm({
      title: t.reject_title ?? "Reject Registration",
      description: (t.reject_description ?? 'Are you sure you want to reject "{name}"\'s registration?').replace(
        "{name}",
        displayName,
      ),
      confirmLabel: t.reject_button ?? "Reject",
      confirmingLabel: t.rejecting ?? "Rejecting...",
      variant: "destructive",
      onConfirm: () => rejectRegistrationMutation.mutateAsync(),
    });
  }

  if (isPending) {
    return (
      <RowActions
        actions={[
          {
            label: t.approve_button ?? "Approve",
            onClick: handleApprove,
            disabled: approveMutation.isPending || rejectRegistrationMutation.isPending,
          },
          {
            label: t.reject_button ?? "Reject",
            onClick: handleRejectRegistration,
            disabled: approveMutation.isPending || rejectRegistrationMutation.isPending,
            destructive: true,
            separator: true,
          },
        ]}
      />
    );
  }

  return (
    <RowActions
      actions={[
        { label: tCommon.edit ?? "Edit", onClick: () => router.push(`/admin/cbbos/${cbbo.id}/edit`) },
        {
          label: cbbo.is_active ? (t.deactivate ?? "Deactivate") : (t.activate ?? "Activate"),
          onClick: () => (cbbo.is_active ? deactivateMutation.mutate() : activateMutation.mutate()),
          disabled: activateMutation.isPending || deactivateMutation.isPending,
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

export function getCBBOColumns(t: T = {}, tConfirm: T = {}, tCommon: T = {}): ColumnDef<CBBO>[] {
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
      accessorKey: "phone",
      header: t.col_phone ?? "Phone",
      meta: { hideOnMobile: true },
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.phone || "—"}</span>,
    },
    {
      accessorKey: "scope",
      header: t.col_scope ?? "Districts",
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const scope = row.original.scope;
        if (scope === "STATE") {
          return (
            <Badge variant="secondary" className="text-[10px]">
              {t.state_wide ?? "State-wide"}
            </Badge>
          );
        }
        if (!scope || scope.length === 0) {
          return <span className="text-muted-foreground">—</span>;
        }
        const visible = scope.slice(0, 2);
        const extra = scope.length - visible.length;
        return (
          <div className="flex flex-wrap items-center gap-1">
            {visible.map((district) => (
              <Badge key={district} variant="outline" className="text-[10px]">
                {district}
              </Badge>
            ))}
            {extra > 0 && (
              <Badge variant="outline" className="text-[10px]">
                +{extra}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "registration_status",
      header: t.col_status ?? "Status",
      cell: ({ row }) => {
        if (row.original.registration_status === "pending") {
          return (
            <Badge
              variant="outline"
              className="border-amber-500/40 bg-amber-500/10 text-[11px] text-amber-700 dark:text-amber-400"
            >
              {t.status_pending ?? "Pending Approval"}
            </Badge>
          );
        }
        return row.original.is_active ? (
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
        );
      },
    },
    {
      accessorKey: "date_joined",
      header: t.col_date_joined ?? "Joined",
      meta: { hideOnMobile: true },
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{new Date(row.original.date_joined).toLocaleDateString()}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <CBBOActions cbbo={row.original} t={t} tConfirm={tConfirm} tCommon={tCommon} />,
    },
  ];
}
