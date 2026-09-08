"use client";

/**
 * DPR Risk Matrix — KAU Central Admin editor for the probability × impact grid.
 *
 * Per KAU RCD reply B.9 (2026-09-02). Admin picks a `risk_class` (Low /
 * Moderate / High) for each (probability, impact) cell. Backend caches the
 * matrix; each PATCH invalidates the cache so the next DPR calculation
 * reads fresh values without a server restart.
 *
 * Layout: proper matrix table — probability rows × impact columns.
 * Each cell is a coloured dropdown showing its current class.
 *
 * Author: Athul Gopan Kefi Tech Solutions
 */

import { useMemo } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Grid3x3, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import {
  dprRiskMatrixApi,
  type DPRRiskMatrixCell,
  type RiskClass,
  type RiskLevel,
} from "@/app/admin/_api/dpr-risk-matrix";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Ordering + labels — kept in sync with backend LEVEL_CHOICES.
const LEVELS: Array<{ value: RiskLevel; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const CLASS_OPTIONS: Array<{ value: RiskClass; label: string; tone: string }> = [
  { value: "low", label: "Low", tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  { value: "moderate", label: "Moderate", tone: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  { value: "high", label: "High", tone: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
];

function toneFor(cls: RiskClass): string {
  return CLASS_OPTIONS.find((o) => o.value === cls)?.tone ?? "";
}

export default function AdminDprRiskMatrixPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-dpr-risk-matrix"],
    queryFn: () => dprRiskMatrixApi.list(),
  });

  // Index cells by (probability, impact) for O(1) grid lookup
  const cellIndex = useMemo(() => {
    const map = new Map<string, DPRRiskMatrixCell>();
    (data?.cells ?? []).forEach((c) => {
      map.set(`${c.probability}::${c.impact}`, c);
    });
    return map;
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: ({ id, risk_class }: { id: number; risk_class: RiskClass }) =>
      dprRiskMatrixApi.update(id, { risk_class }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["admin-dpr-risk-matrix"] });
      toast.success(
        `${updated.probability} × ${updated.impact} → ${updated.risk_class}`,
      );
    },
    onError: () => toast.error("Failed to update matrix cell."),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/dpr">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to DPR
          </Link>
        </Button>
      </div>

      <div className="flex items-start gap-4">
        <div className="rounded-md bg-muted p-3">
          <Grid3x3 className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">DPR Risk Matrix</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Probability × Impact grid used to classify each risk on a DPR project as Low,
            Moderate, or High. Every change is recorded in the audit log and the calc
            engine picks up the new value on its next call.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            <strong>Overall rule (KAU RCD B.9):</strong>{" "}
            Any category classed High → project rating <strong>High</strong>.
            Else any Moderate → <strong>Moderate</strong>. Else all Low → <strong>Low</strong>.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading matrix…
        </div>
      )}

      {isError && (
        <Card>
          <CardContent className="p-5 text-sm text-destructive">
            Failed to load risk matrix. Please refresh.
          </CardContent>
        </Card>
      )}

      {data && (
        <Card>
          <CardContent className="p-5">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-r bg-muted/40 p-3 text-left text-xs uppercase text-muted-foreground">
                      Probability ↓ / Impact →
                    </th>
                    {LEVELS.map((impact) => (
                      <th
                        key={impact.value}
                        className="border-b bg-muted/40 p-3 text-center text-xs font-semibold uppercase text-muted-foreground"
                      >
                        {impact.label} impact
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {LEVELS.map((probability) => (
                    <tr key={probability.value}>
                      <td className="border-r bg-muted/20 p-3 text-xs font-semibold uppercase text-muted-foreground">
                        {probability.label} probability
                      </td>
                      {LEVELS.map((impact) => {
                        const cell = cellIndex.get(`${probability.value}::${impact.value}`);
                        if (!cell) {
                          return (
                            <td
                              key={impact.value}
                              className="border-b border-r p-3 text-center text-xs text-muted-foreground"
                            >
                              <span className="italic">missing</span>
                            </td>
                          );
                        }
                        const isSaving = updateMutation.isPending && updateMutation.variables?.id === cell.id;
                        return (
                          <td key={impact.value} className={`border-b border-r p-2 text-center ${toneFor(cell.risk_class)}`}>
                            <select
                              value={cell.risk_class}
                              disabled={isSaving}
                              onChange={(e) => updateMutation.mutate({
                                id: cell.id,
                                risk_class: e.target.value as RiskClass,
                              })}
                              className="w-full cursor-pointer rounded border-none bg-transparent px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              {CLASS_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                            {isSaving && (
                              <Loader2 className="mx-auto mt-1 h-3 w-3 animate-spin" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-emerald-200"></span> Low
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-amber-200"></span> Moderate
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-red-200"></span> High
              </span>
              <span className="ml-auto">
                {data.count} cells configured
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
