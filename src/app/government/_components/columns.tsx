"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { governmentApi } from "@/app/admin/_api/government";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { useConfirmStore } from "@/stores/confirm-store";
import type { GovernmentOfficial } from "@/types/admin";

type T = Record<string, string>;

function GovernmentActions({ official, t, tConfirm, tCommon }: { official: GovernmentOfficial; t: T; tConfirm: T; tCommon: T }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const activateMutation = useMutation({
    mutationFn: () => governmentApi.activate(official.id),
    onSuccess: () => {
      toast.success(t.toast_activated ?? "Official activated");
      queryClient.invalidateQueries({ queryKey: ["government"] });
    },
    onError: () => toast.error(tCommon.update_failed ?? "Failed to activate"),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => governmentApi.deactivate(official.id),
    onSuccess: () => {
      toast.success(t.toast_deactivated ?? "Official deactivated");
      queryClient.invalidateQueries({ queryKey: ["government"] });
    },
    onError: () => toast.error(tCommon.update_failed ?? "Failed to deactivate"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => governmentApi.resetPassword(official.id),
    onSuccess: () => toast.success(t.toast_password_reset ?? "Temporary password sent successfully"),
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Failed to reset password");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => governmentApi.delete(official.id),
    onSuccess: () => {
      toast.success(t.toast_deleted ?? "Official deleted");
      queryClient.invalidateQueries({ queryKey: ["government"] });
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? tCommon.delete_failed ?? "Failed to delete");
    },
  });

  function handleResetPassword() {
    const name = `${official.first_name} ${official.last_name}`.trim() || official.email;
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
    const name = `${official.first_name} ${official.last_name}`.trim() || official.email;
    confirm({
      title: tConfirm.delete_government ?? "Delete Official",
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
        { label: tCommon.edit ?? "Edit", onClick: () => router.push(`/admin/government/${official.id}/edit`) },
        {
          label: official.is_active ? (t.deactivate ?? "Deactivate") : (t.activate ?? "Activate"),
          onClick: () => (official.is_active ? deactivateMutation.mutate() : activateMutation.mutate()),
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

export function getGovernmentColumns(t: T = {}, tConfirm: T = {}, tCommon: T = {}): ColumnDef<GovernmentOfficial>[] {
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
      accessorKey: "designation",
      header: t.col_designation ?? "Designation",
      meta: { hideOnMobile: true },
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.designation}</span>,
    },
    {
      accessorKey: "email",
      header: t.col_email ?? "Email",
      meta: { hideOnMobile: true },
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
    },
    {
      accessorKey: "jurisdiction_type",
      header: t.col_jurisdiction ?? "Jurisdiction",
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const o = row.original;
        if (o.jurisdiction_type === "state") {
          return (
            <Badge variant="secondary" className="text-[10px]">
              {t.state_wide ?? "State-wide"}
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="text-[10px]">
            {o.assigned_district_display ?? o.assigned_district ?? "—"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "is_active",
      header: t.col_status ?? "Status",
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge variant="outline" className="border-green-500/40 bg-green-500/10 text-[11px] text-green-700 dark:text-green-400">
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
      cell: ({ row }) => <span className="text-muted-foreground text-sm">{new Date(row.original.date_joined).toLocaleDateString()}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <GovernmentActions official={row.original} t={t} tConfirm={tConfirm} tCommon={tCommon} />,
    },
  ];
}