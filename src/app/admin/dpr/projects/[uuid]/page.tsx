"use client";

/**
 * Admin — DPR Project Detail (read-only oversight).
 *
 * Layout mirrors the FPO wizard shell so admins get the same mental model
 * as the FPO users they're overseeing:
 *   - Header bar with project title + FPO summary + status badge
 *   - Grouped sidebar (Project Identification / Project Definition /
 *     Project Execution) with per-section status dots
 *   - Wide right pane rendering the selected section's data + readiness
 *
 * Read-only. No dirty tracking, no save, no PDF download (admin has a
 * separate admin-scoped download endpoint if needed later).
 *
 * Author: Athul Gopan (Kefi Tech Solutions)
 */

import { use, useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import {
  adminDprProjectsApi,
  DPR_STATUS_COLORS,
  DPR_STATUS_LABELS,
} from "@/app/admin/_api/dpr-projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DPR_SECTIONS, type DprSectionInfo } from "@/lib/api/dpr";
import { cn } from "@/lib/utils";

import { SectionViewer } from "./_components/section-viewer";

type ReadinessState = "empty" | "errors" | "warnings" | "complete";

function statusIcon(state: ReadinessState) {
  if (state === "errors") return { Icon: XCircle, tone: "text-destructive" };
  if (state === "warnings") return { Icon: AlertTriangle, tone: "text-amber-500" };
  if (state === "complete") return { Icon: CheckCircle2, tone: "text-emerald-500" };
  return { Icon: Circle, tone: "text-muted-foreground/40" };
}

export default function AdminDprProjectDetailPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = use(params);
  const [activeKey, setActiveKey] = useState<string>(DPR_SECTIONS[0].key);

  const query = useQuery({
    queryKey: ["admin-dpr-project-detail", uuid],
    queryFn: () => adminDprProjectsApi.detail(uuid),
    staleTime: 30_000,
  });

  const activeSection = query.data?.sections?.[activeKey];
  const activeInfo = useMemo(
    () => DPR_SECTIONS.find((s) => s.key === activeKey),
    [activeKey],
  );

  // Group sections by KAU stream — same grouping as the FPO wizard sidebar.
  const groupedSections = useMemo(() => {
    const groups: Record<string, DprSectionInfo[]> = {};
    for (const section of DPR_SECTIONS) {
      (groups[section.group] ??= []).push(section);
    }
    return groups;
  }, []);

  function readinessOf(key: string): ReadinessState {
    const sec = query.data?.sections?.[key];
    if (!sec || sec.data === null) return "empty";
    const r = sec.readiness;
    if (!r) return "empty";
    if (r.errors.length > 0) return "errors";
    if (r.warnings.length > 0) return "warnings";
    if (r.is_complete) return "complete";
    return "empty";
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header bar — matches FPO wizard style */}
      <header className="flex items-center justify-between gap-3 border-b bg-background px-6 py-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/dpr/projects">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Link>
          </Button>
          {query.data ? (
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold">
                  {query.data.project.title || (
                    <span className="italic text-muted-foreground">Untitled DPR</span>
                  )}
                </h1>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[11px] font-medium",
                    DPR_STATUS_COLORS[query.data.project.status],
                  )}
                >
                  {DPR_STATUS_LABELS[query.data.project.status]}
                </span>
              </div>
              {query.data.fpo && (
                <p className="text-xs text-muted-foreground">
                  {query.data.fpo.name} · {query.data.fpo.district} ·
                  Tier {query.data.fpo.tier ?? "—"}
                  {query.data.fpo.application_id
                    ? ` · ${query.data.fpo.application_id}`
                    : ""}
                </p>
              )}
            </div>
          ) : (
            <Skeleton className="h-8 w-64" />
          )}
        </div>
        {query.data?.fpo && (
          <div className="hidden text-right text-xs text-muted-foreground sm:block">
            <p>{query.data.fpo.office_email || "—"}</p>
            <p>{query.data.fpo.office_phone || "—"}</p>
          </div>
        )}
      </header>

      {query.isError ? (
        <div className="flex-1 p-6">
          <Card>
            <CardContent className="p-6 text-center text-sm text-destructive">
              Failed to load DPR project.
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          {/* Sidebar — grouped by KAU stream, matches FPO wizard */}
          <aside className="w-64 shrink-0 overflow-y-auto border-r bg-background p-4">
            {query.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 21 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              Object.entries(groupedSections).map(([group, sections], groupIdx) => (
                <div key={group} className={groupIdx === 0 ? "mb-6" : "mb-6"}>
                  <div className="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {group}
                  </div>
                  <nav className="space-y-0.5">
                    {sections.map((section) => {
                      const globalIdx = DPR_SECTIONS.findIndex((s) => s.key === section.key);
                      const state = readinessOf(section.key);
                      const { Icon, tone } = statusIcon(state);
                      const active = activeKey === section.key;
                      return (
                        <button
                          key={section.key}
                          type="button"
                          onClick={() => setActiveKey(section.key)}
                          className={cn(
                            "group relative flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                            active
                              ? "bg-primary/10 text-foreground"
                              : "text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {active && (
                            <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
                          )}
                          <Icon className={cn("h-3.5 w-3.5 shrink-0", tone)} />
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                              active
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted-foreground/10 text-muted-foreground group-hover:bg-muted-foreground/20",
                            )}
                          >
                            {globalIdx + 1}
                          </span>
                          <span className="flex-1 truncate">{section.title}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>
              ))
            )}
          </aside>

          {/* Content pane */}
          <main className="flex-1 overflow-y-auto bg-muted/20 px-6 py-6">
            <div className="mx-auto max-w-5xl space-y-4">
              {/* Applicability preview — Phase 6e admin surface for UAT.
                  Shows the rule engine's decision for this project so KAU
                  can validate the seeded rules without logging in as FPO. */}
              <ApplicabilityPreview uuid={uuid} />

              {/* Section header */}
              <div className="flex items-baseline justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{activeInfo?.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {activeInfo?.specRef} · {activeInfo?.group}
                  </p>
                </div>
              </div>

              {/* Readiness summary */}
              {activeSection?.readiness && (
                <div className="space-y-2">
                  {activeSection.readiness.errors.length > 0 && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                      <p className="mb-1 text-xs font-medium text-destructive">
                        {activeSection.readiness.errors.length} error
                        {activeSection.readiness.errors.length === 1 ? "" : "s"} to resolve
                      </p>
                      <ul className="ml-4 list-disc space-y-1 text-xs text-destructive">
                        {activeSection.readiness.errors.map((e, i) => (
                          <li key={i}>
                            <span className="font-mono">{e.field}</span> — {e.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {activeSection.readiness.warnings.length > 0 && (
                    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                      <p className="mb-1 text-xs font-medium text-amber-700 dark:text-amber-500">
                        {activeSection.readiness.warnings.length} suggestion
                        {activeSection.readiness.warnings.length === 1 ? "" : "s"}
                      </p>
                      <ul className="ml-4 list-disc space-y-1 text-xs text-amber-700 dark:text-amber-500">
                        {activeSection.readiness.warnings.map((w, i) => (
                          <li key={i}>
                            <span className="font-mono">{w.field}</span> — {w.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {activeSection.readiness.is_complete
                    && activeSection.readiness.errors.length === 0
                    && activeSection.readiness.warnings.length === 0 && (
                      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-500">
                        ✓ Section complete — no errors, no suggestions.
                      </div>
                    )}
                </div>
              )}

              {/* Section data */}
              <Card>
                <CardContent className="p-5">
                  <SectionViewer data={activeSection?.data ?? null} />
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}

// ── Applicability preview card — Phase 6e ──────────────────────────────────
// Shows the rule engine's per-section decision for this project + explains
// why any section is Mandatory or Hidden (which component + rule triggered
// it). Collapsed by default to keep the admin view clean; expand to inspect.

function ApplicabilityPreview({ uuid }: { uuid: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dpr-applicability-preview", uuid],
    // Reuses the same query key namespace as the main detail so a components
    // edit invalidates both together via `admin-dpr-project-detail`.
    queryFn: () => adminDprProjectsApi.applicability(uuid),
    staleTime: 30_000,
  });

  if (isLoading || !data) return null;

  const hiddenCount = Object.values(data.applicability).filter((v) => v === "H").length;
  const mandatoryCount = data.mandatory_sections.length;
  const optionalCount =
    Object.keys(data.applicability).length - hiddenCount - mandatoryCount;

  // Section keys grouped by decision, using triggering_rules for the "why".
  const hiddenSections = Object.entries(data.applicability)
    .filter(([, v]) => v === "H")
    .map(([k]) => k);
  const mandatorySections = data.mandatory_sections;

  return (
    <details className="rounded-md border bg-background">
      <summary className="cursor-pointer list-none px-4 py-2.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Rule Engine</span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                data.engine_enabled
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {data.engine_enabled ? "Active" : "Off (rollback state)"}
            </span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>
              <strong className="text-red-700 dark:text-red-400">{mandatoryCount}</strong>{" "}
              mandatory
            </span>
            <span>
              <strong className="text-blue-700 dark:text-blue-400">{optionalCount}</strong>{" "}
              optional
            </span>
            <span>
              <strong className="text-slate-700 dark:text-slate-300">{hiddenCount}</strong>{" "}
              hidden
            </span>
            <span className="text-[10px]">▾ expand</span>
          </div>
        </div>
      </summary>

      <div className="border-t px-4 py-3 space-y-3 text-xs">
        {/* Selected components — what's driving the decisions */}
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
            Project components ({data.selected_components.length})
          </p>
          {data.selected_components.length === 0 ? (
            <p className="text-muted-foreground italic">
              No components selected — all sections default to Optional.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {data.selected_components.map((c) => (
                <span
                  key={c.id}
                  className="rounded bg-muted px-2 py-0.5 font-mono text-[10px]"
                  title={c.code}
                >
                  {c.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Hidden sections + why */}
        {hiddenSections.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
              Hidden sections ({hiddenSections.length})
            </p>
            <ul className="space-y-1.5">
              {hiddenSections.map((key) => {
                const triggers = (data.triggering_rules[key] ?? []).filter(
                  (r) => r.applicability === "H",
                );
                return (
                  <li key={key} className="flex items-start gap-2">
                    <code className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {key}
                    </code>
                    <span className="text-muted-foreground">
                      {triggers.length === 0
                        ? "(no explicit rules)"
                        : triggers.map((r, i) => (
                            <span key={i} className="mr-2">
                              {r.component_label}
                              {r.notes && ` — ${r.notes}`}
                            </span>
                          ))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Mandatory sections + why */}
        {mandatorySections.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
              Mandatory sections ({mandatorySections.length})
            </p>
            <ul className="space-y-1.5">
              {mandatorySections.map((key) => {
                const triggers = (data.triggering_rules[key] ?? []).filter(
                  (r) => r.applicability === "M",
                );
                return (
                  <li key={key} className="flex items-start gap-2">
                    <code className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                      {key}
                    </code>
                    <span className="text-muted-foreground">
                      {triggers.length === 0
                        ? "(no explicit rules)"
                        : triggers
                            .map((r) => r.component_label)
                            .join(", ")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {!data.engine_enabled && (
          <p className="rounded-md border border-dashed bg-muted/40 p-2 text-[10px] text-muted-foreground">
            Rule engine feature flag is <strong>off</strong>. FPOs see every section
            regardless of these rules (rollback state). Toggle{" "}
            <code>rule_engine_enabled</code> in{" "}
            <a href="/admin/dpr-config" className="underline">DPR Config</a> to activate.
          </p>
        )}
      </div>
    </details>
  );
}
