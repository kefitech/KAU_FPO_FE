"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRightCircle, Eye, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { type ApplicationListItem, type ApplicationStatus, adminApplicationsApi } from "@/app/admin/_api/applications";
import { TextCell } from "@/components/data-table/cell-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type T = Record<string, string>;

function StatusBadge({ status, label }: { status: ApplicationStatus; label: string }) {
  const variants: Record<ApplicationStatus, string> = {
    draft: "bg-muted text-muted-foreground",
    submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    under_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
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

  const markUnderReviewMutation = useMutation({
    mutationFn: () => adminApplicationsApi.markUnderReview(row.id),
    onSuccess: () => {
      toast.success("Marked as Under Review");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Action failed"),
  });

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
          {t.action_view ?? tCommon.view ?? "View"}
        </DropdownMenuItem>
        {row.status === "submitted" && (
          <DropdownMenuItem
            onClick={() => markUnderReviewMutation.mutate()}
            disabled={markUnderReviewMutation.isPending}
          >
            <ArrowRightCircle className="mr-2 h-4 w-4" />
            {t.action_mark_under_review ?? "Mark Under Review"}
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
    },
    {
      accessorKey: "status",
      header: t.col_status ?? "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} label={row.original.status_display} />,
    },
    {
      accessorKey: "primary_user_name",
      header: t.col_primary_user ?? "Primary User",
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
      cell: ({ row }) => row.original.total_members ?? "—",
    },
    {
      accessorKey: "updated_at",
      header: t.col_last_updated ?? "Last Updated",
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
