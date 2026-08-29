"use client";

/**
 * Placeholder — AI Services Admin.
 * Per-feature on/off toggles + monthly ₹ budget caps + usage log for the
 * Claude-powered narrative generation. Ships in Phase 4 alongside the AI
 * content pipeline (blocked on KAU items A.2 and B.5).
 *
 * Author: Athul Gopan kefi tech solutions
 */

import { ArrowLeft, Bot } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PLANNED_SERVICES = [
  {
    title: "Executive Summary",
    desc: "Auto-drafts the executive summary from project data (§2.2 + §2.3.x + finance).",
  },
  {
    title: "SWOT Analysis",
    desc: "Generates Strengths / Weaknesses / Opportunities / Threats narrative from Market + Risk sections.",
  },
  {
    title: "Risk Narrative",
    desc: "Turns the identified risk categories into a prose narrative with mitigation plans.",
  },
  {
    title: "Environmental Impact Statement",
    desc: "Renders ESS section data into a compliance-ready narrative.",
  },
];

export default function AdminAiServicesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/dpr">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to DPR
          </Link>
        </Button>
      </div>

      <div className="flex items-start gap-4">
        <div className="rounded-md bg-muted p-3">
          <Bot className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">AI Services</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Per-feature on/off toggles, monthly ₹ budget caps, and usage log for the Claude-powered narrative generation.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
              Coming in Phase 4
            </span>
            <span className="text-xs text-muted-foreground">
              Blocked on KAU clarifications A.2 (AI narrative structure) and B.5 (regeneration behaviour on edits).
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Once KAU confirms which chapters use Claude, the prompt templates, and the desired behaviour
            when a user has manually edited AI-generated content, this page will provide:
          </p>
          <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
            <li>Per-service on/off toggle (super-admin only)</li>
            <li>Monthly ₹ budget cap with auto-disable when the cap is hit</li>
            <li>Alert threshold (e.g. notify at 80% of cap)</li>
            <li>Usage log — tokens, cost USD + INR, success/fail, per FPO</li>
            <li>Summary dashboard — monthly totals per service</li>
          </ul>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Planned services</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {PLANNED_SERVICES.map((s) => (
            <Card key={s.title}>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold">{s.title}</h3>
                <p className="mt-2 text-xs text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
