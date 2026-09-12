"use client";

import { Bot, BookOpen, Database, FileBarChart, Grid3x3, ShieldAlert, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";

/**
 * DPR admin hub — landing page for KAU staff. Central tile-based index of
 * every DPR admin surface. Each tile links to a live sub-page.
 */

const CARDS = [
  {
    href: "/admin/dpr/projects",
    icon: FileBarChart,
    title: "DPR Projects",
    subtitle: "Read-only oversight of every DPR project across all FPOs — filter by status, district, FPO. Drill down into calc results, tranches, AI content, generated PDFs.",
    status: "ready" as const,
  },
  {
    href: "/admin/dpr/master-data",
    icon: Database,
    title: "Master Data",
    subtitle: "Manage the 34 dropdown lists used across DPR sections (fuel types, components, commodities, land ownership, etc.). Edits take effect immediately.",
    status: "ready" as const,
  },
  {
    href: "/admin/dpr-config",
    icon: SlidersHorizontal,
    title: "Financial Assumptions",
    subtitle: "16 admin-editable calc-engine parameters — projection years, discount rate, inflation, tax rate, loan/depreciation defaults, retention count, moratorium treatment.",
    status: "ready" as const,
  },
  {
    href: "/admin/dpr-knowledge",
    icon: BookOpen,
    title: "Knowledge Base",
    subtitle: "KAU-curated content library that grounds AI-generated DPR narratives — schemes, KAU PoP, statutory rules, market intelligence. Every AI paragraph traces back to entries here.",
    status: "ready" as const,
  },
  {
    href: "/admin/dpr-applicability",
    icon: Grid3x3,
    title: "Applicability Matrix",
    subtitle: "40 components × 22 sections grid — Mandatory / Optional / Hidden per (component, section). Controls which DPR sections appear for each FPO based on their project components.",
    status: "ready" as const,
  },
  {
    href: "/admin/dpr-risk-matrix",
    icon: ShieldAlert,
    title: "Risk Matrix",
    subtitle: "5×5 probability × impact heat-map. Defines the mapping from (probability, impact) to Low / Moderate / High risk class for every risk in every FPO's DPR.",
    status: "ready" as const,
  },
  {
    href: "/admin/ai-services",
    icon: Bot,
    title: "AI Services",
    subtitle: "Per-feature on/off toggles + LLM provider + model + monthly ₹ budget caps for the 5 AI-authored DPR chapters. Auto-disable when cap hit.",
    status: "ready" as const,
  },
];

export default function AdminDprHubPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold">DPR Administration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage master data lists that appear as dropdowns in the FPO DPR wizard,
          oversee project submissions, and configure calculation + AI services.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href}>
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="rounded-md bg-muted p-2.5">
                  <c.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{c.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{c.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
