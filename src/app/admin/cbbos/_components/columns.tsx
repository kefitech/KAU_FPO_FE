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

function CBBOActions({ cbbo, t, tConfirm, tCommon }: { cbbo: CBBO; t: T; tConfirm: T; tCommon: T }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const activateMutation = useMutation({
    mutationFn: () => cbbosApi.activate(cbbo.id),
    onSuccess: () => {
      toast.success(t.toast_activated ?? "CBBO activated");
      queryClient.invalidateQueries({ queryKey: ["cbbos"] });
    },
    onError: () => toast.error(tCommon.update_failed ?? "Failed to activate"),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => cbbosApi.deactivate(cbbo.id),
    onSuccess: () => {
      toast.success(t.toast_deactivated ?? "CBBO deactivated");
      queryClient.invalidateQueries({ queryKey: ["cbbos"] });
    },
    onError: () => toast.error(tCommon.update_failed ?? "Failed to deactivate"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => cbbosApi.resetPassword(cbbo.id),
    onSuccess: () => toast.success(t.toast_password_reset ?? "Temporary password sent successfully"),
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Failed to reset password");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => cbbosApi.delete(cbbo.id),
    onSuccess: () => {
      toast.success(t.toast_deleted ?? "CBBO deleted");
      queryClient.invalidateQueries({ queryKey: ["cbbos"] });
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? tCommon.delete_failed ?? "Failed to delete");
    },
  });

  function handleResetPassword() {
    const name = `${cbbo.first_name} ${cbbo.last_name}`.trim() || cbbo.email;
    confirm({
      title: t.reset_password_title ?? "Reset Password",
      description: (
        t.reset_password_description ??
        'A temporary password will be generated and sent to "{name}" via email. They will be required to change it on next login.'
      ).replace("{name}", name),
      confirmLabel: "Reset",
      confirmingLabel: "Sending...",
      variant: "default",
      onConfirm: () => resetPasswordMutation.mutateAsync(),
    });
  }

  function handleDelete() {
    const name = `${cbbo.first_name} ${cbbo.last_name}`.trim() || cbbo.email;
    confirm({
      title: tConfirm.delete_cbbo ?? "Delete CBBO",
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
          return <span className="text-muted-foreground text-xs">{t.no_districts ?? "None"}</span>;
        }
        const visible = scope.slice(0, 2);
        const rest = scope.length - 2;
        return (
          <div className="flex flex-wrap gap-1">
            {visible.map((d) => (
              <Badge key={d} variant="outline" className="text-[10px]">
                {d}
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
