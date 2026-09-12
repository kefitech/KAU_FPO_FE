"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { govtSchemesApi } from "@/app/government/_api/schemes";
import { TextCell } from "@/components/data-table/cell-helpers";
import { RowActions } from "@/components/data-table/row-actions";
import { Badge } from "@/components/ui/badge";
import type { GovtScheme } from "@/types/government";

type T = Record<string, string>;

function SchemeActions({
  scheme,
  currentUserId,
  t,
  tCommon,
}: {
  scheme: GovtScheme;
  currentUserId: number | null;
  t: T;
  tCommon: T;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isOwner = scheme.created_by !== null && scheme.created_by === currentUserId;

  const toggleActiveMutation = useMutation({
    mutationFn: () => govtSchemesApi.update(scheme.id, { is_active: !scheme.is_active }),
    onSuccess: () => {
      toast.success(
        scheme.is_active ? (t.toast_deactivated ?? "Scheme deactivated") : (t.toast_activated ?? "Scheme activated"),
      );
      queryClient.invalidateQueries({ queryKey: ["government-schemes"] });
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? tCommon.update_failed ?? "Failed to update scheme status");
    },
  });

  return (
    <RowActions
      actions={[
        {
          label: isOwner ? (t.action_edit ?? "Edit") : (t.action_view ?? "View"),
          onClick: () => router.push(`/government/schemes/${scheme.id}/edit`),
        },
        ...(isOwner
          ? [
              {
                label: scheme.is_active ? (t.action_deactivate ?? "Deactivate") : (t.action_activate ?? "Activate"),
                onClick: () => toggleActiveMutation.mutate(),
                disabled: toggleActiveMutation.isPending,
                separator: true,
              },
            ]
          : []),
      ]}
    />
  );
}

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  credit: "bg-blue-100 text-blue-700",
  insurance: "bg-purple-100 text-purple-700",
  marketing: "bg-green-100 text-green-700",
  infrastructure: "bg-orange-100 text-orange-700",
  capacity_building: "bg-yellow-100 text-yellow-700",
};

export function getSchemeColumns(
  currentUserId: number | null,
  t: T = {},
  tCommon: T = {},
  locale = "en",
): ColumnDef<GovtScheme>[] {
  return [
    {
      accessorKey: "name_en",
      header: t.col_name ?? "Name",
      cell: ({ row }) => (
        <TextCell
          value={locale === "ml" ? row.original.name_ml || row.original.name_en : row.original.name_en}
          maxWidth="max-w-[280px]"
        />
      ),
    },
    {
      accessorKey: "administering_body",
      header: t.col_administering_body ?? "Administering Body",
      meta: { hideOnMobile: true },
      cell: ({ row }) => <TextCell value={row.original.administering_body} maxWidth="max-w-[200px]" muted />,
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
      accessorKey: "created_by_name",
      header: t.col_created_by ?? "Created By",
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const isOwner = row.original.created_by !== null && row.original.created_by === currentUserId;
        return (
          <Badge
            variant="outline"
            className={
              isOwner ? "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400" : "text-muted-foreground"
            }
          >
            {isOwner ? (t.badge_you ?? "You") : (row.original.created_by_name ?? t.badge_unknown ?? "Unknown")}
          </Badge>
        );
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
          {row.original.is_active ? (t.badge_active ?? tCommon.badge_active ?? "Active") : (t.badge_inactive ?? tCommon.badge_inactive ?? "Inactive")}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => <SchemeActions scheme={row.original} currentUserId={currentUserId} t={t} tCommon={tCommon} />,
    },
  ];
}
