"use client";

import { Suspense, useEffect, useState, useMemo } from "react";

import { useRouter } from "next/navigation";

import { ExternalLink, Pencil, Plus } from "lucide-react";

import { adminSchemesApi } from "@/app/admin/_api/schemes";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ViewSheet } from "@/components/ui/view-sheet";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { AdminScheme } from "@/types/admin";

import { getSchemeColumns } from "./_components/columns";

type T = Record<string, string>;

const FILTERS = [
  {
    key: "category",
    label: "Category",
    options: [
      { label: "Credit & Finance", value: "credit" },
      { label: "Insurance", value: "insurance" },
      { label: "Marketing & Trade", value: "marketing" },
      { label: "Infrastructure", value: "infrastructure" },
      { label: "Capacity Building", value: "capacity_building" },
    ],
  },
];

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  credit: "bg-blue-100 text-blue-700",
  insurance: "bg-purple-100 text-purple-700",
  marketing: "bg-green-100 text-green-700",
  infrastructure: "bg-orange-100 text-orange-700",
  capacity_building: "bg-yellow-100 text-yellow-700",
};

export default function SchemesPage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const [sheet, setSheet] = useState<{ open: boolean; scheme: AdminScheme | null }>({
    open: false,
    scheme: null,
  });

  useEffect(() => {
    translationsApi
      .getPublic(locale, "admin_schemes,common")
      .then((data) => {
        setT(data.admin_schemes ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  const filters = useMemo(
    () => [
      {
        ...FILTERS[0],
        label: t.col_category ?? FILTERS[0].label,
        options: FILTERS[0].options.map((o) => ({
          ...o,
          label: t[`cat_${o.value}`] ?? o.label,
        })),
      },
    ],
    [t]
   );

  const s = sheet.scheme;

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">{t.page_title ?? "Schemes"}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {t.page_description ?? "Manage government schemes and subsidies for FPOs"}
          </p>
        </div>
        <Button size="sm" className="self-start sm:self-auto" onClick={() => router.push("/admin/schemes/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t.btn_add ?? "Add Scheme"}
        </Button>
      </div>

      <Suspense>
        <DataTable
          queryKey="schemes"
          queryFn={adminSchemesApi.getAll}
          columns={getSchemeColumns(t, tCommon)}
          // filters={FILTERS}
          filters={filters}
          onRowClick={(row) => setSheet({ open: true, scheme: row })}
        />
      </Suspense>

      {s && (
        <ViewSheet
          open={sheet.open}
          onOpenChange={(open) => setSheet((prev) => ({ ...prev, open }))}
          title={s.name_en}
          actions={[
            {
              label: "Edit",
              icon: Pencil,
              onClick: () => router.push(`/admin/schemes/${s.id}/edit`),
            },
            ...(s.official_link
              ? [
                  {
                    label: "Official Link",
                    icon: ExternalLink,
                    onClick: () => window.open(s.official_link, "_blank"),
                  },
                ]
              : []),
          ]}
          fields={[
            { type: "section", label: "Overview" },
            {
              label: "Category",
              type: "node",
              node: (
                <Badge
                  className={`text-xs font-medium ${CATEGORY_BADGE_COLORS[s.category] ?? "bg-muted text-muted-foreground"}`}
                  variant="secondary"
                >
                  {t[`cat_${s.category}`] ?? s.category_display}
                </Badge>
              ),
            },
            { label: "Administering Body", value: s.administering_body },
            {
              label: "Status",
              type: "status",
              active: s.is_active,
              activeLabel: tCommon.badge_active ?? "Active",
              inactiveLabel: tCommon.badge_inactive ?? "Inactive",
            },
            { label: "Last Updated", type: "date", value: s.updated_at },
            ...(s.objective ? [{ label: "Objective", value: s.objective }] : []),
            { type: "section" as const, label: "Details" },
            { label: "Eligibility", value: s.eligibility },
            { label: "Benefit Details", value: s.benefit_details },
            { label: "Application Process", value: s.application_process },
          ]}
        />
      )}
    </div>
  );
}
