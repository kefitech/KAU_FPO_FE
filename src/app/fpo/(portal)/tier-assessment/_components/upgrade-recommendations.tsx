"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles, Target, TrendingUp } from "lucide-react";

import { tierAssessmentApi } from "@/app/fpo/_api/tier-assessment";

type T = Record<string, string>;

export function UpgradeRecommendations({ assessmentId, t }: { assessmentId: number; t: T }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["fpo-tier-recommendations", assessmentId],
    queryFn: () => tierAssessmentApi.recommendations(assessmentId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-11/12 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }
  if (isError || !data || data.recommendations.length === 0) return null;

  const heading = data.current_tier === data.next_tier
    ? (t.reco_maintain_heading ?? "Keep your Tier {tier} — recommended focus areas").replace("{tier}", data.current_tier)
    : (t.reco_upgrade_heading ?? "How to reach Tier {tier}").replace("{tier}", data.next_tier);

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b bg-primary/5 px-5 py-3.5">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-sm">{heading}</h2>
      </div>
      <ol className="divide-y">
        {data.recommendations.map((r, idx) => (
          <li key={`${r.question_no ?? "c"}-${idx}`} className="flex items-start gap-3 px-5 py-3.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-xs">
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-relaxed">{r.tip}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
                {r.question_no !== null && (
                  <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono">
                    Q{r.question_no}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {(t.reco_target_tier ?? "Tier {tier}").replace("{tier}", r.target_tier)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {(t.reco_priority ?? "Priority {n}").replace("{n}", String(r.priority))}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className="border-t bg-muted/30 px-5 py-2 text-muted-foreground text-xs">
        {t.reco_footer ?? "Suggested by KAU based on your assessment answers. Contact your CBBO officer for support."}
      </div>
    </div>
  );
}
