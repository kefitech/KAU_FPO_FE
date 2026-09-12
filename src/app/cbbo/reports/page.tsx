"use client";

import { Suspense, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import type { ColumnDef } from "@tanstack/react-table";

import { Plus } from "lucide-react";

import { cbboReportsApi } from "@/app/cbbo/_api/reports";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { CBBOReportListItem } from "@/types/cbbo";

type T = Record<string, string>;

export default function CBBOReportsPage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  const [tDistricts, setTDistricts] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "cbbo_reports_list,districts,common")
      .then((data) => {
        setT({ ...(data.cbbo_reports_list ?? {}), ...(data.common ?? {}) });
        setTDistricts(data.districts ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  function getDistrictLabel(code: string | undefined, fallback: string | undefined) {
    if (!code) return fallback ?? "";
    return tDistricts[`district_${code}`] ?? fallback ?? code;
  }

  const columns: ColumnDef<CBBOReportListItem>[] = [
    {
      accessorKey: "fpo_name",
      header: t.col_fpo ?? "FPO",
      cell: ({ row }) => <span className="font-medium">{row.original.fpo_name}</span>,
    },
    {
      accessorKey: "district",
      header: t.col_district ?? "District",
      meta: { hideOnMobile: true },
      cell: ({ row }) => <span className="text-sm">{getDistrictLabel(row.original.district, row.original.district_display)}</span>,
    },
    {
      accessorKey: "date",
      header: t.col_date ?? "Date",
      cell: ({ row }) => <span className="text-sm">{new Date(row.original.date).toLocaleDateString()}</span>,
    },
    {
      accessorKey: "participants_count",
      header: t.col_participants ?? "Participants",
      meta: { hideOnMobile: true },
    },
    {
      accessorKey: "status",
      header: t.col_status ?? "Status",
      cell: ({ row }) =>
        row.original.status === "submitted" ? (
          <Badge
            variant="outline"
            className="border-green-500/40 bg-green-500/10 text-[11px] text-green-700 dark:text-green-400"
          >
            {t.status_submitted ?? "Submitted"}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-yellow-500/40 bg-yellow-500/10 text-[11px] text-yellow-700 dark:text-yellow-400"
          >
            {t.status_draft ?? "Draft"}
          </Badge>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "Reports"}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">{t.page_description ?? "Capacity building reports you've filed"}</p>
        </div>
        <Button size="sm" onClick={() => router.push("/cbbo/reports/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t.btn_new ?? "New Report"}
        </Button>
      </div>
      <Suspense>
        <DataTable
          queryKey="cbbo-reports"
          queryFn={cbboReportsApi.getAll}
          columns={columns}
          onRowClick={(row) => router.push(`/cbbo/reports/${row.id}`)}
          columnsLabel={t.col_header ?? "Columns"}
          toggleColumnsLabel={t.col_toggle_columns ?? "Toggle columns"}
          searchPlaceholder={t.search_placeholder ?? "Search..."}
        />
      </Suspense>
    </div>
  );
}
