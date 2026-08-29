"use client";

/**
 * Placeholder — DPR Financial Assumptions.
 * The calc engine (P&L, IRR, DSCR, break-even, sensitivity) is Phase 4 work,
 * blocked on KAU RCD items A.3, B.4, B.6, B.9. Full CRUD lands then.
 *
 * Author: Athul Gopan kefi tech solutions
 */

import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ASSUMPTION_GROUPS = [
  {
    title: "Escalation rates",
    items: ["Inflation rate (%)", "Raw material price escalation (%)", "Selling price escalation (%)", "Salary escalation (%)"],
  },
  {
    title: "Financial defaults",
    items: ["Bank interest rate (%)", "Working capital interest rate (%)", "Corporate tax rate (%)", "Depreciation defaults (SLM / WDV)"],
  },
  {
    title: "Discounting",
    items: ["Discount rate for NPV (%)", "Project life (years)", "Moratorium period (months)"],
  },
];

export default function AdminDprConfigPage() {
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
          <SlidersHorizontal className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">DPR Financial Assumptions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure inflation, escalation, interest, and depreciation defaults that drive the DPR calculation engine.
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
              Blocked on KAU clarifications A.3, B.4, B.6, B.9.
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            The financial calculation engine (P&amp;L, Balance Sheet, IRR, NPV, DSCR, break-even,
            sensitivity analysis) requires KAU to confirm which formulas and default values to use.
            Once those answers arrive, this page will let super-admins configure the assumption values below.
          </p>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Planned assumption groups</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {ASSUMPTION_GROUPS.map((g) => (
            <Card key={g.title}>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold">{g.title}</h3>
                <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  {g.items.map((i) => (
                    <li key={i}>• {i}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
