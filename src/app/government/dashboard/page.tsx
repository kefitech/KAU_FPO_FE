"use client";

import { useEffect, useState } from "react";
import { BarChart3, Building2, FileText, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { govtFposApi } from "@/app/government/_api/fpos";
import { govtDashboardApi } from "@/app/government/_api/dashboard";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

export default function GovernmentDashboardPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "government_dashboard")
      .then((data) => setT(data.government_dashboard ?? {}))
      .catch(() => undefined);
  }, [locale]);

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useQuery({
    queryKey: ["government", "dashboard", "stats"],
    queryFn: () => govtDashboardApi.getStats(),
  });

  const {
    data: fpoData,
    isLoading: fposLoading,
    isError: fposError,
  } = useQuery({
    queryKey: ["government", "fpos", "dashboard"],
    queryFn: () => govtFposApi.getAll({ page: 1, page_size: 100 }),
  });

  const fpos = fpoData?.data ?? [];
  const isLoading = statsLoading || fposLoading;
  const hasError = statsError || fposError;

  const byStatusEntries = Object.entries(stats?.by_status ?? {}).sort((a, b) => b[1] - a[1]);
  const byDistrictEntries = Object.entries(stats?.by_district ?? {}).sort((a, b) => b[1] - a[1]);
  const totalDistricts = byDistrictEntries.length;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading dashboard...</div>
      </div>
    );
  }

  if (hasError || !stats) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          Couldn&apos;t load dashboard data. Please refresh or try again shortly.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-bold text-2xl">{t.page_title ?? "Government Portal"}</h1>
        <p className="text-muted-foreground">
          {stats.jurisdiction_type === "state"
            ? (t.subtitle_state ?? "Monitor FPO activities across Kerala")
            : (t.subtitle_district ?? "Monitor FPO activities in your district")}
        </p>
      </div>


      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 p-5 text-white shadow-sm">
          <div className="pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/80">{t.stat_registered_fpos ?? "Registered FPOs"}</p>
              <p className="mt-1 font-bold text-3xl tabular-nums">{stats.total}</p>
              <p className="mt-1 text-xs text-white/70">
                {stats.jurisdiction_type === "state"
                  ? (t.stat_registered_desc_state ?? "Across {{count}} districts").replace("{{count}}", String(totalDistricts))
                  : (t.stat_registered_desc_district ?? "In your district")}
              </p>
            </div>
            <div className="mt-0.5 shrink-0 rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
              <Building2 className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-5 text-white shadow-sm">
          <div className="pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/80">{t.stat_status_categories ?? "Status Categories"}</p>
              <p className="mt-1 font-bold text-3xl tabular-nums">{byStatusEntries.length}</p>
              <p className="mt-1 text-xs text-white/70">{t.stat_status_categories_desc ?? "Distinct FPO statuses"}</p>
            </div>
            <div className="mt-0.5 shrink-0 rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
              <FileText className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-white shadow-sm">
          <div className="pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/80">{t.stat_top_status ?? "Top Status"}</p>
              <p className="mt-1 font-bold text-3xl tabular-nums">{byStatusEntries[0]?.[1] ?? 0}</p>
              <p className="mt-1 text-xs text-white/70">{byStatusEntries[0]?.[0] ?? (t.no_data ?? "No data")}</p>
            </div>
            <div className="mt-0.5 shrink-0 rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 p-5 text-white shadow-sm">
          <div className="pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/80">{t.stat_jurisdiction ?? "Jurisdiction"}</p>
              <p className="mt-1 font-bold text-3xl tabular-nums capitalize">
                {stats.jurisdiction_type === "state" ? (t.jurisdiction_state ?? "State") : (t.jurisdiction_district ?? "District")}
              </p>
              <p className="mt-1 text-xs text-white/70">
                {stats.jurisdiction_type === "state"
                  ? (t.stat_jurisdiction_desc_state ?? "All Kerala districts")
                  : (t.stat_jurisdiction_desc_district ?? "Single district view")}
              </p>
            </div>
            <div className="mt-0.5 shrink-0 rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
              <MapPin className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.card_district_dist_title ?? "District-wise FPO Distribution"}</CardTitle>
            <CardDescription>{t.card_district_dist_desc ?? "FPO count by district"}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {byDistrictEntries.length === 0 && (
              <p className="text-muted-foreground text-sm">{t.empty_no_fpos_view ?? "No FPOs in view yet."}</p>
            )}
            {byDistrictEntries.map(([district, count]) => (
              <div key={district} className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">{district}</span>
                <span className="font-medium text-sm">{count} FPOs</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.card_status_breakdown_title ?? "Status Breakdown"}</CardTitle>
            <CardDescription>{t.card_status_breakdown_desc ?? "FPOs by verification status"}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {byStatusEntries.length === 0 && (
              <p className="text-muted-foreground text-sm">{t.empty_no_data ?? "No data yet."}</p>
            )}
            {byStatusEntries.map(([label, count]) => (
              <div key={label} className="rounded-lg border p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-sm">{label}</span>
                  <span className="text-muted-foreground text-xs">{count} FPOs</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${Math.round((count / (stats.total || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.card_fpos_in_view_title ?? "FPOs in View"}</CardTitle>
          <CardDescription>
            {stats.jurisdiction_type === "state"
              ? (t.card_fpos_in_view_desc_state ?? "Sample across all districts")
              : (t.card_fpos_in_view_desc_district ?? "In your assigned district")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {fpos.length === 0 && <p className="text-muted-foreground text-sm">{t.empty_no_fpos_found ?? "No FPOs found."}</p>}
          {fpos.slice(0, 8).map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">{f.name}</p>
                <p className="text-muted-foreground text-xs">{f.district_display ?? f.district}</p>
              </div>
              <span className="rounded bg-muted px-2 py-1 text-xs">{f.status_display}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
