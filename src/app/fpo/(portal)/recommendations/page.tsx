"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { CropRecommendationDisplay } from "./_components/crop-recommendation-display"

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

const TABS: { key: TabKey; label: string }[] = [
  { key: "crop", label: "Crop Recommendation" },
  { key: "business-plan", label: "Business Plan Guidance" },
  { key: "dpr", label: "DPR Generation" },
];

export default function FpoRecommendationsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("crop");

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-semibold text-2xl">AI Recommendations</h1>
        <p className="text-muted-foreground text-sm">
          Get AI-powered crop recommendations, business plan guidance, and DPR generation.
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
            <h2 className="font-medium text-sm">Your Farm Boundary</h2>
            <p className="text-muted-foreground text-xs">
              Mark your cultivation area on the map — this helps us tailor crop recommendations to your farm.
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
          <p className="text-muted-foreground text-sm">Business Plan Guidance — coming soon.</p>
        </div>
      )}

      {activeTab === "dpr" && (
        <div className="flex h-40 items-center justify-center rounded-lg border bg-muted/30">
          <p className="text-muted-foreground text-sm">DPR Generation — coming soon.</p>
        </div>
      )}
    </div>
  );
}