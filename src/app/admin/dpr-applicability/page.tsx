"use client";

/**
 * DPR Applicability Matrix admin — Phase 6c.
 *
 * Per KAU RCD A.1. Grid editor: rows = 34 project components (grouped by
 * KAU's 6 spec groups), columns = 22 DPR sections. Each cell is M/O/H
 * with "—" for the default (Optional). One click on a cell cycles the
 * value M → O → H → default; save fires optimistically per cell with
 * toast rollback if the backend rejects.
 *
 * Filter bar:
 *   - Section keyword filter (hides columns)
 *   - Component search (hides rows)
 *   - "Only rows with rules" toggle to focus on configured components
 *
 * Author: Athul Gopan (Kefi Tech Solutions)
 */

import { Fragment, useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Grid3x3,
  Info,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import {
  APPLICABILITY_META,
  dprApplicabilityApi,
  type Applicability,
  type ApplicabilityComponent,
  type ApplicabilityMatrix,
  type ApplicabilityRuleValue,
} from "@/app/admin/_api/dpr-applicability";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// Cell cycle order — one click advances to the next state.
// Default (no rule) → M → O → H → back to default.
const CELL_CYCLE: (Applicability | null)[] = [null, "M", "O", "H"];

function nextValue(current: Applicability | null): Applicability | null {
  const idx = CELL_CYCLE.indexOf(current);
  return CELL_CYCLE[(idx + 1) % CELL_CYCLE.length];
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AdminDprApplicabilityPage() {
  const qc = useQueryClient();
  const [componentFilter, setComponentFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [onlyWithRules, setOnlyWithRules] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-dpr-applicability-matrix"],
    queryFn: () => dprApplicabilityApi.matrix(),
  });

  const upsertMutation = useMutation({
    mutationFn: (payload: {
      component_id: number;
      data_element_key: string;
      applicability: Applicability | null;
    }) => dprApplicabilityApi.upsert(payload),
    onSuccess: (envelope) => {
      // Refetch to pick up server-assigned ids for newly-created rules.
      qc.invalidateQueries({ queryKey: ["admin-dpr-applicability-matrix"] });
      toast.success(envelope.message);
    },
    onError: (err) => {
      console.warn("[applicability upsert]", err);
      toast.error("Failed to save cell — reverting.");
      // Refetch also serves as the "revert" since we haven't optimistically
      // patched the cache. Simpler + safer than manual rollback.
      qc.invalidateQueries({ queryKey: ["admin-dpr-applicability-matrix"] });
    },
  });

  // Group components by KAU spec group for the row headers.
  const groupedComponents = useMemo(() => {
    if (!data) return [];
    const groups = new Map<string, { label: string; components: ApplicabilityComponent[] }>();
    for (const c of data.components) {
      if (!groups.has(c.group)) {
        groups.set(c.group, { label: c.group_label, components: [] });
      }
      groups.get(c.group)!.components.push(c);
    }
    return Array.from(groups.entries()).map(([group, v]) => ({ group, ...v }));
  }, [data]);

  // Filter rows + columns based on user filters.
  const filteredSections = useMemo(() => {
    if (!data) return [];
    const q = sectionFilter.trim().toLowerCase();
    if (!q) return data.section_keys;
    return data.section_keys.filter((k) => k.toLowerCase().includes(q));
  }, [data, sectionFilter]);

  const filteredGroups = useMemo(() => {
    const compQ = componentFilter.trim().toLowerCase();
    return groupedComponents
      .map((g) => ({
        ...g,
        components: g.components.filter((c) => {
          if (compQ && !c.label.toLowerCase().includes(compQ) && !c.code.toLowerCase().includes(compQ)) {
            return false;
          }
          if (onlyWithRules && data) {
            const hasRule = data.section_keys.some(
              (s) => data.rules[`${c.id}::${s}`] !== undefined,
            );
            if (!hasRule) return false;
          }
          return true;
        }),
      }))
      .filter((g) => g.components.length > 0);
  }, [groupedComponents, componentFilter, onlyWithRules, data]);

  const totalRuleCount = data ? Object.keys(data.rules).length : 0;

  return (
    <div className="mx-auto max-w-[95vw] space-y-6 px-4 py-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/dashboard">
            <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Grid3x3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-2xl">DPR Applicability Matrix</h1>
            <p className="mt-0.5 max-w-3xl text-sm text-muted-foreground">
              Set which DPR sections apply to each project component (KAU RCD A.1). Click any
              cell to cycle: <strong>—</strong> (Optional, default) → <strong>M</strong>{" "}
              (Mandatory) → <strong>O</strong> (Optional, explicit) → <strong>H</strong>{" "}
              (Hidden) → back to —.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {totalRuleCount} explicit rule{totalRuleCount === 1 ? "" : "s"}
          </Badge>
          <Button size="sm" variant="ghost" onClick={() => refetch()}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-3 text-xs">
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Legend:</span>
          {(["M", "O", "H"] as Applicability[]).map((v) => (
            <span
              key={v}
              className={cn(
                "rounded border px-2 py-0.5 font-mono font-semibold",
                APPLICABILITY_META[v].tone,
              )}
            >
              {APPLICABILITY_META[v].shortLabel} — {APPLICABILITY_META[v].label}
            </span>
          ))}
          <span className="rounded border border-dashed px-2 py-0.5 text-muted-foreground">
            — default (Optional; no explicit rule)
          </span>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-3">
          <div className="min-w-0 space-y-1">
            <Label className="text-xs">Component search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-7"
                placeholder="e.g. cold storage, rice mill"
                value={componentFilter}
                onChange={(e) => setComponentFilter(e.target.value)}
              />
            </div>
          </div>
          <div className="min-w-0 space-y-1">
            <Label className="text-xs">Section filter</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-7"
                placeholder="e.g. finance, utilities"
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
              <Switch checked={onlyWithRules} onCheckedChange={setOnlyWithRules} />
              <span>Show only components with rules</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading matrix…
        </div>
      )}
      {isError && (
        <Card>
          <CardContent className="p-5 text-sm text-destructive">
            Failed to load matrix. Try refresh.
          </CardContent>
        </Card>
      )}

      {data && filteredGroups.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No components match these filters.
          </CardContent>
        </Card>
      )}

      {data && filteredGroups.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 text-xs">
                <thead className="sticky top-0 z-10 bg-background">
                  <tr>
                    <th className="sticky left-0 z-20 min-w-[220px] border-b border-r bg-background px-3 py-2 text-left font-semibold">
                      Component
                    </th>
                    {filteredSections.map((s) => (
                      <th
                        key={s}
                        className="border-b bg-background px-2 py-2 text-center font-mono font-medium text-muted-foreground"
                        title={s}
                      >
                        <span className="block max-w-[70px] truncate">{s}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map((g) => (
                    <Fragment key={g.group}>
                      <tr className="bg-muted/40">
                        <td
                          colSpan={filteredSections.length + 1}
                          className="border-b px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          {g.label}
                        </td>
                      </tr>
                      {g.components.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/20">
                          <td
                            className="sticky left-0 z-10 border-b border-r bg-background px-3 py-2"
                            title={c.code}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{c.label}</p>
                              <p className="truncate text-[10px] text-muted-foreground">
                                <code>{c.code}</code>
                              </p>
                            </div>
                          </td>
                          {filteredSections.map((s) => (
                            <MatrixCell
                              key={s}
                              componentId={c.id}
                              sectionKey={s}
                              rule={data.rules[`${c.id}::${s}`]}
                              pending={upsertMutation.isPending}
                              onCycle={(next) =>
                                upsertMutation.mutate({
                                  component_id: c.id,
                                  data_element_key: s,
                                  applicability: next,
                                })
                              }
                            />
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Cell ────────────────────────────────────────────────────────────────────

function MatrixCell({
  componentId,
  sectionKey,
  rule,
  pending,
  onCycle,
}: {
  componentId: number;
  sectionKey: string;
  rule: ApplicabilityRuleValue | undefined;
  pending: boolean;
  onCycle: (next: Applicability | null) => void;
}) {
  const current = rule?.applicability ?? null;
  const meta = current ? APPLICABILITY_META[current] : APPLICABILITY_META.default;
  const nextV = nextValue(current);

  return (
    <td className="border-b border-r px-1 py-1 text-center">
      <button
        type="button"
        disabled={pending}
        onClick={() => onCycle(nextV)}
        className={cn(
          "min-w-[36px] rounded border px-2 py-0.5 font-mono text-xs font-semibold transition",
          "hover:brightness-95 disabled:opacity-60",
          meta.tone,
        )}
        title={`${componentId} × ${sectionKey} — ${meta.label}${rule?.notes ? ` — ${rule.notes}` : ""} · click to set ${nextV === null ? "default" : nextV}`}
      >
        {meta.shortLabel}
      </button>
    </td>
  );
}
