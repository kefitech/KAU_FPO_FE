"use client";

import { type ReactNode, useEffect, useState } from "react";

import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  IndianRupee,
  Lightbulb,
  Loader2,
  MapPin,
  Megaphone,
  RefreshCw,
  Settings2,
  ShieldAlert,
  Sparkles,
  Sprout,
} from "lucide-react";

import { generateBusinessPlan, getMyBusinessPlan } from "@/lib/api/recommendation";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { BusinessPlanCommodity, BusinessPlanResponse } from "@/types/recommendation";

type T = Record<string, string>;

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border p-4">
      <h3 className="flex items-center gap-1.5 font-medium text-sm">
        {icon}
        {title}
      </h3>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function CommodityChips({ items, primary }: { items: BusinessPlanCommodity[]; primary?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((c) => (
        <span
          key={c.code}
          className={`rounded-full px-2.5 py-0.5 text-xs ${
            primary ? "bg-primary/10 font-medium text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {c.name}
        </span>
      ))}
    </div>
  );
}

export function BusinessPlanDisplay() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [data, setData] = useState<BusinessPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    translationsApi
      .getPublic(locale, "fpo_recommendations")
      .then((res) => setT(res.fpo_recommendations ?? {}))
      .catch(() => undefined);
  }, [locale]);

  // Plans are cached per language on the backend, so switching locale
  // loads (or offers to generate) the plan in that language.
  // biome-ignore lint/correctness/useExhaustiveDependencies: refetch intentionally triggered on locale change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setLoadFailed(false);
    getMyBusinessPlan()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      setData(await generateBusinessPlan());
    } catch (err) {
      // Backend messages are already translated (no commodity / service
      // unavailable / generation failed).
      setError(
        (err as { message?: string })?.message ??
          t.bp_error_generic ??
          "Could not generate the business plan. Please try again.",
      );
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border bg-muted/30">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const profile = data?.profile;
  const plan = data?.plan;
  const content = plan?.content;
  const hasPrimary = !!profile?.primary_commodities.length;
  const location = profile
    ? [profile.village_town, profile.block_display, profile.district_display, profile.pincode]
        .filter(Boolean)
        .join(", ")
    : "";
  const generatedOn = plan?.generated_at
    ? new Date(plan.generated_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 font-medium text-sm">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            {t.bp_title ?? "AI Business Plan"}
          </h2>
          <p className="text-muted-foreground text-xs">
            {t.bp_description ?? "A short business plan based on your FPO's commodities and location."}
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || !hasPrimary}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {plan ? (t.bp_btn_regenerate ?? "Regenerate plan") : (t.bp_btn_generate ?? "Generate business plan")}
        </button>
      </div>

      {profile && (
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            {t.bp_based_on ?? "Based on"}
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <p className="text-muted-foreground text-xs">{t.bp_primary_commodities ?? "Primary commodities"}</p>
              {hasPrimary ? (
                <CommodityChips items={profile.primary_commodities} primary />
              ) : (
                <p className="text-xs">—</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-muted-foreground text-xs">{t.bp_secondary_commodities ?? "Secondary commodities"}</p>
              {profile.secondary_commodities.length ? (
                <CommodityChips items={profile.secondary_commodities} />
              ) : (
                <p className="text-xs">—</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-muted-foreground text-xs">{t.bp_location ?? "Location"}</p>
              <p className="flex items-start gap-1 text-xs">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                <span>{location || "—"}</span>
              </p>
            </div>
          </div>
          {!hasPrimary && (
            <p className="text-amber-700 text-xs dark:text-amber-400">
              {t.bp_no_commodity ??
                "Add at least one primary commodity to your FPO profile to generate a business plan."}
            </p>
          )}
        </div>
      )}

      {data?.is_outdated && !generating && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-900 text-xs dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {t.bp_outdated ??
              "Your FPO's commodities or location have changed since this plan was generated. Regenerate to update it."}
          </p>
        </div>
      )}

      {loadFailed && (
        <p className="text-destructive text-xs">{t.bp_error_load ?? "Could not load your business plan."}</p>
      )}
      {error && <p className="text-destructive text-xs">{error}</p>}

      {generating && (
        <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border bg-muted/30 text-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground text-sm">{t.bp_generating ?? "Preparing your business plan…"}</p>
          <p className="text-muted-foreground text-xs">{t.bp_generating_hint ?? "This can take up to a minute."}</p>
        </div>
      )}

      {!plan && !generating && !error && hasPrimary && (
        <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border bg-muted/30 text-center">
          <p className="text-muted-foreground text-sm">{t.bp_empty_title ?? "No business plan yet."}</p>
          <p className="text-muted-foreground text-xs">
            {t.bp_empty_description ?? 'Click "Generate business plan" to create one with AI.'}
          </p>
        </div>
      )}

      {content && !generating && (
        <div className="flex flex-col gap-4">
          <div>
            {content.title && <h3 className="font-semibold text-base">{content.title}</h3>}
            <p className="text-muted-foreground text-xs">
              {generatedOn && (t.bp_generated_on ?? "Generated on {date}").replace("{date}", generatedOn)}
              {plan?.financial_year &&
                ` · ${(t.for_financial_year ?? "For financial year {fy}").replace("{fy}", plan.financial_year)}`}
            </p>
          </div>

          <Section
            icon={<Sparkles className="h-4 w-4 text-muted-foreground" />}
            title={t.bp_executive_summary ?? "Executive Summary"}
          >
            <p>{content.executive_summary}</p>
          </Section>

          {content.commodity_focus.length > 0 && (
            <Section
              icon={<Sprout className="h-4 w-4 text-muted-foreground" />}
              title={t.bp_commodity_focus ?? "Commodity Focus"}
            >
              <div className="flex flex-col gap-2">
                {content.commodity_focus.map((c) => (
                  <div key={`${c.role}-${c.commodity}`}>
                    <p className="font-medium">
                      {c.commodity}{" "}
                      <span className="font-normal text-muted-foreground text-xs">
                        (
                        {c.role === "primary" ? (t.bp_role_primary ?? "Primary") : (t.bp_role_secondary ?? "Secondary")}
                        )
                      </span>
                    </p>
                    <p className="text-muted-foreground">{c.opportunity}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {content.location_advantages && (
            <Section
              icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
              title={t.bp_location_advantages ?? "Location Advantages"}
            >
              <p>{content.location_advantages}</p>
            </Section>
          )}

          {content.business_activities.length > 0 && (
            <Section
              icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
              title={t.bp_business_activities ?? "Business Activities"}
            >
              <div className="grid gap-3 md:grid-cols-2">
                {content.business_activities.map((a) => (
                  <div key={a.name} className="rounded-md bg-muted/30 p-3">
                    <p className="font-medium">{a.name}</p>
                    <p className="text-muted-foreground">{a.description}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section
            icon={<Megaphone className="h-4 w-4 text-muted-foreground" />}
            title={t.bp_market_strategy ?? "Market Strategy"}
          >
            <div className="grid gap-3 md:grid-cols-2">
              {!!content.market_strategy.target_markets?.length && (
                <div>
                  <p className="mb-1 font-medium text-xs">{t.bp_target_markets ?? "Target markets"}</p>
                  <BulletList items={content.market_strategy.target_markets} />
                </div>
              )}
              {!!content.market_strategy.channels?.length && (
                <div>
                  <p className="mb-1 font-medium text-xs">{t.bp_channels ?? "Sales channels"}</p>
                  <BulletList items={content.market_strategy.channels} />
                </div>
              )}
            </div>
            {content.market_strategy.branding && (
              <p className="mt-2">
                <span className="font-medium text-xs">{t.bp_branding ?? "Branding"}: </span>
                {content.market_strategy.branding}
              </p>
            )}
          </Section>

          {content.operations_plan && (
            <Section
              icon={<Settings2 className="h-4 w-4 text-muted-foreground" />}
              title={t.bp_operations_plan ?? "Operations Plan"}
            >
              <p>{content.operations_plan}</p>
            </Section>
          )}

          <Section
            icon={<IndianRupee className="h-4 w-4 text-muted-foreground" />}
            title={t.bp_financial_outline ?? "Financial Outline"}
          >
            <div className="grid gap-3 md:grid-cols-2">
              {content.financial_outline.estimated_investment && (
                <div className="rounded-md bg-muted/30 p-3">
                  <p className="text-muted-foreground text-xs">{t.bp_estimated_investment ?? "Estimated investment"}</p>
                  <p className="font-medium">{content.financial_outline.estimated_investment}</p>
                </div>
              )}
              {content.financial_outline.working_capital && (
                <div className="rounded-md bg-muted/30 p-3">
                  <p className="text-muted-foreground text-xs">{t.bp_working_capital ?? "Working capital"}</p>
                  <p className="font-medium">{content.financial_outline.working_capital}</p>
                </div>
              )}
              {!!content.financial_outline.revenue_streams?.length && (
                <div>
                  <p className="mb-1 font-medium text-xs">{t.bp_revenue_streams ?? "Revenue streams"}</p>
                  <BulletList items={content.financial_outline.revenue_streams} />
                </div>
              )}
              {!!content.financial_outline.funding_sources?.length && (
                <div>
                  <p className="mb-1 font-medium text-xs">{t.bp_funding_sources ?? "Funding sources & schemes"}</p>
                  <BulletList items={content.financial_outline.funding_sources} />
                </div>
              )}
            </div>
          </Section>

          {content.risks.length > 0 && (
            <Section
              icon={<ShieldAlert className="h-4 w-4 text-muted-foreground" />}
              title={t.bp_risks ?? "Risks & Mitigation"}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs">
                      <th className="py-1.5 pr-3 font-medium">{t.bp_risk ?? "Risk"}</th>
                      <th className="py-1.5 font-medium">{t.bp_mitigation ?? "Mitigation"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.risks.map((r) => (
                      <tr key={r.risk} className="border-b align-top last:border-0">
                        <td className="py-2 pr-3 font-medium">{r.risk}</td>
                        <td className="py-2 text-muted-foreground">{r.mitigation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {content.action_plan.length > 0 && (
            <Section
              icon={<CalendarClock className="h-4 w-4 text-muted-foreground" />}
              title={t.bp_action_plan ?? "Action Plan"}
            >
              <ol className="flex flex-col gap-3 border-l pl-4">
                {content.action_plan.map((step) => (
                  <li key={step.period} className="relative">
                    <span className="-left-[21px] absolute top-1.5 h-2 w-2 rounded-full bg-primary" />
                    <p className="font-medium">{step.period}</p>
                    <BulletList items={step.activities} />
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {content.key_recommendations.length > 0 && (
            <Section
              icon={<Lightbulb className="h-4 w-4 text-muted-foreground" />}
              title={t.bp_key_recommendations ?? "Key Recommendations"}
            >
              <BulletList items={content.key_recommendations} />
            </Section>
          )}

          <p className="text-muted-foreground text-xs">
            {t.bp_disclaimer ??
              "AI-generated guidance — figures are indicative. Validate with your board, KAU experts and a detailed project report before investing."}
          </p>
        </div>
      )}
    </div>
  );
}
