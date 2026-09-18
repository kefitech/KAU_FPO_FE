"use client";

import { Suspense, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { govtTrainingApi } from "@/app/government/_api/training";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { GovtTrainingSession } from "@/types/government";

import { getGovernmentColumns } from "./_components/columns";

type T = Record<string, string>;

const DISTRICT_CODES = [
  "TVM", "KLM", "PTA", "ALP", "KTM", "IDK", "EKM",
  "TSR", "PKD", "MLP", "KZD", "WYD", "KNR", "KSD",
];

export default function GovernmentTrainingPage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const [translationsLoading, setTranslationsLoading] = useState(true);
  const [sheet, setSheet] = useState<{ open: boolean; session: GovtTrainingSession | null }>({
    open: false,
    session: null,
  });

  useEffect(() => {
    setTranslationsLoading(true);
    translationsApi
      .getPublic(locale, "government_training,districts,common")
      .then((data) => {
        setT({ ...(data.districts ?? {}), ...(data.government_training ?? {}) });
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined)
      .finally(() => setTranslationsLoading(false));
  }, [locale]);

  const filters = useMemo(
    () => [
      {
        key: "district",
        label: t.filter_all_district ?? "All District",
        options: DISTRICT_CODES.map((code) => ({
          value: code,
          label: t[`district_${code}`] ?? code,
        })),
      },
    ],
    [t],
  );

  const s = sheet.session;

  if (translationsLoading) {
    return (
      <div className="flex flex-col gap-6 py-6">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-56 animate-pulse rounded bg-muted" />
          <div className="h-4 w-80 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "Training Sessions"}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {t.page_description ?? "Sessions conducted for FPOs in your jurisdiction"}
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/government/training/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t.btn_new_session ?? "New Session"}
        </Button>
      </div>

      <Suspense>
        <DataTable
          queryKey="government-training-sessions"
          queryFn={govtTrainingApi.getAll}
          columns={getGovernmentColumns(t, tCommon) as unknown as ColumnDef<GovtTrainingSession>[]}
          filters={filters}
          onRowClick={(row) => setSheet({ open: true, session: row })}
          columnsLabel={tCommon.col_header ?? "Columns"}
          toggleColumnsLabel={tCommon.col_toggle_columns ?? "Toggle columns"}
          searchPlaceholder={t.search_placeholder ?? "Search by topic or FPO..."}
          clearLabel={tCommon.cancel ?? "Clear"}
        />
      </Suspense>

      {s && (
        <ViewSheet
          open={sheet.open}
          onOpenChange={(open) => setSheet((prev) => ({ ...prev, open }))}
          title={s.topic}
          actions={
            s.can_edit
              ? [
                  {
                    label: t.btn_edit_session ?? "Edit Session",
                    onClick: () => router.push(`/government/training/${s.id}`),
                  },
                ]
              : []
          }
          fields={[
            { type: "section", label: t.section_session ?? "Session" },
            { label: t.field_fpo ?? "FPO", value: s.fpo_name },
            { label: t.field_district ?? "District", value: t[`district_${s.district}`] ?? s.district },
            { label: t.field_date ?? "Date", type: "date", value: s.date },
            { label: t.field_duration ?? "Duration", value: `${s.duration_hours}h` },
            { label: t.field_venue ?? "Venue", value: s.venue || "—" },
            {
              label: t.field_attendance ?? "Attendance",
              value: `${s.attendance_count}/${s.participants_count}`,
            },
            { type: "section", label: t.section_created ?? "Created By" },
            { label: t.field_created_by ?? "Official", value: s.created_by_name },
          ]}
        />
      )}
    </div>
  );
}