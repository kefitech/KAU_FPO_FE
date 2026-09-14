"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Ban, CheckCheck, KeyRound, MoreHorizontal, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";

import { type AdminBuyer, adminBuyersApi, type BuyerStatus } from "@/app/admin/_api/buyers";
import { TextCell } from "@/components/data-table/cell-helpers";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfirmStore } from "@/stores/confirm-store";

type T = Record<string, string>;

function StatusBadge({ status, label }: { status: BuyerStatus | "deactivated"; label: string }) {
  const variants: Record<BuyerStatus | "deactivated", string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    verified: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-600",
    deactivated: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${variants[status]}`}>
      {label}
    </span>
  );
}

function ActionsCell({ row, t }: { row: AdminBuyer; t: T }) {
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const verifyMutation = useMutation({
    mutationFn: () => adminBuyersApi.verify(row.id),
    onSuccess: () => {
      toast.success(`${row.name || "Buyer"} verified`);
      queryClient.invalidateQueries({
        predicate: (query) => typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("admin-buyers"),
      });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Failed to verify");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => adminBuyersApi.reject(row.id),
    onSuccess: () => {
      toast.success(`${row.name || "Buyer"} rejected`);
      queryClient.invalidateQueries({
        predicate: (query) => typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("admin-buyers"),
      });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Failed to reject");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => adminBuyersApi.deactivate(row.id),
    onSuccess: () => {
      toast.success(`${row.name || "Buyer"} deactivated`);
      queryClient.invalidateQueries({
        predicate: (query) => typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("admin-buyers"),
      });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Failed to deactivate");
    },
  });

  const activateMutation = useMutation({
    mutationFn: () => adminBuyersApi.activate(row.id),
    onSuccess: () => {
      toast.success(`${row.name || "Buyer"} activated`);
      queryClient.invalidateQueries({
        predicate: (query) => typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("admin-buyers"),
      });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Failed to activate");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => adminBuyersApi.resetPassword(row.id),
    onSuccess: () => {
      toast.success(`Password reset for ${row.name || "buyer"}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Failed to reset password");
    },
  });

  const isPending = row.status === "pending";
  const isVerified = row.status === "verified";
  const hasLinkedAccount = row.account_active !== null;

  if (isPending) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() =>
              confirm({
                title: "Verify Buyer",
                description: `Are you sure you want to verify "${row.name || "this buyer"}"?`,
                confirmLabel: "Verify",
                confirmingLabel: "Verifying…",
                variant: "default",
                onConfirm: () => verifyMutation.mutateAsync(),
              })
            }
            disabled={verifyMutation.isPending}
            className="text-green-600 focus:text-green-600"
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            {t.action_verify ?? "Verify"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              confirm({
                title: "Reject Buyer",
                description: `Are you sure you want to reject "${row.name || "this buyer"}"?`,
                confirmLabel: "Reject",
                confirmingLabel: "Rejecting…",
                variant: "destructive",
                onConfirm: () => rejectMutation.mutateAsync(),
              })
            }
            disabled={rejectMutation.isPending}
            className="text-destructive focus:text-destructive"
          >
            <XCircle className="mr-2 h-4 w-4" />
            {t.action_reject ?? "Reject"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (isVerified && hasLinkedAccount) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {row.account_active ? (
            <DropdownMenuItem
              onClick={() =>
                confirm({
                  title: "Deactivate Buyer Account",
                  description: `Are you sure you want to deactivate "${row.name || "this buyer"}"? They will lose access to their account.`,
                  confirmLabel: "Deactivate",
                  confirmingLabel: "Deactivating…",
                  variant: "destructive",
                  onConfirm: () => deactivateMutation.mutateAsync(),
                })
              }
              disabled={deactivateMutation.isPending}
              className="text-destructive focus:text-destructive"
            >
              <Ban className="mr-2 h-4 w-4" />
              {t.action_deactivate ?? "Deactivate"}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() =>
                confirm({
                  title: "Activate Buyer Account",
                  description: `Are you sure you want to activate "${row.name || "this buyer"}"?`,
                  confirmLabel: "Activate",
                  confirmingLabel: "Activating…",
                  variant: "default",
                  onConfirm: () => activateMutation.mutateAsync(),
                })
              }
              disabled={activateMutation.isPending}
              className="text-green-600 focus:text-green-600"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              {t.action_activate ?? "Activate"}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              confirm({
                title: "Reset Password",
                description: `A temporary password will be generated and sent to "${row.name || "this buyer"}" via email. They will be required to change it on next login.`,
                confirmLabel: "Reset Password",
                confirmingLabel: "Resetting…",
                variant: "default",
                onConfirm: () => resetPasswordMutation.mutateAsync(),
              })
            }
            disabled={resetPasswordMutation.isPending}
          >
            <KeyRound className="mr-2 h-4 w-4" />
            {t.action_reset_password ?? "Reset Password"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return null;
}

export function getBuyerColumns(t: T = {}): ColumnDef<AdminBuyer>[] {
  return [
    {
      accessorKey: "name",
      header: t.col_name ?? "Name",
      cell: ({ row }) => <TextCell value={row.original.name} maxWidth="max-w-[200px]" />,
    },
    {
      accessorKey: "organisation",
      header: t.col_organisation ?? "Organisation",
      meta: { hideOnMobile: true },
      cell: ({ row }) => <TextCell value={row.original.organisation} maxWidth="max-w-[200px]" />,
    },
    {
      accessorKey: "contact_email",
      header: t.col_email ?? "Email",
      meta: { hideOnMobile: true },
      cell: ({ row }) => <TextCell value={row.original.contact_email} maxWidth="max-w-[220px]" />,
    },
    {
      accessorKey: "contact_phone",
      header: t.col_phone ?? "Phone",
      meta: { hideOnMobile: true },
      cell: ({ row }) => row.original.contact_phone || "—",
    },
    {
      accessorKey: "status",
      header: t.col_status ?? "Status",
      cell: ({ row }) => {
        const isDeactivated = row.original.status === "verified" && row.original.account_active === false;
        const displayStatus = isDeactivated ? "deactivated" : row.original.status;
        const label = isDeactivated
          ? (t.status_deactivated ?? "Deactivated")
          : (t[`status_${row.original.status}`] ?? row.original.status);
        return <StatusBadge status={displayStatus} label={label} />;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="sticky right-0 bg-background">
          <ActionsCell row={row.original} t={t} />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
