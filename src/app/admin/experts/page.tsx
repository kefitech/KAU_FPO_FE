"use client";

import { Suspense, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { Plus } from "lucide-react";

import { adminExpertsApi } from "@/app/admin/_api/experts";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { AdminExpert } from "@/types/admin";

import { getExpertColumns } from "./_components/columns";
import { ExpertDetailDialog } from "./_components/expert-detail-dialog";

type T = Record<string, string>;

const FILTERS = [
  {
    key: "category",
    label: "Category",
    options: [
      { label: "Scientist / Researcher", value: "scientist" },
      { label: "Trainer / Extension Worker", value: "trainer" },
      { label: "Banker / Financial Advisor", value: "banker" },
      { label: "Facilitator / NGO", value: "facilitator" },
    ],
  },
  {
    key: "district",
    label: "District",
    options: [
      { label: "Thiruvananthapuram", value: "TVM" },
      { label: "Kollam", value: "KLM" },
      { label: "Pathanamthitta", value: "PTA" },
      { label: "Alappuzha", value: "ALP" },
      { label: "Kottayam", value: "KTM" },
      { label: "Idukki", value: "IDK" },
      { label: "Ernakulam", value: "EKM" },
      { label: "Thrissur", value: "TSR" },
      { label: "Palakkad", value: "PKD" },
      { label: "Malappuram", value: "MLP" },
      { label: "Kozhikode", value: "KZD" },
      { label: "Wayanad", value: "WYD" },
      { label: "Kannur", value: "KNR" },
      { label: "Kasaragod", value: "KSD" },
    ],
  },
];

export default function ExpertsPage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; expert: AdminExpert | null }>({
    open: false,
    expert: null,
  });

  useEffect(() => {
    translationsApi
      .getPublic(locale, "admin_experts,districts,common")
      .then((data) => {
        setT({ ...(data.districts ?? {}), ...(data.admin_experts ?? {}) });
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  const filters = useMemo(
    () =>
      FILTERS.map((f) => ({
        ...f,
        label: f.key === "category" ? (t.col_category ?? f.label) : (t.col_district ?? f.label),
        options: f.options.map((o) => ({
          ...o,
          label: f.key === "category" ? (t[`cat_${o.value}`] ?? o.label) : (t[`district_${o.value}`] ?? o.label),
        })),
      })),
    [t],
  );

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "Experts"}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {t.page_description ?? "Manage agricultural experts and KAU specialists"}
          </p>
        </div>
        <Button size="sm" className="self-start sm:self-auto" onClick={() => router.push("/admin/experts/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t.btn_add ?? "Add Expert"}
        </Button>
      </div>

      <Suspense>
        <DataTable
          queryKey="experts"
          queryFn={adminExpertsApi.getAll}
          columns={getExpertColumns(t, tCommon)}
          // filters={FILTERS}
          filters={filters}
          onRowClick={(row) => setDetailDialog({ open: true, expert: row })}
          columnsLabel={tCommon.col_header ?? "Columns"}
          toggleColumnsLabel={tCommon.col_toggle_columns ?? "Toggle columns"}
          searchPlaceholder={tCommon.search_placeholder ?? "Search..."}
          clearLabel={tCommon.cancel ?? "Clear"}
        />
      </Suspense>

      <ExpertDetailDialog
        open={detailDialog.open}
        onOpenChange={(open) => setDetailDialog((s) => ({ ...s, open }))}
        expert={detailDialog.expert}
        t={t}
        tCommon={tCommon}
      />
    </div>
  );
}
