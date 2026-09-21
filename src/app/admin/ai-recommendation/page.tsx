"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { BookOpen, BrainCircuit, Layers, Map as MapIcon, Sprout } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

/**
 * AI Recommendation admin hub — landing page for everything that feeds or
 * drives the crop-recommendation feature. Same pattern as the DPR admin hub:
 * one sidebar entry, a card per sub-page, and the sub-pages live under this
 * route so the sidebar item stays highlighted while inside them.
 */
const CARDS = [
  {
    slug: "gis-zones",
    icon: MapIcon,
    title: "GIS Zones",
    description: "Agro-climatic zone boundaries used to place each FPO in a zone. Upload a version, preview it on the map, then activate it.",
  },
  {
    slug: "soil-regions",
    icon: Layers,
    title: "Soil Regions",
    description: "Soil region boundaries used to identify the soil type at a farm's location. Upload a version, preview it, then activate it.",
  },
  {
    slug: "ml-models",
    icon: BrainCircuit,
    title: "ML Models",
    description: "Register, train from CSV, activate and delete the crop-recommendation model versions.",
  },
  {
    slug: "crop-package-of-practices",
    icon: BookOpen,
    title: "Crop Package of Practices",
    description: "Cultivation guidance FPOs see when they tap a recommended crop. Only active entries are visible to FPOs.",
  },
  {
    slug: "crop-zone-profiles",
    icon: Sprout,
    title: "Crop Zone Profiles",
    description: "Which crops are eligible per zone, with their documented temperature, pH and season requirements.",
  },
] as const;

export default function AiRecommendationHubPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "admin_ai_recommendation")
      .then((data) => setT(data.admin_ai_recommendation ?? {}))
      .catch(() => undefined);
  }, [locale]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div>
        <h1 className="font-semibold text-2xl">{t.page_title ?? "AI Recommendation"}</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {t.page_description ??
            "Manage the location data, models and crop knowledge that drive crop recommendations for FPOs."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((c) => (
          <Link key={c.slug} href={`/admin/ai-recommendation/${c.slug}`}>
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="rounded-md bg-muted p-2.5">
                  <c.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{t[`card_${c.slug}_title`] ?? c.title}</h3>
                  <p className="mt-1 text-muted-foreground text-xs">{t[`card_${c.slug}_desc`] ?? c.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
