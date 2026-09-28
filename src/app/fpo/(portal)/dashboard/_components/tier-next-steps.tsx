"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Sparkles } from "lucide-react";

import { tierAssessmentApi } from "@/app/fpo/_api/tier-assessment";

type T = Record<string, string>;

export function TierNextSteps({ t }: { t: T }) {
  // Look up current-year assessment to get its id + submitted state.
  const { data: assessmentData } = useQuery({
    queryKey: ["fpo-tier-assessment"],
    queryFn: tierAssessmentApi.get,
    staleTime: 60_000,
  });

  const assessmentId = assessmentData?.assessment?.id ?? null;
  const isSubmitted  = assessmentData?.assessment?.status === "submitted";

  const { data: reco } = useQuery({
    queryKey: ["fpo-tier-recommendations", assessmentId],
    queryFn: () => tierAssessmentApi.recommendations(assessmentId as number),
    enabled: !!assessmentId && isSubmitted,
    staleTime: 60_000,
  });

  if (!isSubmitted || !reco || reco.recommendations.length === 0) return null;

  const top3   = reco.recommendations.slice(0, 3);
  const heading = reco.current_tier === reco.next_tier
    ? (t.dashboard_reco_maintain_heading ?? "Keep your Tier {tier}").replace("{tier}", reco.current_tier)
    : (t.dashboard_reco_upgrade_heading ?? "Next steps to reach Tier {tier}").replace("{tier}", reco.next_tier);

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b bg-primary/5 px-4 sm:px-5 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <h2 className="font-semibold text-sm truncate">{heading}</h2>
        </div>
        <Link
          href="/fpo/tier-assessment"
          className="inline-flex shrink-0 items-center gap-0.5 font-medium text-primary text-xs hover:underline"
        >
          {t.dashboard_reco_see_all ?? "See all"}
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <ol className="divide-y">
        {top3.map((r, idx) => (
          <li key={`${r.question_no ?? "c"}-${idx}`} className="flex items-start gap-3 px-4 sm:px-5 py-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-[10px]">
              {idx + 1}
            </span>
            <p className="text-sm leading-relaxed line-clamp-2">{r.tip}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
