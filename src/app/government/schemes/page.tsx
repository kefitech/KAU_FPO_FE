"use client";

import { Suspense, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Pencil, Plus } from "lucide-react";

import { govtSchemesApi } from "@/app/government/_api/schemes";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ViewSheet } from "@/components/ui/view-sheet";
import { authApi } from "@/lib/api/auth";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { GovtScheme } from "@/types/government";

import { getSchemeColumns } from "./_components/columns";

type T = Record<string, string>;

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  credit: "bg-blue-100 text-blue-700",
  insurance: "bg-purple-100 text-purple-700",
  marketing: "bg-green-100 text-green-700",
  infrastructure: "bg-orange-100 text-orange-700",
  capacity_building: "bg-yellow-100 text-yellow-700",
};

export default function GovernmentSchemesPage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tAdmin, setTAdmin] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const [sheet, setSheet] = useState<{ open: boolean; scheme: GovtScheme | null }>({
    open: false,
    scheme: null,
  });

  useEffect(() => {
    translationsApi
      .getPublic(locale, "government_schemes,admin_schemes,common")
      .then((data) => {
        setT(data.government_schemes ?? {});
        setTAdmin(data.admin_schemes ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  const { data: me } = useQuery({
    queryKey: ["auth-me"],
    queryFn: authApi.me,
    staleTime: 5 * 60 * 1000,
  });
  const currentUserId = me?.user?.id ?? null;

  const FILTERS = useMemo(
    () => [
      {
        key: "category",
        label: tAdmin.col_category ?? "Category",
        options: [
          { label: tAdmin.cat_credit ?? "Credit & Finance", value: "credit" },
          { label: tAdmin.cat_insurance ?? "Insurance", value: "insurance" },
          { label: tAdmin.cat_marketing ?? "Marketing & Trade", value: "marketing" },
          { label: tAdmin.cat_infrastructure ?? "Infrastructure", value: "infrastructure" },
          { label: tAdmin.cat_capacity_building ?? "Capacity Building", value: "capacity_building" },
        ],
      },
    ],
    [tAdmin],
  );

  const filters = FILTERS;
  const s = sheet.scheme;
  const isOwner = s ? s.created_by !== null && s.created_by === currentUserId : false;

  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">{tAdmin.page_title ?? "Schemes & Subsidies"}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">{tAdmin.page_description ?? "Manage scheme catalog entries"}</p>
        </div>
        <Button size="sm" className="self-start sm:self-auto" onClick={() => router.push("/government/schemes/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t.btn_new_scheme ?? "New Scheme"}
        </Button>
      </div>

      <Suspense>
        <DataTable
          queryKey="government-schemes"
          queryFn={govtSchemesApi.getAll}
          columns={getSchemeColumns(currentUserId, { ...tAdmin, ...t }, tCommon, locale)}
          filters={filters}
          onRowClick={(row) => setSheet({ open: true, scheme: row })}
          searchPlaceholder={t.placeholder_search ?? "Search schemes..."}
          columnsLabel={tCommon.col_header ?? "Columns"}
          toggleColumnsLabel={tCommon.col_toggle_columns ?? "Toggle columns"}
        />
      </Suspense>

      {s && (
        <ViewSheet
          open={sheet.open}
          onOpenChange={(open) => setSheet((prev) => ({ ...prev, open }))}
          title={s.name_en}
          actions={[
            ...(isOwner
              ? [
                  {
                    label: tAdmin.action_edit ?? "Edit",
                    icon: Pencil,
                    onClick: () => router.push(`/government/schemes/${s.id}/edit`),
                  },
                ]
              : []),
            ...(s.official_link
              ? [
                  {
                    label: t.field_official_link ?? "Official Link",
                    icon: ExternalLink,
                    onClick: () => window.open(s.official_link, "_blank"),
                  },
                ]
              : []),
          ]}
          fields={[
            { type: "section", label: t.section_overview ?? "Overview" },
            {
              label: tAdmin.col_category ?? "Category",
              type: "node",
              node: (
                <Badge
                  className={`text-xs font-medium ${CATEGORY_BADGE_COLORS[s.category] ?? "bg-muted text-muted-foreground"}`}
                  variant="secondary"
                >
                  {tAdmin[`cat_${s.category}`] ?? s.category_display}
                </Badge>
              ),
            },
            { label: tAdmin.col_administered_by ?? "Administering Body", value: s.administering_body },
            {
              label: t.col_created_by ?? "Created By",
              type: "node",
              node: (
                <Badge
                  variant="outline"
                  className={
                    isOwner
                      ? "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                      : "text-muted-foreground"
                  }
                >
                  {isOwner ? (t.badge_you ?? "You") : (s.created_by_name ?? t.badge_unknown ?? "Unknown")}
                </Badge>
              ),
            },
            {
              label: tAdmin.col_status ?? "Status",
              type: "status",
              active: s.is_active,
              activeLabel: t.badge_active ?? tCommon.badge_active ?? "Active",
              inactiveLabel: t.badge_inactive ?? tCommon.badge_inactive ?? "Inactive",
            },
            { label: t.field_last_updated ?? "Last Updated", type: "date", value: s.updated_at },
            ...(s.objective ? [{ label: t.field_objective ?? "Objective", value: s.objective }] : []),
            { type: "section" as const, label: t.section_details ?? "Details" },
            { label: tAdmin.field_eligibility ?? "Eligibility", value: s.eligibility },
            { label: tAdmin.field_benefit_details ?? "Benefit Details", value: s.benefit_details },
            { label: tAdmin.field_application_process ?? "Application Process", value: s.application_process },
          ]}
        />
      )}
    </div>
  );
}
