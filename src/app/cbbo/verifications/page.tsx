"use client";

import { Suspense, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import type { ColumnDef } from "@tanstack/react-table";

import { cbboFposApi } from "@/app/cbbo/_api/fpos";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { AssignedFPO } from "@/types/cbbo";

type T = Record<string, string>;

const STATUS_BADGE_STYLES: Record<string, string> = {
  submitted: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  under_review: "border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  approved: "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400",
  info_required: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  suspended: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
};
export default function CBBOVerificationsPage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [view, setView] = useState<{ open: boolean; row: AssignedFPO | null }>({ open: false, row: null });

  useEffect(() => {
    translationsApi
      .getPublic(locale, "cbbo_verifications,common")
      .then((data) => {
        setT({ ...(data.cbbo_verifications ?? {}), ...(data.common ?? {}) });
      })
      .catch(() => undefined);
  }, [locale]);

  function getStatusLabel(status: string | undefined, fallback: string | undefined) {
    if (!status) return fallback ?? "Unknown";
    return t[`status_${status}`] ?? fallback ?? status;
  }

  function statusBadge(status: string, fallback: string) {
    return (
      <Badge variant="outline" className={`text-[11px] ${STATUS_BADGE_STYLES[status] ?? "border-muted text-muted-foreground"}`}>
        {getStatusLabel(status, fallback)}
      </Badge>
    );
  }

  const columns: ColumnDef<AssignedFPO>[] = [
    {
      accessorKey: "name",
      header: t.col_name ?? "FPO Name",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "application_id",
      header: t.col_application_id ?? "Application ID",
      meta: { hideOnMobile: true },
      cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.original.application_id}</span>,
    },
    {
      accessorKey: "district_display",
      header: t.col_district ?? "District",
      meta: { hideOnMobile: true },
      cell: ({ row }) => <span className="text-sm">{row.original.district_display ?? row.original.district}</span>,
    },
    {
      accessorKey: "status",
      header: t.col_status ?? "Status",
      cell: ({ row }) => statusBadge(row.original.status, row.original.status_display),
    },
    {
      accessorKey: "total_members",
      header: t.col_members ?? "Members",
      meta: { hideOnMobile: true },
      cell: ({ row }) => <span className="text-sm">{row.original.total_members}</span>,
    },
    {
      accessorKey: "updated_at",
      header: t.col_updated ?? "Updated",
      meta: { hideOnMobile: true },
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{new Date(row.original.updated_at).toLocaleDateString()}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-bold text-2xl">{t.page_title ?? "FPO Verifications"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">{t.page_description ?? "FPOs in your assigned districts"}</p>
      </div>

      <Suspense>
        <DataTable
          queryKey="cbbo-fpos"
          queryFn={cbboFposApi.getAll}
          columns={columns}
          onRowClick={(row) => setView({ open: true, row })}
          columnsLabel={t.col_header ?? "Columns"}
          toggleColumnsLabel={t.col_toggle_columns ?? "Toggle columns"}
          searchPlaceholder={t.search_placeholder ?? "Search..."}
        />
      </Suspense>

      <ViewSheet
        open={view.open}
        onOpenChange={(open) => setView((s) => ({ ...s, open }))}
        title={view.row?.name ?? (t.view_default_title ?? "FPO Details")}
        actions={
          view.row
            ? [{ label: t.action_submit_report ?? "Submit Report", onClick: () => router.push(`/cbbo/reports/new?fpo_id=${view.row?.id}`) }]
            : []
        }
        fields={
          view.row
            ? [
                { label: t.field_application_id ?? "Application ID", value: view.row.application_id },
                { label: t.field_district ?? "District", value: view.row.district_display ?? view.row.district },
                { label: t.field_status ?? "Status", value: getStatusLabel(view.row.status, view.row.status_display) },
                { label: t.field_total_members ?? "Total Members", value: String(view.row.total_members) },
                { label: t.field_tier ?? "Tier", value: view.row.tier ?? "—" },
                { label: t.field_last_updated ?? "Last Updated", type: "date", value: view.row.updated_at },
              ]
            : []
        }
      />
    </div>
  );
}
