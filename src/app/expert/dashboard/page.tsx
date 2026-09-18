"use client";

import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CheckCircle, Clock, XCircle } from "lucide-react";

import { expertDashboardApi } from "@/app/expert/_api/dashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

const STATUS_BADGE_STYLES: Record<string, string> = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  confirmed: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  completed: "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400",
  rejected: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
  cancelled: "border-gray-500/40 bg-gray-500/10 text-gray-700 dark:text-gray-400",
};

const STRIP_COLORS = ["bg-amber-500", "bg-blue-500", "bg-emerald-500", "bg-rose-500", "bg-gray-500"];

export default function ExpertDashboardStatsPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "expert_stats,common")
      .then((data) => {
        setT({ ...(data.expert_stats ?? {}), ...(data.common ?? {}) });
      })
      .catch(() => undefined);
  }, [locale]);

  const {
    data: bookings = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["expert", "bookings", "stats"],
    queryFn: () => expertDashboardApi.getMyBookings(),
  });

  function getStatusLabel(status: string | undefined, fallback: string | undefined) {
    if (!status) return fallback ?? "Unknown";
    return t[`status_${status}`] ?? fallback ?? status;
  }

  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;

  const statusCounts = bookings.reduce<Record<string, number>>((acc, b) => {
    const key = b.status ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const maxStatusCount = Math.max(1, ...Object.values(statusCounts));

  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">{t.loading ?? "Loading dashboard..."}</div>
      </div>
    );
  }

  if (isError) {
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
        <h1 className="font-bold text-2xl">{t.page_title ?? "Booking Overview"}</h1>
        <p className="text-muted-foreground">
          {t.page_description ?? "Track your booking requests across every status"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 p-5 text-white shadow-sm">
          <div className="pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/80">{t.card_total ?? "Total Requests"}</p>
              <p className="mt-1 font-bold text-3xl tabular-nums">{bookings.length}</p>
              <p className="mt-1 text-xs text-white/70">{t.card_total_desc ?? "All time"}</p>
            </div>
            <div className="mt-0.5 shrink-0 rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
              <CalendarClock className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-white shadow-sm">
          <div className="pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/80">{t.card_pending ?? "Pending"}</p>
              <p className="mt-1 font-bold text-3xl tabular-nums">{pendingCount}</p>
              <p className="mt-1 text-xs text-white/70">{t.card_pending_desc ?? "Awaiting your response"}</p>
            </div>
            <div className="mt-0.5 shrink-0 rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
              <Clock className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-5 text-white shadow-sm">
          <div className="pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/80">{t.card_confirmed ?? "Confirmed"}</p>
              <p className="mt-1 font-bold text-3xl tabular-nums">{confirmedCount}</p>
              <p className="mt-1 text-xs text-white/70">{t.card_confirmed_desc ?? "Upcoming sessions"}</p>
            </div>
            <div className="mt-0.5 shrink-0 rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 p-5 text-white shadow-sm">
          <div className="pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/80">{t.card_completed ?? "Completed"}</p>
              <p className="mt-1 font-bold text-3xl tabular-nums">{completedCount}</p>
              <p className="mt-1 text-xs text-white/70">{t.card_completed_desc ?? "Sessions delivered"}</p>
            </div>
            <div className="mt-0.5 shrink-0 rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
              <XCircle className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.section_recent_title ?? "Recent Requests"}</CardTitle>
            <CardDescription>{t.section_recent_subtitle ?? "Your latest booking requests"}</CardDescription>
          </CardHeader>
          <CardContent className="grid max-h-80 gap-2 overflow-y-auto pr-1">
            {recentBookings.length === 0 && (
              <p className="text-muted-foreground text-sm">{t.empty_no_bookings ?? "No booking requests yet."}</p>
            )}
            {recentBookings.map((b) => {
              const label = getStatusLabel(b.status, b.status_display);
              const badgeStyle = STATUS_BADGE_STYLES[b.status ?? ""] ?? "border-muted text-muted-foreground";
              return (
                <div key={b.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">{b.fpo_name}</p>
                    <p className="text-muted-foreground text-xs">
                      {b.requested_date} · {b.requested_time}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[11px] ${badgeStyle}`}>
                    {label}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.section_status_title ?? "Requests by Status"}</CardTitle>
            <CardDescription>{t.section_status_subtitle ?? "Breakdown across all your bookings"}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {Object.entries(statusCounts).length === 0 && (
              <p className="text-muted-foreground text-sm">{t.empty_no_data ?? "No data yet."}</p>
            )}
            {Object.entries(statusCounts).map(([code, count], i) => (
              <div key={code} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{getStatusLabel(code, code)}</span>
                  <span className="text-muted-foreground text-sm">{count} requests</span>
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