"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle, FileWarning, LayoutDashboard, MapPin, ShieldOff, Users } from "lucide-react";
import { toast } from "sonner";

import dynamic from "next/dynamic";

import { adminDashboardApi } from "@/app/admin/_api/dashboard";
import { BlockFpoList } from "./_components/block-fpo-list";
import { FpoReportCard } from "./_components/fpo-report-card";
import type { BlockEntry } from "./_components/kerala-district-map";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DonutChart } from "@/components/shared/donut-chart";
import { GradientBarChart } from "@/components/shared/gradient-bar-chart";
import { RecentNotificationsCard } from "@/components/shared/recent-notifications-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { inboxApi } from "@/lib/api/inbox";
import { translationsApi } from "@/lib/api/translations";
import { KERALA_DISTRICTS } from "@/lib/kerala-districts";
import { useAuthStore } from "@/stores/auth-store";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

const KeralaDistrictMap = dynamic(
  () => import("./_components/kerala-district-map").then((m) => ({ default: m.KeralaDistrictMap })),
  { ssr: false, loading: () => <Skeleton className="mx-auto h-[380px] w-full rounded-xl" /> },
);

// ─── Constants ────────────────────────────────────────────────────────────────

function getStatusConfig(t: T): Record<string, { label: string; color: string }> {
  return {
    draft:        { label: t.status_draft         ?? "Draft",         color: "#94a3b8" },
    submitted:    { label: t.status_submitted      ?? "Submitted",     color: "#3b82f6" },
    under_review: { label: t.status_under_review   ?? "Under Review",  color: "#f97316" },
    info_required:{ label: t.status_info_required  ?? "Info Required", color: "#eab308" },
    approved:     { label: t.status_approved       ?? "Approved",      color: "#0ea5e9" },
    rejected:     { label: t.status_rejected       ?? "Rejected",      color: "#ef4444" },
    suspended:    { label: t.status_suspended      ?? "Suspended",     color: "#7f1d1d" },
    claimed:      { label: t.status_claimed        ?? "Claimed",       color: "#6E18D9" },
  };
}

function getTierConfig(t: T): Record<string, { label: string; color: string }> {
  return {
    A:            { label: t.tier_a            ?? "Tier A",        color: "#0ea5e9" },
    B:            { label: t.tier_b            ?? "Tier B",        color: "#3b82f6" },
    C:            { label: t.tier_c            ?? "Tier C",        color: "#eab308" },
    D:            { label: t.tier_d            ?? "Tier D",        color: "#f97316" },
    not_assessed: { label: t.tier_not_assessed ?? "Not Assessed",  color: "#94a3b8" },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRole(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type StatCardVariant = "blue" | "purple" | "green" | "amber" | "red" | "gray";

const CARD_VARIANTS: Record<StatCardVariant, string> = {
  blue:   "from-blue-500 to-indigo-600",
  purple: "from-violet-500 to-purple-600",
  green:  "from-emerald-500 to-green-600",
  amber:  "from-amber-400 to-orange-500",
  red:    "from-red-500 to-rose-600",
  gray:   "from-slate-400 to-slate-500",
};

function StatCard({
  title,
  value,
  icon: Icon,
  variant = "gray",
  description,
}: {
  title: string;
  value: number | undefined;
  icon: React.ElementType;
  variant?: StatCardVariant;
  description?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${CARD_VARIANTS[variant]} p-5 text-white shadow-sm`}>
      <div className="pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white/80">{title}</p>
          {value === undefined ? (
            <Skeleton className="mt-2 h-9 w-20 bg-white/20" />
          ) : (
            <p className="mt-1 font-bold text-3xl tabular-nums">{value.toLocaleString()}</p>
          )}
          {description && <p className="mt-1 text-xs text-white/70">{description}</p>}
        </div>
        <div className="mt-0.5 shrink-0 rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

function ChartSkeleton({ h = "h-56" }: { h?: string }) {
  return <Skeleton className={`w-full rounded-xl ${h}`} />;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [translationsLoading, setTranslationsLoading] = useState(true);
  const adminPermissions = useAdminPermissions();
  const canGenerateReports = adminPermissions.can("can_generate_reports");


  useEffect(() => {
    setTranslationsLoading(true);
    translationsApi
      .getPublic(locale, "admin_dashboard,districts,common,fpo_report,notification_bell")
      .then((data) =>
        setT({
          ...(data.districts ?? {}),
          ...(data.common ?? {}),
          ...(data.notification_bell ?? {}), // relative times on the notifications card
          ...(data.fpo_report ?? {}),
          ...(data.admin_dashboard ?? {}),
        })
      )
      .catch(() => undefined)
      .finally(() => setTranslationsLoading(false));
  }, [locale]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: adminDashboardApi.getStats,
    staleTime: 5 * 60 * 1000,
  });

  const isSubAdmin = user?.role === "sub_admin";
  const isSuperAdmin = user?.role === "super_admin";

  // Map drill-down: open a district to see its blocks, then click a block to list its FPOs —
  // only districts whose FPOs the admin may view. Super admins and sub-admins with
  // can_view_all_fpos click any district; other sub-admins get a button for their own district.
  const canOpenAnyDistrict = isSuperAdmin || (isSubAdmin && adminPermissions.can("can_view_all_fpos"));
  const canDrillDown = canOpenAnyDistrict || (isSubAdmin && !!user?.district);
  const [mapDistrict, setMapDistrict] = useState<string | null>(null);
  const [mapBlock, setMapBlock] = useState<BlockEntry | null>(null);
  const blockListRef = useRef<HTMLDivElement>(null);

  const handleMapDistrictChange = (code: string | null) => {
    setMapDistrict(code);
    setMapBlock(null);
  };

  useEffect(() => {
    if (mapBlock) blockListRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [mapBlock]);

  // Sub-admins only: alerts such as a new external buyer registration in their district.
  // The Buyers table invalidates this key when it clears a buyer's "new" dot.
  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ["admin-dashboard-notifications", locale],
    queryFn: () => inboxApi.getAll({ page: 1, page_size: 5 }),
    refetchInterval: 30_000,
    enabled: isSubAdmin,
  });

  // Welcome toast on first login
  useEffect(() => {
    if (translationsLoading) return;
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
              <p className="font-semibold text-foreground text-sm">{(t.welcome_msg ?? "Welcome back, {name}!").replace("{name}", fullName)}</p>
              {role && <p className="text-muted-foreground text-xs">{role}</p>}
            </div>
          </div>
        ),
        { duration: 4000 },
      );
    }
  }, [user, translationsLoading]);

  const stats = data;

  const districtName = user?.district
    ? (t[`district_${user.district}`] ?? KERALA_DISTRICTS.find((d) => d.code === user.district)?.name ?? user.district)
    : null;

  const mapDistrictName = mapDistrict
    ? (t[`district_${mapDistrict}`] ?? KERALA_DISTRICTS.find((d) => d.code === mapDistrict)?.name ?? mapDistrict)
    : null;

  const STATUS_CONFIG = getStatusConfig(t);
  const TIER_CONFIG   = getTierConfig(t);

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
  // ── Registration trend data ────────────────────────────────────────────────
  const monthFormat = new Intl.DateTimeFormat(locale === "ml" ? "ml-IN" : "en-IN", {
    month: "short",
    year: "2-digit",
  });
  const trendData = (stats?.monthly_trend ?? []).map((m) => ({
    label: monthFormat.format(new Date(`${m.month}-01T00:00:00`)),
    value: m.count,
  }));

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
          label: t.pending_ownership_claims ?? "Ownership Claims",
          count: pa.ownership_claims,
          href: "/admin/ownership-claims?status=pending",
          icon: Users,
        },
        {
          label: t.pending_unverified_docs ?? "Unverified Documents",
          count: pa.unverified_documents,
          href: "/admin/applications?filter=unverified_docs",
          icon: FileWarning,
        },
        {
          label: t.pending_info_required ?? "Info Required FPOs",
          count: pa.info_required_fpos,
          href: "/admin/applications?status=info_required",
          icon: AlertCircle,
        },
      ].filter((i) => i.count > 0)
    : [];


  if (translationsLoading) {
    return (
      <div className="flex flex-col gap-6 py-6">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <ChartSkeleton />
          <ChartSkeleton h="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
          <div>
            {/* Sub-admins share this page; their stats are already scoped to assigned FPOs */}
            {isSubAdmin ? (
              <>
                <h1 className="font-bold text-2xl">{t.page_title_sub_admin ?? "Sub-Admin Dashboard"}</h1>
                <p className="text-muted-foreground text-sm">
                  {t.page_description_sub_admin ?? "Overview of your assigned FPOs"}
                </p>
              </>
            ) : (
              <>
                <h1 className="font-bold text-2xl">{t.page_title ?? "Admin Dashboard"}</h1>
                <p className="text-muted-foreground text-sm">{t.page_description ?? "FPO platform overview"}</p>
              </>
            )}
          </div>
        </div>

        {/* Sub-admin's district, at the right end of the header (wraps below on narrow screens) */}
        {isSubAdmin &&
          (districtName ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 font-medium text-primary text-sm">
              <MapPin className="h-4 w-4" />
              {t.assigned_district ?? "Assigned district"}: {districtName}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 font-medium text-amber-700 text-sm dark:bg-amber-900/30 dark:text-amber-300">
              <MapPin className="h-4 w-4" />
              {t.no_district_assigned ?? "No district assigned yet"}
            </span>
          ))}
      </div>

      {/* ── Row 1: Stat Cards ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t.stat_total_registrations ?? "Total Registrations"}
          value={stats?.stat_cards.total_registrations}
          icon={Users}
          variant="purple"
          description={t.stat_total_desc ?? "Across all statuses"}
        />
        <StatCard
          title={t.stat_approved_fpos ?? "Approved FPOs"}
          value={stats?.stat_cards.approved_fpos}
          icon={CheckCircle}
          variant="green"
          description={t.stat_approved_desc ?? "Active & operational"}
        />
        <StatCard
          title={t.stat_pending_applications ?? "Pending Applications"}
          value={stats?.stat_cards.pending_applications}
          icon={AlertCircle}
          variant="amber"
          description={t.stat_pending_desc ?? "Awaiting review"}
        />
        <StatCard
          title={t.stat_suspended ?? "Suspended"}
          value={stats?.stat_cards.suspended_fpos}
          icon={ShieldOff}
          variant={stats?.stat_cards.suspended_fpos ? "red" : "gray"}
          description={
            stats?.stat_cards.suspended_fpos
              ? (t.stat_suspended_desc ?? "Requires attention")
              : (t.stat_suspended_ok ?? "None suspended")
          }
        />
      </div>

      {/* ── Row 2: Monthly Trend + Status Breakdown ───────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Monthly trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t.chart_reg_trend ?? "Registration Trend"}</CardTitle>
            <p className="text-muted-foreground text-xs">{t.chart_reg_trend_subtitle ?? "Monthly FPO registrations — last 12 months"}</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <GradientBarChart data={trendData} valueLabel="Registrations" color="var(--primary)" className="h-60" />
            )}
          </CardContent>
        </Card>

        {/* Status breakdown donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t.chart_status_breakdown ?? "Status Breakdown"}</CardTitle>
            <p className="text-muted-foreground text-xs">{t.chart_status_subtitle ?? "All FPOs by current status"}</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {isLoading ? (
              <ChartSkeleton h="h-48" />
            ) : (
              <DonutChart data={statusData} totalLabel={t.donut_total ?? "Total FPOs"} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Left (Tier + Actions) | Right (Map) ───────────────────── */}
      {/* Columns stretch to equal height: the map grows to fill, or the Tier card does when the map is taller */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Left column: Tier Distribution + Action Required stacked */}
        <div className="flex flex-col gap-6">
          {/* Tier bar chart */}
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t.chart_tier_dist ?? "Tier Distribution"}</CardTitle>
              <p className="text-muted-foreground text-xs">{t.chart_tier_subtitle ?? "Approved FPOs by performance tier"}</p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartSkeleton />
              ) : (
                // Tier colours carry meaning (they match the tier badges), so they replace the palette
                <GradientBarChart
                  data={tierData.map((d) => ({ label: d.name, value: d.value, color: d.color }))}
                  valueLabel="FPOs"
                  highlightPeak={false}
                  className="h-60"
                />
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
                    {t.action_required ?? "Action Required"}
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
              {t.no_pending_actions ?? "No pending actions — everything is up to date."}
            </div>
          )}
        </div>

        {/* Right column: District distribution map */}
        <Card className="overflow-hidden isolation-isolate pb-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {t.chart_district_dist ?? "District Distribution"}
              {mapDistrictName && <span className="font-normal text-muted-foreground"> · {mapDistrictName}</span>}
            </CardTitle>
            <p className="text-muted-foreground text-xs">
              {/* The map is statewide for sub-admins too, unlike the rest of their (district-scoped) dashboard;
                  they can drill into their own district's blocks only. */}
              {mapDistrict
                ? (t.map_block_hint ?? "Hover a block for its FPO count, click it to list its FPOs")
                : canOpenAnyDistrict
                  ? (t.chart_district_subtitle_drilldown ??
                    "FPOs registered per district — click a district to see its blocks")
                  : isSubAdmin
                    ? (t.chart_district_subtitle_statewide ??
                      "FPOs registered in every district of Kerala — hover for details")
                    : (t.chart_district_subtitle ?? "FPOs registered per district — hover for details")}
            </p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col p-0">
            <KeralaDistrictMap
              data={stats?.district_distribution ?? []}
              locale={locale}
              t={t}
              drilldown={
                canDrillDown
                  ? {
                      district: mapDistrict,
                      block: mapBlock?.code ?? null,
                      onDistrictChange: handleMapDistrictChange,
                      onBlockSelect: setMapBlock,
                      clickToOpen: canOpenAnyDistrict,
                      homeDistrict:
                        isSubAdmin && user?.district
                          ? { code: user.district, name: districtName ?? user.district }
                          : undefined,
                    }
                  : undefined
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* ── FPOs in the block clicked on the map ──────────────────────────── */}
      {canDrillDown && mapDistrict && mapBlock && (
        <div>
          {/* Scroll target — brings the list's header into view without scrolling the map away */}
          <div ref={blockListRef} className="scroll-mb-40" />
          <BlockFpoList
            district={mapDistrict}
            districtName={mapDistrictName ?? mapDistrict}
            block={mapBlock}
            locale={locale}
            t={t}
            statusConfig={STATUS_CONFIG}
            tierConfig={TIER_CONFIG}
            onClose={() => setMapBlock(null)}
          />
        </div>
      )}

      {/* ── Sub-admins: alerts such as new external buyer registrations in their district.
          Full width so its varying length doesn't unbalance the Tier/Actions vs Map columns. */}
      {/* Not marked read on click: the page it opens clears it (opening the buyer's row),
          and that row keeps its "new" dot until then. */}
      {isSubAdmin && (
        <RecentNotificationsCard
          items={notifications?.data ?? []}
          isLoading={notificationsLoading}
          viewAllHref="/admin/inbox"
          t={t}
        />
      )}

      {/* ── Row 4: Reports — sub-admins need can_generate_reports ─────────────── */}
      {canGenerateReports && <FpoReportCard t={t} />}
    </div>
  );
}
