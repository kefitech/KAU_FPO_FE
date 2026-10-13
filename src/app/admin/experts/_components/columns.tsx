"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { adminExpertsApi } from "@/app/admin/_api/experts";
import { TextCell } from "@/components/data-table/cell-helpers";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import { getErrorMessage } from "@/lib/get-error-message";
import { useConfirmStore } from "@/stores/confirm-store";
import type { AdminExpert } from "@/types/admin";
import { DISTRICT_OPTIONS } from "@/types/fpo";

type T = Record<string, string>;

function ExpertActions({ expert, t, tCommon }: { expert: AdminExpert; t: T; tCommon: T }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const activateMutation = useMutation({
    mutationFn: () => (expert.is_active ? adminExpertsApi.deactivate(expert.id) : adminExpertsApi.activate(expert.id)),
    onSuccess: () => {
      toast.success(
        expert.is_active ? (t.toast_deactivated ?? "Expert deactivated") : (t.toast_activated ?? "Expert activated"),
      );
      queryClient.invalidateQueries({ queryKey: ["experts"] });
    },
    onError: (error: unknown) => {
      const msg = (error as { message?: string })?.message;
      toast.error(msg ?? tCommon.update_failed ?? "Failed to update expert status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminExpertsApi.delete(expert.id),
    onSuccess: () => {
      toast.success(t.toast_deleted ?? "Expert deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["experts"] });
    },
    onError: (error: unknown) => {
      const msg = (error as { message?: string })?.message;
      toast.error(msg ?? tCommon.delete_failed ?? "Failed to delete expert");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => adminExpertsApi.resetPassword(expert.id),
    onSuccess: () => toast.success(t.toast_password_reset ?? "Temporary password sent successfully"),
    onError: (error: unknown) =>
      toast.error(getErrorMessage(error, t.reset_password_failed ?? "Failed to reset password")),
  });

  function handleResetPassword() {
    confirm({
      title: t.reset_password_title ?? "Reset Password",
      description: (
        t.reset_password_description ??
        'A temporary password will be generated and sent to "{name}" via email. They will be required to change it on next login.'
      ).replace("{name}", expert.name_en || expert.email),
      confirmLabel: t.reset_confirm ?? "Reset",
      confirmingLabel: t.sending ?? "Sending...",
      variant: "default",
      onConfirm: () => resetPasswordMutation.mutateAsync(),
    });
  }

  function handleDelete() {
    confirm({
      title: t.delete_title ?? "Delete Expert",
      description: (
        t.delete_description ?? 'Are you sure you want to delete "{name}"? This action cannot be undone.'
      ).replace("{name}", expert.name_en ?? ""),
      onConfirm: () => deleteMutation.mutateAsync(),
    });
  }

  return (
    <RowActions
      actions={[
        { label: t.action_edit ?? "Edit", onClick: () => router.push(`/admin/experts/${expert.id}/edit`) },
        { label: t.action_bookings ?? "Bookings", onClick: () => router.push(`/admin/experts/${expert.id}/bookings`) },
        {
          label: expert.is_active ? (t.action_deactivate ?? "Deactivate") : (t.action_activate ?? "Activate"),
          onClick: () => activateMutation.mutate(),
          separator: true,
        },
        {
          label: t.action_reset_password ?? "Reset Password",
          onClick: handleResetPassword,
          disabled: resetPasswordMutation.isPending || !expert.is_active,
          // Older experts were never given a login, so there's no password to reset.
          hidden: !expert.has_login,
        },
        { label: t.action_delete ?? "Delete", onClick: handleDelete, destructive: true, separator: true },
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
export function getExpertColumns(t: T = {}, tCommon: T = {}, locale = "en"): ColumnDef<AdminExpert>[] {
  return [
    {
      accessorKey: "name_en",
      header: t.col_name ?? "Name",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <TextCell
            value={locale === "ml" ? row.original.name_ml || row.original.name_en : row.original.name_en}
            maxWidth="max-w-[200px]"
          />
          <TextCell value={row.original.designation} maxWidth="max-w-[200px]" muted />
        </div>
      ),
    },
    {
      accessorKey: "organisation",
      header: t.col_organisation ?? "Organisation",
      meta: { hideOnMobile: true },
      cell: ({ row }) => <TextCell value={row.original.organisation} maxWidth="max-w-[220px]" muted />,
    },
    {
      accessorKey: "category_display",
      header: t.col_category ?? "Category",
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const color = CATEGORY_BADGE_COLORS[row.original.category] ?? "bg-muted text-muted-foreground";
        return (
          <Badge className={`text-xs font-medium ${color}`} variant="secondary">
            {t[`cat_${row.original.category}`] ?? row.original.category_display}
          </Badge>
        );
      },
    },
    {
      accessorKey: "district",
      header: t.col_district ?? "District",
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const label = t[`district_${row.original.district}`] ?? row.original.district;
        return <span className="text-sm text-muted-foreground">{label || "—"}</span>;
      },
    },
    {
      accessorKey: "is_active",
      header: t.col_status ?? "Status",
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
          {row.original.is_active ? (tCommon.badge_active ?? "Active") : (tCommon.badge_inactive ?? "Inactive")}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => <ExpertActions expert={row.original} t={t} tCommon={tCommon} />,
    },
  ];
}
