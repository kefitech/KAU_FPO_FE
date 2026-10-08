"use client";

import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle, Clock, FileText } from "lucide-react";

import { cbboDashboardApi } from "@/app/cbbo/_api/dashboard";
import { cbboFposApi } from "@/app/cbbo/_api/fpos";
import { cbboReportsApi } from "@/app/cbbo/_api/reports";
import { FpoStatusBadge } from "@/components/shared/fpo-status-badge";
import { GradientBarChart } from "@/components/shared/gradient-bar-chart";
import { RecentNotificationsCard, useMarkNotificationRead } from "@/components/shared/recent-notifications-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { inboxApi } from "@/lib/api/inbox";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

const STRIP_COLORS = ["bg-violet-500", "bg-blue-500", "bg-amber-500", "bg-emerald-500", "bg-rose-500", "bg-cyan-500"];

export default function CbboDashboardPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "cbbo_dashboard,common,notification_bell")
      .then((data) => {
        // notification_bell: relative times on the notifications card
        setT({ ...(data.notification_bell ?? {}), ...(data.cbbo_dashboard ?? {}), ...(data.common ?? {}) });
      })
      .catch(() => undefined);
  }, [locale]);

  const {
    data: fpoData,
    isLoading: fposLoading,
    isError: fposError,
  } = useQuery({
    queryKey: ["cbbo", "fpos", "dashboard"],
    queryFn: () => cbboFposApi.getAll({ page: 1, page_size: 100 }),
  });

  const {
    data: reportsData,
    isLoading: reportsLoading,
    isError: reportsError,
  } = useQuery({
    queryKey: ["cbbo", "reports", "dashboard"],
    queryFn: () => cbboReportsApi.getAll({ page: 1, page_size: 100 }),
  });

  // The chart and notifications load on their own — they don't hold up the page.
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useQuery({
    queryKey: ["cbbo", "dashboard", "stats"],
    queryFn: () => cbboDashboardApi.getStats(),
  });

  // e.g. a KAU admin / sub-admin commented on one of the officer's training sessions
  const notificationsKey = ["cbbo-dashboard-notifications", locale];
  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: notificationsKey,
    queryFn: () => inboxApi.getAll({ page: 1, page_size: 5 }),
    refetchInterval: 30_000,
  });
  const markNotificationRead = useMarkNotificationRead(notificationsKey);

  const fpos = fpoData?.data ?? [];
  const reports = reportsData?.data ?? [];

  const monthFormat = new Intl.DateTimeFormat(locale === "ml" ? "ml-IN" : "en-IN", {
    month: "short",
    year: "2-digit",
  });
  const trainingTrend = (stats?.training_trend ?? []).map((m) => ({
    label: monthFormat.format(new Date(`${m.month}-01T00:00:00`)),
    value: m.count,
  }));

  const isLoading = fposLoading || reportsLoading;
  const hasError = fposError || reportsError;

  const draftReports = reports.filter((r) => r.status === "draft").length;
  const submittedReports = reports.filter((r) => r.status === "submitted").length;

  function getStatusLabel(status: string | undefined, fallback: string | undefined) {
    if (!status) return fallback ?? "Unknown";
    return t[`status_${status}`] ?? fallback ?? status;
  }

  const statusCounts = fpos.reduce<Record<string, number>>((acc, f) => {
    const key = f.status ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const maxStatusCount = Math.max(1, ...Object.values(statusCounts));

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">{t.loading ?? "Loading dashboard..."}</div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          {t.error_load ?? "Couldn't load dashboard data. Please refresh or try again shortly."}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-bold text-2xl">{t.page_title ?? "CBBO/NGO Portal"}</h1>
        <p className="text-muted-foreground">
          {t.page_description ?? "Verify FPOs and track progress in your assigned districts"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 p-5 text-white shadow-sm">
          <div className="pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/80">{t.card_assigned_fpos ?? "Assigned FPOs"}</p>
              <p className="mt-1 font-bold text-3xl tabular-nums">
                {fpoData?.meta?.pagination?.total_count ?? fpos.length}
              </p>
              <p className="mt-1 text-xs text-white/70">{t.card_assigned_fpos_desc ?? "In your jurisdiction"}</p>
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
              <p className="truncate text-sm font-medium text-white/80">{t.card_draft_reports ?? "Draft Reports"}</p>
              <p className="mt-1 font-bold text-3xl tabular-nums">{draftReports}</p>
              <p className="mt-1 text-xs text-white/70">{t.card_draft_reports_desc ?? "Not yet submitted"}</p>
            </div>
            <div className="mt-0.5 shrink-0 rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
              <Clock className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 p-5 text-white shadow-sm">
          <div className="pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/80">
                {t.card_submitted_reports ?? "Submitted Reports"}
              </p>
              <p className="mt-1 font-bold text-3xl tabular-nums">{submittedReports}</p>
              <p className="mt-1 text-xs text-white/70">{t.card_submitted_reports_desc ?? "Locked & filed"}</p>
            </div>
            <div className="mt-0.5 shrink-0 rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-5 text-white shadow-sm">
          <div className="pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/80">{t.card_total_reports ?? "Total Reports"}</p>
              <p className="mt-1 font-bold text-3xl tabular-nums">{reports.length}</p>
              <p className="mt-1 text-xs text-white/70">{t.card_total_reports_desc ?? "All statuses"}</p>
            </div>
            <div className="mt-0.5 shrink-0 rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t.chart_training_trend ?? "Training Sessions"}</CardTitle>
            <CardDescription className="text-xs">
              {t.chart_training_trend_subtitle ?? "Sessions you recorded per month — last 12 months"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-60 w-full rounded-xl" />
            ) : statsError ? (
              <p className="text-muted-foreground text-sm">
                {t.error_load ?? "Couldn't load dashboard data. Please refresh or try again shortly."}
              </p>
            ) : (
              <GradientBarChart
                data={trainingTrend}
                valueLabel={t.chart_training_value ?? "Sessions"}
                color="var(--primary)"
                className="h-60"
              />
            )}
          </CardContent>
        </Card>

        {/* lg: fills the chart card's height and scrolls inside it rather than stretching the row */}
        <div className="relative">
          <RecentNotificationsCard
            items={notifications?.data ?? []}
            isLoading={notificationsLoading}
            onOpen={markNotificationRead}
            emptyHint={t.notifications_empty_hint ?? "KAU comments on your training sessions will appear here"}
            t={t}
            className="max-h-96 lg:absolute lg:inset-0 lg:max-h-none"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.section_assigned_fpos_title ?? "Assigned FPOs"}</CardTitle>
            <CardDescription>{t.section_assigned_fpos_subtitle ?? "FPOs in your jurisdiction"}</CardDescription>
          </CardHeader>
          <CardContent className="grid max-h-80 gap-2 overflow-y-auto">
            {fpos.length === 0 && (
              <p className="text-muted-foreground text-sm">{t.empty_no_fpos ?? "No FPOs assigned yet."}</p>
            )}
            {fpos.map((f) => {
              const label = getStatusLabel(f.status, f.status_display);
              return (
                <div key={f.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">{f.name}</p>
                    <p className="text-muted-foreground text-xs">{f.district_display ?? f.district}</p>
                  </div>
                  <FpoStatusBadge status={f.status} label={label} />
                </div>
              );
            })}
          </CardContent>
        </Card>
        

        <Card>
          <CardHeader>
            <CardTitle>{t.section_status_title ?? "FPOs by Status"}</CardTitle>
            <CardDescription>{t.section_status_subtitle ?? "Breakdown across your jurisdiction"}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {Object.entries(statusCounts).length === 0 && (
              <p className="text-muted-foreground text-sm">{t.empty_no_data ?? "No data yet."}</p>
            )}
            {Object.entries(statusCounts).map(([code, count], i) => (
              <div key={code} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{getStatusLabel(code, code)}</span>
                  <span className="text-muted-foreground text-sm">{count} FPOs</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${STRIP_COLORS[i % STRIP_COLORS.length]}`}
                    style={{ width: `${(count / maxStatusCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
