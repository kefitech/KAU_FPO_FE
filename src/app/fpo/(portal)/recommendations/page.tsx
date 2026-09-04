"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import { CropRecommendationDisplay } from "./_components/crop-recommendation-display";

type T = Record<string, string>;

const CultivationAreaMap = dynamic(
  () => import("./_components/cultivation-area-map").then((m) => ({ default: m.CultivationAreaMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 items-center justify-center rounded-lg border bg-muted/30">
        <p className="text-muted-foreground text-sm">Loading map…</p>
      </div>
    ),
  },
);

type TabKey = "crop" | "business-plan" | "dpr";

export default function FpoRecommendationsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("crop");
  const locale = useLocaleStore((s) => s.locale);

  const [t, setT] = useState<T>({});
  const [translationsLoading, setTranslationsLoading] = useState(true);

  useEffect(() => {
    setTranslationsLoading(true);
    translationsApi
      .getPublic(locale, "fpo_recommendations")
      .then((data) => setT(data.fpo_recommendations ?? {}))
      .catch(() => undefined)
      .finally(() => setTranslationsLoading(false));
  }, [locale]);

  const TABS: { key: TabKey; label: string }[] = [
    { key: "crop", label: t.tab_crop_recommendation ?? "Crop Recommendation" },
    { key: "business-plan", label: t.tab_business_plan ?? "Business Plan Guidance" },
    { key: "dpr", label: t.tab_dpr_generation ?? "DPR Generation" },
  ];

  if (translationsLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="h-7 w-56 animate-pulse rounded bg-muted" />
        <div className="h-72 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-semibold text-2xl">{t.page_title ?? "AI Recommendations"}</h1>
        <p className="text-muted-foreground text-sm">
          {t.page_description ?? "Get AI-powered crop recommendations, business plan guidance, and DPR generation."}
        </p>
      </div>

      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`border-b-2 px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "crop" && (
        <div className="flex flex-col gap-4 rounded-lg border p-4">
          <div>
            <h2 className="font-medium text-sm">{t.farm_boundary_heading ?? "Your Farm Boundary"}</h2>
            <p className="text-muted-foreground text-xs">
              {t.farm_boundary_description ??
                "Mark your cultivation area on the map — this helps us tailor crop recommendations to your farm."}
            </p>
          </div>
          <CultivationAreaMap />
        </div>
      )}

      {activeTab === "crop" && (
        <div className="rounded-lg border p-4">
          <CropRecommendationDisplay />
        </div>
      )}

      {activeTab === "business-plan" && (
        <div className="flex h-40 items-center justify-center rounded-lg border bg-muted/30">
          <p className="text-muted-foreground text-sm">{t.business_plan_coming_soon ?? "Business Plan Guidance — coming soon."}</p>
        </div>
      )}

      {activeTab === "dpr" && (
        <div className="flex h-40 items-center justify-center rounded-lg border bg-muted/30">
          <p className="text-muted-foreground text-sm">{t.dpr_coming_soon ?? "DPR Generation — coming soon."}</p>
        </div>
      )}
    </div>
  );
}