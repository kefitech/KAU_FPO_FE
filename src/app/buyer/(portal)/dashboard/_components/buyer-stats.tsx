"use client";

import Link from "next/link";

import { AlertTriangle, ArrowRight, CheckCircle2, MessageSquareText, Package, Sparkles } from "lucide-react";

import type { BuyerDashboardStats, BuyerInquiryStatus } from "@/app/buyer/_api/dashboard";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { DonutChart } from "@/components/shared/donut-chart";
import { GradientBarChart } from "@/components/shared/gradient-bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type T = Record<string, string>;

const INQUIRY_STATUSES: BuyerInquiryStatus[] = ["pending", "contacted", "resolved"];

const STATUS_COLORS: Record<BuyerInquiryStatus, string> = {
  pending: "#f59e0b",
  contacted: "#3b82f6",
  resolved: "#10b981",
};

const STATUS_BADGE_STYLES: Record<BuyerInquiryStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  contacted: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  resolved:
    "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300",
};

const fill = (template: string, n: number | string) => template.replace("{n}", String(n));

function formatPrice(value: number | string) {
  return Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function BuyerStats({
  stats,
  t,
  locale,
  hasInterests,
}: {
  stats: BuyerDashboardStats;
  t: T;
  locale: string;
  hasInterests: boolean;
}) {
  const cards = stats.cards;
  const dateLocale = locale === "ml" ? "ml-IN" : "en-IN";

  const statusLabel = (s: BuyerInquiryStatus) =>
    ({
      pending: t.status_pending ?? "Awaiting response",
      contacted: t.status_contacted ?? "Contacted",
      resolved: t.status_resolved ?? "Resolved",
    })[s];

  const monthFormat = new Intl.DateTimeFormat(dateLocale, { month: "short" });
  const trend = stats.inquiry_trend.map((m) => ({
    ...m,
    label: monthFormat.format(new Date(`${m.month}-01T00:00:00`)),
  }));

  const statusData = INQUIRY_STATUSES.map((s) => ({
    key: s,
    name: statusLabel(s),
    value: stats.inquiry_status[s] ?? 0,
    color: STATUS_COLORS[s],
  }));

  const maxListings = Math.max(1, ...stats.supply_by_commodity.map((r) => r.listings));
  const inquiriesLabel = t.chart_inquiries_label ?? "Inquiries";

  return (
    <>
      {/* ── KPI cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t.stat_products_available ?? "Products Available"}
          value={cards.products_available}
          icon={Package}
          variant="purple"
          description={fill(t.stat_products_available_desc ?? "From {n} FPOs", cards.fpos_selling)}
        />
        <StatCard
          title={t.stat_matching ?? "Matching Your Interests"}
          value={cards.matching_interests}
          icon={Sparkles}
          variant="blue"
          description={
            hasInterests
              ? fill(t.stat_matching_desc ?? "{n} new this week", cards.new_this_week)
              : (t.stat_matching_empty ?? "Add commodities to your profile")
          }
        />
        <StatCard
          title={t.stat_inquiries ?? "My Inquiries"}
          value={cards.inquiries_total}
          icon={MessageSquareText}
          variant="amber"
          description={fill(t.stat_inquiries_desc ?? "{n} awaiting response", cards.inquiries_pending)}
        />
        <StatCard
          title={t.stat_responded ?? "Responses Received"}
          value={cards.inquiries_responded}
          icon={CheckCircle2}
          variant="green"
          description={
            cards.response_rate === null
              ? (t.stat_responded_none ?? "No inquiries yet")
              : fill(t.stat_responded_desc ?? "{n}% response rate", cards.response_rate)
          }
        />
      </div>

      {/* ── Inquiry trend + status ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t.chart_inquiry_trend ?? "Inquiry Activity"}</CardTitle>
            <p className="text-muted-foreground text-xs">
              {t.chart_inquiry_trend_subtitle ?? "Inquiries you sent — last 6 months"}
            </p>
          </CardHeader>
          <CardContent>
            <GradientBarChart
              data={trend.map((m) => ({ label: m.label, value: m.count }))}
              valueLabel={inquiriesLabel}
              className="h-60"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t.chart_inquiry_status ?? "Inquiry Status"}</CardTitle>
            <p className="text-muted-foreground text-xs">
              {t.chart_inquiry_status_subtitle ?? "Where your inquiries stand"}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {cards.inquiries_total === 0 ? (
              <p className="py-16 text-center text-muted-foreground text-sm">
                {t.chart_no_inquiries ?? "You haven't sent any inquiries yet."}
              </p>
            ) : (
              <DonutChart
                data={statusData}
                totalLabel={t.chart_inquiries_total ?? "Total inquiries"}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Supply in your commodities + recent inquiries ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t.supply_title ?? "Supply in Your Commodities"}</CardTitle>
            <p className="text-muted-foreground text-xs">
              {t.supply_subtitle ?? "Live listings for the commodities you follow"}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {cards.expiring_soon > 0 && (
              <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-amber-800 text-xs dark:bg-amber-950/30 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {fill(
                  t.supply_expiring_soon ?? "{n} listings in your commodities expire within 7 days",
                  cards.expiring_soon,
                )}
              </p>
            )}
            {!hasInterests ? (
              <p className="py-6 text-center text-muted-foreground text-sm">
                {t.supply_empty ?? "Add commodities of interest to your profile to see supply here."}
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {stats.supply_by_commodity.map((row) => (
                  <li key={row.code} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium">{row.name}</span>
                      <span className="shrink-0 text-muted-foreground text-xs">
                        {row.listings > 0
                          ? `${fill(t.supply_listings ?? "{n} listings", row.listings)} · ${fill(t.supply_fpos ?? "{n} FPOs", row.fpos)}`
                          : (t.supply_none ?? "No listings right now")}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(row.listings / maxListings) * 100}%` }}
                      />
                    </div>
                    {row.prices.length > 0 && (
                      <p className="text-muted-foreground text-xs">
                        {row.prices
                          .map((p) =>
                            p.min === p.max
                              ? `₹${formatPrice(p.min)}/${p.unit}`
                              : `₹${formatPrice(p.min)}–${formatPrice(p.max)}/${p.unit}`,
                          )
                          .join(" · ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/buyer/products"
              className="flex w-fit items-center gap-1 font-medium text-primary text-sm hover:underline"
            >
              {t.browse_products ?? "Browse products"} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t.recent_title ?? "Recent Inquiries"}</CardTitle>
            <p className="text-muted-foreground text-xs">
              {cards.fpos_contacted > 0
                ? fill(t.recent_subtitle ?? "Sent to {n} FPOs so far", cards.fpos_contacted)
                : (t.recent_subtitle_empty ?? "Your latest inquiries to FPOs")}
            </p>
          </CardHeader>
          <CardContent>
            {stats.recent_inquiries.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground text-sm">
                {t.recent_empty ?? "No inquiries yet — browse products and send one."}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {stats.recent_inquiries.map((inq) => (
                  <li key={inq.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm">
                        {(locale === "ml" && inq.product_name.ml) || inq.product_name.en || "—"}
                      </p>
                      <p className="truncate text-muted-foreground text-xs">
                        {inq.fpo_name}
                        {inq.commodity_name && ` · ${inq.commodity_name}`}
                      </p>
                      <p className="mt-0.5 text-muted-foreground text-xs">
                        {t.qty_label ?? "Qty"}: {Number(inq.quantity_requested).toLocaleString("en-IN")} ·{" "}
                        {new Date(inq.created_at).toLocaleDateString(dateLocale, { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <Badge variant="outline" className={`shrink-0 text-[11px] ${STATUS_BADGE_STYLES[inq.status]}`}>
                      {statusLabel(inq.status)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
