"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, KeyRound, type LucideIcon, Pencil, ShieldOff, Trash2, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

import { subAdminsApi } from "@/app/admin/_api/sub-admins";
import { twoFactorApi } from "@/lib/api/two-factor";
import { getErrorMessage } from "@/lib/get-error-message";
import { useConfirmStore } from "@/stores/confirm-store";
import type { SubAdmin } from "@/types/admin";

type T = Record<string, string>;

export interface SubAdminColumnHandlers {
  /** opens the Transfer District dialog (rendered at page level) */
  onTransferDistrict?: (subAdmin: SubAdmin) => void;
}

export type SubAdminActionKey = "edit" | "transfer" | "toggle_active" | "disable_2fa" | "reset_password" | "delete";

/** One sub-admin action — rendered as a row-menu item and as a View Sheet button. */
export interface SubAdminAction {
  key: SubAdminActionKey;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  separator?: boolean;
  hidden?: boolean;
}

/**
 * Edit / Transfer / Activate-Deactivate / Disable 2FA / Reset Password / Delete
 * for one sub-admin. Shared by the table's row menu and the View Sheet so both
 * offer the same actions with the same confirmations.
 */
export function useSubAdminActions(
  subAdmin: SubAdmin,
  {
    t = {},
    tConfirm = {},
    tCommon = {},
    handlers = {},
  }: { t?: T; tConfirm?: T; tCommon?: T; handlers?: SubAdminColumnHandlers },
): SubAdminAction[] {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  // The list and the View Sheet's single-record query both show the status.
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["sub-admins"] });
    queryClient.invalidateQueries({ queryKey: ["sub-admin", String(subAdmin.id)] });
  };

  const activateMutation = useMutation({
    mutationFn: () => subAdminsApi.activate(subAdmin.id),
    onSuccess: () => {
      toast.success(t.toast_activated ?? "Sub-admin activated");
      refresh();
    },
    onError: () => toast.error(tCommon.update_failed ?? "Failed to activate"),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => subAdminsApi.deactivate(subAdmin.id),
    onSuccess: () => {
      toast.success(t.toast_deactivated ?? "Sub-admin deactivated");
      refresh();
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
    // e.g. "Two-factor authentication is not enabled" when the user never set it up.
    onError: (error: unknown) => toast.error(getErrorMessage(error, t.disable_2fa_failed ?? "Failed to disable 2FA")),
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

  const name = `${subAdmin.first_name} ${subAdmin.last_name}`.trim() || subAdmin.email;

  function handleResetPassword() {
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

  function handleDisable2fa() {
    confirm({
      title: t.disable_2fa ?? "Disable 2FA",
      description: (
        t.disable_2fa_description ??
        'Two-factor authentication will be turned off for "{name}". They will sign in with just their password until they set it up again.'
      ).replace("{name}", name),
      confirmLabel: t.disable_2fa_confirm ?? "Disable",
      confirmingLabel: t.disabling ?? "Disabling...",
      variant: "destructive",
      onConfirm: () => disable2faMutation.mutateAsync(),
    });
  }

  function handleDelete() {
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

  return [
    {
      key: "edit",
      label: tCommon.edit ?? "Edit",
      icon: Pencil,
      onClick: () => router.push(`/admin/sub-admins/${subAdmin.id}/edit`),
    },
    {
      key: "transfer",
      label: t.transfer_district ?? "Transfer District",
      icon: ArrowRightLeft,
      onClick: () => handlers.onTransferDistrict?.(subAdmin),
      hidden: !handlers.onTransferDistrict,
    },
    {
      key: "toggle_active",
      label: subAdmin.is_active ? (t.deactivate ?? "Deactivate") : (t.activate ?? "Activate"),
      icon: subAdmin.is_active ? UserX : UserCheck,
      onClick: () => (subAdmin.is_active ? deactivateMutation.mutate() : activateMutation.mutate()),
      disabled: activateMutation.isPending || deactivateMutation.isPending,
      separator: true,
    },
    {
      key: "disable_2fa",
      label: t.disable_2fa ?? "Disable 2FA",
      icon: ShieldOff,
      onClick: handleDisable2fa,
      disabled: disable2faMutation.isPending,
      separator: true,
    },
    {
      key: "reset_password",
      label: t.reset_password ?? "Reset Password",
      icon: KeyRound,
      onClick: handleResetPassword,
      disabled: resetPasswordMutation.isPending,
    },
    {
      key: "delete",
      label: tCommon.delete_btn ?? "Delete",
      icon: Trash2,
      onClick: handleDelete,
      destructive: true,
      separator: true,
    },
  ];
}
