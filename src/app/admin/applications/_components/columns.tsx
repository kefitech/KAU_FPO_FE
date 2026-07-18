"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCheck, Eye, Info, MoreHorizontal, PauseCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

import { type ApplicationListItem, type ApplicationStatus, adminApplicationsApi } from "@/app/admin/_api/applications";
import { TextCell } from "@/components/data-table/cell-helpers";
import { Badge } from "@/components/ui/badge";
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

function StatusBadge({ status, label }: { status: ApplicationStatus; label: string }) {
  const variants: Record<ApplicationStatus, string> = {
    draft: "bg-muted text-muted-foreground",
    submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    under_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-600",
    info_required: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    suspended: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    claimed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${variants[status]}`}>
      {label}
    </span>
  );
}

function ActionsCell({ row, t, tCommon }: { row: ApplicationListItem; t: T; tCommon: T }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);

  const activateMutation = useMutation({
    mutationFn: () => adminApplicationsApi.activate(row.id),
    onSuccess: () => {
      toast.success(`${row.name || "FPO"} activated`);
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Failed to activate");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => adminApplicationsApi.deactivate(row.id),
    onSuccess: () => {
      toast.success(`${row.name || "FPO"} suspended`);
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Failed to suspend");
    },
  });

  const isApproved = row.status === "approved";
  const isInfoRequired = row.status === "info_required";
  const canActivate = row.status === "suspended" || row.status === "rejected";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/admin/applications/${row.id}`)}>
          <Eye className="mr-2 h-4 w-4" />
          {t.action_view ?? tCommon.view ?? "View Details"}
        </DropdownMenuItem>

        {(isApproved || isInfoRequired || canActivate) && <DropdownMenuSeparator />}

        {isApproved && (
          <DropdownMenuItem onClick={() => router.push(`/admin/applications/${row.id}?action=request-info`)}>
            <Info className="mr-2 h-4 w-4 text-orange-500" />
            Request Info
          </DropdownMenuItem>
        )}
        {isApproved && (
          <DropdownMenuItem onClick={() => router.push(`/admin/applications/${row.id}?action=reject`)}>
            <XCircle className="mr-2 h-4 w-4 text-destructive" />
            Reject
          </DropdownMenuItem>
        )}
        {isApproved && (
          <DropdownMenuItem
            onClick={() =>
              confirm({
                title: "Suspend FPO",
                description: `Are you sure you want to suspend "${row.name || "this FPO"}"? They will lose access to the portal.`,
                confirmLabel: "Suspend",
                confirmingLabel: "Suspending…",
                variant: "destructive",
                onConfirm: () => deactivateMutation.mutateAsync(),
              })
            }
            disabled={deactivateMutation.isPending}
            className="text-orange-600 focus:text-orange-600"
          >
            <PauseCircle className="mr-2 h-4 w-4" />
            {deactivateMutation.isPending ? "Suspending…" : "Suspend"}
          </DropdownMenuItem>
        )}
        {canActivate && (
          <DropdownMenuItem
            onClick={() =>
              confirm({
                title: "Activate FPO",
                description: `Are you sure you want to activate "${row.name || "this FPO"}"?`,
                confirmLabel: "Activate",
                confirmingLabel: "Activating…",
                variant: "default",
                onConfirm: () => activateMutation.mutateAsync(),
              })
            }
            disabled={activateMutation.isPending}
            className="text-green-600 focus:text-green-600"
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            {activateMutation.isPending ? "Activating…" : "Activate"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function getApplicationColumns(t: T, tCommon: T): ColumnDef<ApplicationListItem>[] {
  return [
    {
      accessorKey: "application_id",
      header: t.col_application_id ?? "Application ID",
      meta: { hideOnMobile: true },
      cell: ({ row }) => <TextCell value={row.original.application_id} mono maxWidth="max-w-[160px]" />,
    },
    {
      accessorKey: "name",
      header: t.col_fpo_name ?? "FPO Name",
      cell: ({ row }) => <TextCell value={row.original.name} maxWidth="max-w-[220px]" />,
    },
    {
      accessorKey: "district_display",
      header: t.col_district ?? "District",
      meta: { hideOnMobile: true },
    },
    {
      accessorKey: "status",
      header: t.col_status ?? "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} label={row.original.status_display} />,
    },
    {
      accessorKey: "primary_user_name",
      header: t.col_primary_user ?? "Primary User",
      meta: { hideOnMobile: true },
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <TextCell value={row.original.primary_user_name} maxWidth="max-w-[180px]" />
          <TextCell value={row.original.primary_user_email} maxWidth="max-w-[180px]" muted />
        </div>
      ),
    },
    {
      accessorKey: "current_tier",
      header: t.col_tier ?? "Tier",
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const tier = row.original.tier ?? row.original.current_tier;
        return tier ? (
          <Badge variant="outline">{tier}</Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "total_members",
      header: t.col_members ?? "Members",
      meta: { hideOnMobile: true },
      cell: ({ row }) => row.original.total_members ?? "—",
    },
    {
      accessorKey: "updated_at",
      header: t.col_last_updated ?? "Last Updated",
      meta: { hideOnMobile: true },
      cell: ({ row }) =>
        new Date(row.original.updated_at).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="sticky right-0 bg-background">
          <ActionsCell row={row.original} t={t} tCommon={tCommon} />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
