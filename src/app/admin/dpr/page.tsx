"use client";

import { Bot, Database, FileBarChart, Loader2, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";

/**
 * DPR admin hub — landing page for KAU staff.
 * Links to master data CRUD (built) + placeholders for future admin panels.
 */

const CARDS = [
  {
    href: "/admin/dpr/master-data",
    icon: Database,
    title: "Master Data",
    subtitle: "Manage the 34 dropdown lists used across DPR sections (fuel types, components, etc.). Edits take effect immediately.",
    status: "ready" as const,
  },
  {
    href: "/admin/dpr/projects",
    icon: FileBarChart,
    title: "DPR Projects",
    subtitle: "Read-only oversight of every DPR project across all FPOs — filter by status, district, FPO.",
    status: "ready" as const,
  },
  {
    href: "/admin/dpr-config",
    icon: SlidersHorizontal,
    title: "Financial Assumptions",
    subtitle: "Configure inflation rate, cost escalation, depreciation defaults used by the DPR calculation engine.",
    status: "coming" as const,
  },
  {
    href: "/admin/ai-services",
    icon: Bot,
    title: "AI Services",
    subtitle: "Per-feature on/off toggles + monthly ₹ budget caps for Claude-powered narrative generation.",
    status: "coming" as const,
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
        {CARDS.map((c) => {
          const inner = (
            <Card className={`transition-shadow ${c.status === "ready" ? "cursor-pointer hover:shadow-md" : "opacity-60"}`}>
              <CardContent className="flex items-start gap-4 p-5">
                <div className="rounded-md bg-muted p-2.5">
                  <c.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium">{c.title}</h3>
                    {c.status === "coming" && (
                      <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        <Loader2 className="h-2.5 w-2.5" />
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{c.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          );
          return c.status === "ready" ? (
            <Link key={c.href} href={c.href}>{inner}</Link>
          ) : (
            <div key={c.href}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
