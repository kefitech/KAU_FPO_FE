"use client";

/**
 * Admin — DPR AI Content Health card (KAU 2026-09-19 P2.5).
 *
 * Compact per-chapter roll-up of the placeholder-scrubber (P1.5) and
 * consistency-check (P2.3) results so a KAU admin can eyeball which
 * chapters need review WITHOUT scrolling through 11 chapters of
 * narrative on the AI Content page.
 *
 * One row per chapter. Left cell: chapter name + coloured dot. Middle
 * cells: hit counts. Right cell: chevron to expand the details inline
 * (raw placeholder tokens + consistency warnings with excerpt).
 *
 * Backend contract: DPRProjectDetail.ai_content_health, populated by
 * apps.accounts.api.admin.dpr.project_detail.DPRProjectAdminDetailView.
 */

import { useState } from "react";

import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Circle, Sparkles } from "lucide-react";

import type { AIContentHealthRow } from "@/app/admin/_api/dpr-projects";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";


function DotIcon({ row }: { row: AIContentHealthRow }) {
  // Priority: placeholder needs_review (red) > consistency warnings (amber)
  //         > has content (green) > empty (grey).
  if (!row.has_content) return <Circle className="h-3 w-3 text-muted-foreground/40" aria-label="No content" />;
  if (row.needs_review) return <AlertTriangle className="h-3 w-3 text-rose-500" aria-label="Review required" />;
  if (row.consistency_warnings_count > 0)
    return <AlertTriangle className="h-3 w-3 text-amber-500" aria-label="Consistency warnings" />;
  return <CheckCircle2 className="h-3 w-3 text-emerald-500" aria-label="Clean" />;
}


function ChapterRow({ row }: { row: AIContentHealthRow }) {
  const [open, setOpen] = useState(false);
  const hasNarrative = !!(row.active_text && row.active_text.trim().length > 0);
  const hasCandidate = !!(row.candidate_text && row.candidate_text.trim().length > 0);
  const hasDetail =
    row.placeholder_hits_count > 0
    || row.consistency_warnings_count > 0
    || hasNarrative
    || hasCandidate;

  return (
    <div className="min-w-0 overflow-hidden rounded-md border">
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-3 px-3 py-2 text-left text-sm",
          hasDetail ? "hover:bg-muted/40" : "cursor-default",
        )}
        onClick={() => hasDetail && setOpen((v) => !v)}
        disabled={!hasDetail}
        aria-expanded={hasDetail ? open : undefined}
      >
        <DotIcon row={row} />
        <span className="flex-1 font-medium">{row.chapter_display}</span>
        {row.placeholder_hits_count > 0 && (
          <span
            className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
            title="Placeholder-scrubber replaced this many tokens"
          >
            {row.placeholder_hits_count} placeholder{row.placeholder_hits_count === 1 ? "" : "s"}
          </span>
        )}
        {row.consistency_warnings_count > 0 && (
          <span
            className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
            title="Numbers in this chapter don't agree with the calc engine"
          >
            {row.consistency_warnings_count} consistency
          </span>
        )}
        {!row.has_content && (
          <span className="text-[10px] text-muted-foreground">no draft</span>
        )}
        {hasDetail && (
          open
            ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && hasDetail && (
        <div className="space-y-3 border-t bg-muted/20 px-3 py-2 text-xs">
          {hasNarrative && (
            <div>
              <p className="mb-1 flex items-center gap-2 font-semibold text-foreground">
                <span>Generated content</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                  {row.active_version === "user_edited" ? "user-edited" : "AI original"}
                </span>
              </p>
              <div className="whitespace-pre-wrap break-words rounded border bg-background px-3 py-2 text-[12px] leading-relaxed">
                {row.active_text}
              </div>
            </div>
          )}
          {hasCandidate && (
            <div>
              <p className="mb-1 flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-200">
                <span>Pending regeneration</span>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-normal text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                  awaiting FPO decision
                </span>
              </p>
              <div className="whitespace-pre-wrap break-words rounded border border-amber-300/60 bg-amber-50/40 px-3 py-2 text-[12px] leading-relaxed dark:border-amber-900/40 dark:bg-amber-950/20">
                {row.candidate_text}
              </div>
            </div>
          )}
          {row.placeholder_hits.length > 0 && (
            <div>
              <p className="mb-1 font-semibold text-rose-800 dark:text-rose-200">
                Placeholder tokens auto-replaced
              </p>
              <ul className="ml-4 list-disc space-y-0.5">
                {row.placeholder_hits.map((h, i) => (
                  <li key={i}>
                    <code className="rounded bg-rose-100 px-1 dark:bg-rose-950/60">{h.raw}</code>
                    {h.count > 1 && <span className="ml-1 text-rose-700/80">× {h.count}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {row.consistency_warnings.length > 0 && (
            <div>
              <p className="mb-1 font-semibold text-amber-800 dark:text-amber-200">
                Numbers that don't match the calc engine
              </p>
              <ul className="ml-4 list-disc space-y-1.5">
                {row.consistency_warnings.map((w, i) => (
                  <li key={i}>
                    <span className="font-medium">{w.metric}</span>{" "}
                    <span
                      className={cn(
                        "rounded px-1 text-[10px] font-semibold",
                        w.kind === "mismatch"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
                      )}
                    >
                      {w.kind}
                    </span>
                    <span className="ml-1 text-muted-foreground">
                      — expected {w.expected}, found {w.found}
                    </span>
                    <div className="mt-0.5 text-muted-foreground/80 italic">
                      "{w.excerpt}"
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


export function AIContentHealthCard({ rows }: { rows: AIContentHealthRow[] }) {
  if (!rows || rows.length === 0) return null;

  const anyContent = rows.some((r) => r.has_content);
  const flagged = rows.filter((r) => r.needs_review || r.consistency_warnings_count > 0);
  const allClean = anyContent && flagged.length === 0;

  // Auto-expand when there's something to review — clean projects start
  // collapsed so the card doesn't eat vertical space above the section
  // data the admin actually came to see.
  const [expanded, setExpanded] = useState(!allClean && flagged.length > 0);

  return (
    <Card>
      <CardContent className="p-3">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">AI Content Health</h3>
            <span className="text-[11px] text-muted-foreground">
              {anyContent ? (
                flagged.length === 0 ? (
                  <span className="text-emerald-600">All {rows.length} chapters clean</span>
                ) : (
                  <span className="text-amber-600">
                    {flagged.length} of {rows.length} chapters flagged
                  </span>
                )
              ) : (
                <span>No AI content generated yet</span>
              )}
            </span>
          </div>
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
        {expanded && (
          <div className="mt-3 space-y-1.5">
            {rows.map((r) => (
              <ChapterRow key={r.chapter} row={r} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
