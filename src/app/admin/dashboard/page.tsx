"use client";

import { useEffect } from "react";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle, FileWarning, LayoutDashboard, ShieldOff, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import dynamic from "next/dynamic";

import { adminDashboardApi } from "@/app/admin/_api/dashboard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth-store";
import { useLocaleStore } from "@/stores/locale-store";

const KeralaDistrictMap = dynamic(
  () => import("./_components/kerala-district-map").then((m) => ({ default: m.KeralaDistrictMap })),
  { ssr: false, loading: () => <Skeleton className="mx-auto h-[380px] w-full rounded-xl" /> },
);

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:        { label: "Draft",        color: "#94a3b8" },
  submitted:    { label: "Submitted",    color: "#3b82f6" },
  under_review: { label: "Under Review", color: "#f97316" },
  info_required:{ label: "Info Required",color: "#eab308" },
  approved:     { label: "Approved",     color: "#22c55e" },
  rejected:     { label: "Rejected",     color: "#ef4444" },
  suspended:    { label: "Suspended",    color: "#7f1d1d" },
};

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  A:            { label: "Tier A",       color: "#22c55e" },
  B:            { label: "Tier B",       color: "#3b82f6" },
  C:            { label: "Tier C",       color: "#eab308" },
  D:            { label: "Tier D",       color: "#f97316" },
  not_assessed: { label: "Not Assessed", color: "#94a3b8" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRole(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  valueClass = "",
}: {
  title: string;
  value: number | undefined;
  icon: React.ElementType;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="font-medium text-sm">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {value === undefined ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className={`font-bold text-2xl tabular-nums ${valueClass}`}>{value.toLocaleString()}</div>
        )}
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ h = "h-56" }: { h?: string }) {
  return <Skeleton className={`w-full rounded-xl ${h}`} />;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const locale = useLocaleStore((s) => s.locale);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: adminDashboardApi.getStats,
    staleTime: 5 * 60 * 1000,
  });

  // Welcome toast on first login
  useEffect(() => {
    if (sessionStorage.getItem("show_welcome") === "1") {
      sessionStorage.removeItem("show_welcome");
      const fullName = user ? `${user.first_name} ${user.last_name}`.trim() : "there";
      const role = user?.role ? formatRole(user.role) : null;
      const initials = user
        ? `${user.first_name[0] ?? ""}${user.last_name[0] ?? ""}`.toUpperCase()
        : "U";
      toast.custom(
        () => (
          <div className="flex w-80 items-center gap-3 rounded-xl border bg-background px-4 py-3 shadow-lg">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="bg-green-100 font-semibold text-green-700 text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <p className="font-semibold text-foreground text-sm">Welcome back, {fullName}!</p>
              {role && <p className="text-muted-foreground text-xs">{role}</p>}
            </div>
          </div>
        ),
        { duration: 4000 },
      );
    }
  }, [user]);

  const stats = data;

  // ── Status donut data ──────────────────────────────────────────────────────
  const statusData = stats
    ? Object.entries(stats.status_breakdown)
        .filter(([, v]) => v > 0)
        .map(([key, value]) => ({
          name: STATUS_CONFIG[key]?.label ?? key,
          value,
          color: STATUS_CONFIG[key]?.color ?? "#94a3b8",
        }))
    : [];

  // ── Tier bar data ──────────────────────────────────────────────────────────
  const tierData = stats
    ? Object.entries(stats.tier_distribution).map(([key, value]) => ({
        name: TIER_CONFIG[key]?.label ?? key,
        value,
        color: TIER_CONFIG[key]?.color ?? "#94a3b8",
      }))
    : [];

  // ── Pending actions ────────────────────────────────────────────────────────
  const pa = stats?.pending_actions;
  const pendingItems = pa
    ? [
        {
          label: "Ownership Claims",
          count: pa.ownership_claims,
          href: "/admin/ownership-claims?status=pending",
          icon: Users,
        },
        {
          label: "Unverified Documents",
          count: pa.unverified_documents,
          href: "/admin/applications?filter=unverified_docs",
          icon: FileWarning,
        },
        {
          label: "Info Required FPOs",
          count: pa.info_required_fpos,
          href: "/admin/applications?status=info_required",
          icon: AlertCircle,
        },
      ].filter((i) => i.count > 0)
    : [];


  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
        <div>
          <h1 className="font-bold text-2xl">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">FPO platform overview</p>
        </div>
      </div>

      {/* ── Row 1: Stat Cards ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Registrations"
          value={stats?.stat_cards.total_registrations}
          icon={Users}
        />
        <StatCard
          title="Approved FPOs"
          value={stats?.stat_cards.approved_fpos}
          icon={CheckCircle}
          valueClass="text-green-600 dark:text-green-400"
        />
        <StatCard
          title="Pending Applications"
          value={stats?.stat_cards.pending_applications}
          icon={AlertCircle}
          valueClass="text-yellow-600 dark:text-yellow-400"
        />
        <StatCard
          title="Suspended"
          value={stats?.stat_cards.suspended_fpos}
          icon={ShieldOff}
          valueClass={stats?.stat_cards.suspended_fpos ? "text-destructive" : ""}
        />
      </div>

      {/* ── Row 2: Monthly Trend + Status Breakdown ───────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Monthly trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Registration Trend</CardTitle>
            <p className="text-muted-foreground text-xs">Monthly FPO registrations — last 12 months</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats?.monthly_trend} barSize={18}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={24}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v) => [v ?? 0, "Registrations"] as [number, string]}
                  />
                  <Bar dataKey="count" fill="#22c55e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status breakdown donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status Breakdown</CardTitle>
            <p className="text-muted-foreground text-xs">All FPOs by current status</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {isLoading ? (
              <ChartSkeleton h="h-48" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(v) => [v ?? 0, "FPOs"] as [number, string]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex w-full flex-wrap justify-center gap-x-4 gap-y-1.5">
                  {statusData.map((s) => (
                    <div key={s.name} className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: s.color }}
                      />
                      <span className="text-muted-foreground text-xs">
                        {s.name} ({s.value})
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Left (Tier + Actions) | Right (Map) ───────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2 items-start">

        {/* Left column: Tier Distribution + Action Required stacked */}
        <div className="flex flex-col gap-6">
          {/* Tier bar chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tier Distribution</CardTitle>
              <p className="text-muted-foreground text-xs">Approved FPOs by performance tier</p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartSkeleton />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={tierData} barSize={40}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={24}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(v) => [v ?? 0, "FPOs"] as [number, string]}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {tierData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Action Required */}
          {!isLoading && pendingItems.length > 0 && (
            <Card className="border-yellow-200 dark:border-yellow-800/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <CardTitle className="text-base text-yellow-700 dark:text-yellow-400">
                    Action Required
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  {pendingItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="flex items-center gap-3 rounded-lg border bg-yellow-50/50 px-4 py-3 transition-colors hover:bg-yellow-100/50 dark:bg-yellow-900/10 dark:hover:bg-yellow-900/20"
                    >
                      <item.icon className="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm tabular-nums">{item.count}</p>
                        <p className="truncate text-muted-foreground text-xs">{item.label}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No pending actions state */}
          {!isLoading && pa && pendingItems.length === 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50/50 px-4 py-3 text-green-700 text-sm dark:border-green-800/50 dark:bg-green-900/10 dark:text-green-400">
              <CheckCircle className="h-4 w-4 shrink-0" />
              No pending actions — everything is up to date.
            </div>
          )}
        </div>

        {/* Right column: District distribution map */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">District Distribution</CardTitle>
            <p className="text-muted-foreground text-xs">FPOs registered per district — hover for details</p>
          </CardHeader>
          <CardContent className="p-0 pt-0">
            <KeralaDistrictMap
              data={stats?.district_distribution ?? []}
              locale={locale}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
