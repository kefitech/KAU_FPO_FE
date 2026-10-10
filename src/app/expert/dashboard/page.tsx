"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CheckCircle, Users, XCircle } from "lucide-react";
import { toast } from "sonner";

import { type ExpertBooking, expertDashboardApi } from "@/app/expert/_api/dashboard";
import { GradientGroupedBarChart } from "@/components/shared/gradient-bar-chart";
import { RecentNotificationsCard } from "@/components/shared/recent-notifications-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inboxApi } from "@/lib/api/inbox";
import { translationsApi } from "@/lib/api/translations";
import { useAuthStore } from "@/stores/auth-store";
import { useLocaleStore } from "@/stores/locale-store";

import { ChartCard } from "./_components/chart-card";

type T = Record<string, string>;
type Period = "3" | "6" | "12" | "all";
type Outcome = "booked" | "completed" | "cancelled";
type UpcomingWindow = "today" | "week" | "month";

function formatRole(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Chart series colours match the stat tiles: blue for confirmed, green for completed, red for cancelled.
const OUTCOME_COLORS: Record<Outcome, string> = { booked: "#2563eb", completed: "#059669", cancelled: "#dc2626" };

interface MonthPoint {
  month: string;
  booked: number;
  cancelled: number;
  completed: number;
  total: number;
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  confirmed: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

const UPCOMING_ROWS = 5;

function toLocalISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromISODate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Every booking ends up in one of three buckets; pending and rejected are legacy and fold in. */
function outcomeOf(b: ExpertBooking): Outcome {
  if (b.status === "completed") return "completed";
  if (b.status === "cancelled" || b.status === "rejected") return "cancelled";
  return "booked";
}

export default function ExpertDashboardPage() {
  const locale = useLocaleStore((s) => s.locale);
  const intlLocale = locale === "ml" ? "ml-IN" : "en-IN";
  const [t, setT] = useState<T>({});
  const [translationsReady, setTranslationsReady] = useState(false);
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState<Period>("6");

  useEffect(() => {
    translationsApi
      .getPublic(locale, "expert_stats,common,notification_bell")
      .then((data) => {
        setT({ ...(data.common ?? {}), ...(data.notification_bell ?? {}), ...(data.expert_stats ?? {}) });
      })
      .catch(() => undefined)
      .finally(() => setTranslationsReady(true));
  }, [locale]);

  // Welcome toast on first login, same card as the admin and FPO dashboards
  useEffect(() => {
    if (!translationsReady) return;
    if (sessionStorage.getItem("show_welcome") === "1") {
      sessionStorage.removeItem("show_welcome");
      const fullName = user ? `${user.first_name} ${user.last_name}`.trim() : "there";
      const role = user?.role ? formatRole(user.role) : null;
      const initials = user ? `${user.first_name[0] ?? ""}${user.last_name[0] ?? ""}`.toUpperCase() : "U";
      toast.custom(
        () => (
          <div className="flex w-72 items-center gap-3 rounded-xl border bg-background px-4 py-3 shadow-lg sm:w-80">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="bg-green-100 font-semibold text-green-700 text-sm">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <p className="font-semibold text-foreground text-sm">
                {(t.welcome_msg ?? "Welcome back, {name}!").replace("{name}", fullName)}
              </p>
              {role && <p className="text-muted-foreground text-xs">{role}</p>}
            </div>
          </div>
        ),
        { duration: 4000 },
      );
    }
  }, [user, t, translationsReady]);

  const {
    data: bookings = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["expert-my-bookings"],
    queryFn: () => expertDashboardApi.getMyBookings(),
  });

  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ["expert-dashboard-notifications", locale],
    queryFn: () => inboxApi.getAll({ page: 1, page_size: 5 }),
  });

  // Fixed for the life of the page so memoised series do not recompute every render.
  const [now] = useState(() => new Date());
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayIso = toLocalISODate(now);
  // Weeks end on Sunday; both windows run from today forward.
  const endOfWeekIso = toLocalISODate(new Date(year, month, now.getDate() + ((7 - now.getDay()) % 7)));
  const endOfMonthIso = toLocalISODate(new Date(year, month + 1, 0));

  // ── Period slice ─────────────────────────────────────────────────────────
  const monthsBack = period === "all" ? null : Number(period);
  const periodStart = useMemo(() => {
    if (monthsBack === null) return null;
    return toLocalISODate(new Date(year, month - (monthsBack - 1), 1));
  }, [monthsBack, year, month]);
  const inPeriod = useMemo(
    () => bookings.filter((b) => !periodStart || b.requested_date >= periodStart),
    [bookings, periodStart],
  );
  const held = useMemo(() => inPeriod.filter((b) => outcomeOf(b) !== "cancelled"), [inPeriod]);

  // ── Headline numbers ─────────────────────────────────────────────────────
  const upcoming = useMemo(
    () =>
      bookings
        .filter((b) => outcomeOf(b) === "booked" && b.requested_date >= todayIso)
        .sort((a, b) =>
          `${a.requested_date} ${a.requested_time}`.localeCompare(`${b.requested_date} ${b.requested_time}`),
        ),
    [bookings, todayIso],
  );
  // The Upcoming tile narrows to the nearest window that has anything in it:
  // today, else the rest of this week, else the rest of this month.
  const upcomingTile = useMemo(() => {
    const windows: { key: UpcomingWindow; end: string }[] = [
      { key: "today", end: todayIso },
      { key: "week", end: endOfWeekIso },
      { key: "month", end: endOfMonthIso },
    ];
    for (const w of windows) {
      const count = upcoming.filter((b) => b.requested_date <= w.end).length;
      if (count > 0) return { count, window: w.key };
    }
    return { count: 0, window: "month" as UpcomingWindow };
  }, [upcoming, todayIso, endOfWeekIso, endOfMonthIso]);
  const completedCount = inPeriod.filter((b) => outcomeOf(b) === "completed").length;
  const cancelledCount = inPeriod.filter((b) => outcomeOf(b) === "cancelled").length;
  const fposServed = new Set(held.map((b) => b.fpo)).size;

  // ── Chart series ─────────────────────────────────────────────────────────
  const monthly = useMemo<MonthPoint[]>(() => {
    const span = monthsBack ?? 12;
    const months: { key: string; month: string }[] = [];
    for (let i = span - 1; i >= 0; i--) {
      const d = new Date(year, month - i, 1);
      months.push({
        key: toLocalISODate(d).slice(0, 7),
        month: d.toLocaleDateString(intlLocale, { month: "short", year: "2-digit" }),
      });
    }
    const byKey = new Map(
      months.map((m) => [m.key, { month: m.month, booked: 0, cancelled: 0, completed: 0, total: 0 }]),
    );
    for (const b of bookings) {
      const row = byKey.get(b.requested_date.slice(0, 7));
      if (row) {
        row[outcomeOf(b)] += 1;
        row.total += 1;
      }
    }
    return [...byKey.values()];
  }, [bookings, monthsBack, intlLocale, year, month]);

  function getStatusLabel(status: string | undefined, fallback: string | undefined) {
    if (!status) return fallback ?? "";
    return t[`status_${status}`] ?? fallback ?? status;
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">{t.loading ?? "Loading dashboard..."}</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
        {t.error_load ?? "Couldn't load dashboard data. Please refresh or try again shortly."}
      </div>
    );
  }

  const periodLabels: Record<Period, string> = {
    "3": t.period_3m ?? "Last 3 months",
    "6": t.period_6m ?? "Last 6 months",
    "12": t.period_12m ?? "Last 12 months",
    all: t.period_all ?? "All time",
  };
  const periodDesc = periodLabels[period];
  const upcomingDesc = {
    today: t.card_upcoming_today ?? "Confirmed, today",
    week: t.card_upcoming_week ?? "Confirmed, this week",
    month: t.card_upcoming_month ?? "Confirmed, this month",
  }[upcomingTile.window];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-bold text-3xl">{t.dashboard_heading ?? "Dashboard"}</h1>
        <p className="text-muted-foreground">{t.page_description ?? "How your appointments are going"}</p>
      </div>

      {/* One filter row; everything below it follows the same period. */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-muted-foreground text-sm">{t.period_label ?? "Period"}</span>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(periodLabels) as Period[]).map((p) => (
              <SelectItem key={p} value={p}>
                {periodLabels[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          gradient="from-blue-500 to-indigo-600"
          icon={CalendarClock}
          label={t.card_upcoming ?? "Upcoming"}
          value={upcomingTile.count}
          desc={upcomingDesc}
        />
        <StatTile
          gradient="from-emerald-500 to-green-600"
          icon={CheckCircle}
          label={t.card_completed ?? "Completed"}
          value={completedCount}
          desc={periodDesc}
        />
        <StatTile
          gradient="from-rose-500 to-red-600"
          icon={XCircle}
          label={t.card_cancelled ?? "Cancelled"}
          value={cancelledCount}
          desc={periodDesc}
        />
        <StatTile
          gradient="from-violet-500 to-purple-600"
          icon={Users}
          label={t.card_fpos ?? "FPOs served"}
          value={fposServed}
          desc={periodDesc}
        />
      </div>

      <ChartCard
        title={t.chart_monthly_title ?? "Bookings per month"}
        subtitle={t.chart_monthly_subtitle ?? "Confirmed, completed and cancelled appointments by month"}
        t={t}
        columns={[
          { key: "month", label: t.col_month ?? "Month" },
          { key: "booked", label: t.series_confirmed ?? "Confirmed", align: "right" },
          { key: "completed", label: t.series_completed ?? "Completed", align: "right" },
          { key: "cancelled", label: t.series_cancelled ?? "Cancelled", align: "right" },
          { key: "total", label: t.col_total ?? "Total", align: "right" },
        ]}
        rows={bookings.length ? monthly : []}
      >
        <GradientGroupedBarChart
          data={monthly.map((m) => ({
            label: m.month,
            booked: m.booked,
            completed: m.completed,
            cancelled: m.cancelled,
          }))}
          series={[
            { key: "booked", label: t.series_confirmed ?? "Confirmed", color: OUTCOME_COLORS.booked },
            { key: "completed", label: t.series_completed ?? "Completed", color: OUTCOME_COLORS.completed },
            { key: "cancelled", label: t.series_cancelled ?? "Cancelled", color: OUTCOME_COLORS.cancelled },
          ]}
          className="h-60"
        />
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.upcoming_title ?? "Next appointments"}</CardTitle>
            <CardDescription>{t.upcoming_subtitle ?? "Your nearest confirmed bookings"}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {upcoming.length === 0 && (
              <p className="py-6 text-center text-muted-foreground text-sm">
                {t.empty_upcoming ?? "No upcoming appointments."}
              </p>
            )}
            {upcoming.slice(0, UPCOMING_ROWS).map((b) => {
              const badgeStyle = STATUS_BADGE_STYLES[b.status] ?? "border-muted text-muted-foreground";
              return (
                <div key={b.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">
                      {fromISODate(b.requested_date).toLocaleDateString(intlLocale, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      · {b.requested_time}
                    </p>
                    <p className="truncate text-muted-foreground text-xs">
                      {b.fpo_name}
                      {b.user_name ? ` · ${b.user_name}` : ""}
                      {b.topic ? ` · ${b.topic}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-[11px] ${badgeStyle}`}>
                    {getStatusLabel(b.status, b.status_display)}
                  </Badge>
                </div>
              );
            })}
            {bookings.length > 0 && (
              <Button asChild variant="outline" size="sm" className="mt-1 w-fit">
                <Link href="/expert/booking">{t.btn_all_bookings ?? "View all bookings"}</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <RecentNotificationsCard
          items={notifications?.data ?? []}
          isLoading={notificationsLoading}
          viewAllHref="/expert/inbox"
          t={t}
        />
      </div>
    </div>
  );
}

function StatTile({
  gradient,
  icon: Icon,
  label,
  value,
  desc,
}: {
  gradient: string;
  icon: typeof CalendarClock;
  label: string;
  value: number;
  desc: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${gradient} p-5 text-white shadow-sm`}>
      <div className="pointer-events-none absolute -top-5 -right-5 h-24 w-24 rounded-full bg-white/10" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-sm text-white/80">{label}</p>
          <p className="mt-1 font-bold text-3xl">{value}</p>
          <p className="mt-1 text-white/70 text-xs">{desc}</p>
        </div>
        <div className="mt-0.5 shrink-0 rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}
