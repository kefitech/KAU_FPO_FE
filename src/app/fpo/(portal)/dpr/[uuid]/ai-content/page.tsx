"use client";

/**
 * FPO — DPR AI Content: regenerate + diff + accept/keep/merge.
 *
 * Per KAU RCD B.5 (2026-09-03). AI-drafted narrative for each of the 11 DPR
 * chapters. The user can:
 *   - Regenerate → produces a candidate; existing active is NEVER overwritten
 *   - Accept    → candidate becomes active
 *   - Keep      → discard candidate, existing active stays
 *   - Merge     → user pastes their reconciled text in a textarea → active
 *   - Edit      → in-place tweaks to the active text
 *
 * The KB citations for the currently-active text are shown at the bottom of
 * each chapter (KAU RCD A.2 traceability).
 *
 * Layout: left rail lists 11 chapters with stale-dot indicator; main pane
 * shows the selected chapter with the diff view when a candidate exists.
 *
 * Author: Athul Gopan (Kefi Tech Solutions)
 */

import { use, useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Edit3,
  GitMerge,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CHAPTER_LABELS,
  CHAPTER_ORDER,
  dprAiContentApi,
  type AIContentRow,
  type ChapterKey,
} from "@/lib/api/dpr-ai-content";

// ── Line-based diff ────────────────────────────────────────────────────────
// Simple LCS-based line diff — enough to visualise added/removed/unchanged
// lines side by side. No external dependency; a proper word-level diff can
// be added later if the mock narrative sees heavy real-world use.

type DiffLine = { text: string; kind: "same" | "added" | "removed" };

function diffLines(oldText: string, newText: string): {
  left: DiffLine[];
  right: DiffLine[];
} {
  const a = oldText.split("\n");
  const b = newText.split("\n");
  const n = a.length;
  const m = b.length;

  // LCS length table — O(n·m) space, fine for narrative-sized text.
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const left: DiffLine[] = [];
  const right: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      left.push({ text: a[i], kind: "same" });
      right.push({ text: b[j], kind: "same" });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      left.push({ text: a[i], kind: "removed" });
      right.push({ text: "", kind: "same" });
      i++;
    } else {
      left.push({ text: "", kind: "same" });
      right.push({ text: b[j], kind: "added" });
      j++;
    }
  }
  while (i < n) {
    left.push({ text: a[i++], kind: "removed" });
    right.push({ text: "", kind: "same" });
  }
  while (j < m) {
    left.push({ text: "", kind: "same" });
    right.push({ text: b[j++], kind: "added" });
  }
  return { left, right };
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function DprAiContentPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = use(params);
  const qc = useQueryClient();

  const { data: chapters, isLoading, isError } = useQuery({
    queryKey: ["dpr-ai-content", uuid],
    queryFn: () => dprAiContentApi.list(uuid),
    enabled: !!uuid,
  });

  const [activeChapter, setActiveChapter] = useState<ChapterKey>("executive_summary");

  // Reset selection to a stale-or-first chapter whenever the list arrives
  // for the first time. Deliberately doesn't re-fire on refetch — user's
  // manual selection should stick.
  const initialisedRef = useMemo(() => ({ done: false }), []);
  if (chapters && !initialisedRef.done) {
    initialisedRef.done = true;
    const stale = chapters.find((c) => c.is_stale);
    if (stale) setActiveChapter(stale.chapter);
  }

  const current = chapters?.find((c) => c.chapter === activeChapter) ?? null;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["dpr-ai-content", uuid] });

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/fpo/dpr/${uuid}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to DPR
          </Link>
        </Button>
      </div>

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">AI-Generated Narrative</h1>
          <p className="mt-0.5 max-w-3xl text-sm text-muted-foreground">
            Draft each DPR chapter with AI assistance, then edit or regenerate. Regeneration
            never overwrites your active version — you always choose whether to accept the new
            draft, keep the existing one, or merge the two (per KAU RCD B.5).
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading chapters…
        </div>
      )}
      {isError && (
        <Card>
          <CardContent className="p-5 text-sm text-destructive">
            Failed to load AI content. Please refresh.
          </CardContent>
        </Card>
      )}

      {chapters && current && (
        <div className="grid gap-4 lg:grid-cols-[240px,1fr]">
          {/* Chapter rail */}
          <aside className="space-y-1">
            {CHAPTER_ORDER.map((key) => {
              const row = chapters.find((c) => c.chapter === key);
              if (!row) return null;
              const isActive = key === activeChapter;
              return (
                <button
                  key={key}
                  onClick={() => setActiveChapter(key)}
                  className={cn(
                    "group flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="flex items-center gap-2">
                    {row.is_stale && (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                        title="Content may be stale"
                      />
                    )}
                    {row.has_candidate && (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500"
                        title="Candidate awaiting review"
                      />
                    )}
                    <span className="truncate">{CHAPTER_LABELS[key]}</span>
                  </span>
                  <ChevronRight
                    className={cn(
                      "h-3 w-3 shrink-0 transition-transform",
                      isActive && "translate-x-0.5",
                    )}
                  />
                </button>
              );
            })}
          </aside>

          {/* Main pane */}
          <ChapterPane
            uuid={uuid}
            row={current}
            onSaved={invalidate}
          />
        </div>
      )}
    </div>
  );
}

// ── Chapter pane ───────────────────────────────────────────────────────────

function ChapterPane({
  uuid,
  row,
  onSaved,
}: {
  uuid: string;
  row: AIContentRow;
  onSaved: () => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [editText, setEditText] = useState(row.user_edited);
  const [mergeText, setMergeText] = useState("");

  // Reset local edit buffers whenever the row changes (chapter switch or refetch).
  const rowKey = `${row.id}:${row.updated_at}`;
  const resetRef = useMemo(() => ({ key: "" }), []);
  if (resetRef.key !== rowKey) {
    resetRef.key = rowKey;
    setEditText(row.user_edited);
    setMergeText(row.candidate_regen || row.user_edited);
    setEditMode(false);
    setMergeMode(false);
  }

  const generateMutation = useMutation({
    mutationFn: () => dprAiContentApi.generate(uuid, row.chapter),
    onSuccess: () => {
      onSaved();
      toast.success("Candidate generated. Review and accept, keep, or merge.");
    },
    onError: (err) => {
      console.warn("[AI content generate]", err);
      toast.error("Generation failed. Please try again.");
    },
  });

  const acceptMutation = useMutation({
    mutationFn: () => dprAiContentApi.accept(uuid, row.chapter),
    onSuccess: () => {
      onSaved();
      toast.success("Candidate accepted as the active version.");
    },
    onError: () => toast.error("Accept failed."),
  });

  const keepMutation = useMutation({
    mutationFn: () => dprAiContentApi.keep(uuid, row.chapter),
    onSuccess: () => {
      onSaved();
      toast.success("Candidate discarded. Active version preserved.");
    },
    onError: () => toast.error("Keep failed."),
  });

  const mergeMutation = useMutation({
    mutationFn: (text: string) => dprAiContentApi.merge(uuid, row.chapter, text),
    onSuccess: () => {
      onSaved();
      setMergeMode(false);
      toast.success("Merged content saved as the active version.");
    },
    onError: () => toast.error("Merge failed."),
  });

  const editMutation = useMutation({
    mutationFn: (text: string) => dprAiContentApi.editActive(uuid, row.chapter, text),
    onSuccess: () => {
      onSaved();
      setEditMode(false);
      toast.success("Edits saved.");
    },
    onError: () => toast.error("Save failed."),
  });

  const diff = row.has_candidate ? diffLines(row.user_edited, row.candidate_regen) : null;

  return (
    <div className="space-y-4">
      {/* Header + primary actions */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">{row.chapter_display}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Draws on:{" "}
                {row.upstream_sections.length
                  ? row.upstream_sections.join(", ")
                  : "general project context"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                title={row.has_active ? "Produce a new candidate to compare against active" : "Generate the first draft"}
              >
                {generateMutation.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 h-4 w-4" />
                )}
                {row.has_active ? "Regenerate" : "Generate first draft"}
              </Button>
              {row.has_active && !editMode && !row.has_candidate && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditMode(true)}
                >
                  <Edit3 className="mr-1 h-4 w-4" /> Edit in place
                </Button>
              )}
            </div>
          </div>

          {row.is_stale && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                <strong>Content may be stale.</strong> {row.stale_reason || "An upstream section has changed."}
                {" "}Consider regenerating to refresh.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty state */}
      {!row.has_active && !row.has_candidate && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Sparkles className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">
              No draft yet.
            </p>
            <p className="max-w-md text-xs text-muted-foreground">
              Click <strong>Generate first draft</strong> above. The AI will draw on the
              upstream sections and cite the knowledge base entries it grounds itself in.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Diff view — only when a candidate exists */}
      {row.has_candidate && diff && !mergeMode && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">Candidate awaiting review</Badge>
                {row.candidate_generated_at && (
                  <span className="text-[10px] text-muted-foreground">
                    Generated {new Date(row.candidate_generated_at).toLocaleString()}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => acceptMutation.mutate()}
                  disabled={acceptMutation.isPending || keepMutation.isPending}
                >
                  {acceptMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                  Accept candidate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => keepMutation.mutate()}
                  disabled={keepMutation.isPending || acceptMutation.isPending}
                >
                  <X className="mr-1 h-4 w-4" /> Keep existing
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setMergeText(row.user_edited || row.candidate_regen);
                    setMergeMode(true);
                  }}
                >
                  <GitMerge className="mr-1 h-4 w-4" /> Merge
                </Button>
              </div>
            </div>

            {/* Two-column side-by-side diff */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="min-w-0 rounded-md border">
                <div className="border-b bg-muted/40 px-3 py-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                  Existing (active)
                </div>
                <DiffColumn lines={diff.left} tone="left" />
              </div>
              <div className="min-w-0 rounded-md border">
                <div className="border-b bg-muted/40 px-3 py-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                  New candidate
                </div>
                <DiffColumn lines={diff.right} tone="right" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Merge editor */}
      {row.has_candidate && mergeMode && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Merge — write the final text</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => mergeMutation.mutate(mergeText)}
                  disabled={mergeMutation.isPending || !mergeText.trim()}
                >
                  {mergeMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                  Save merged text
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMergeMode(false)}>
                  Cancel
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Start with your existing active text (pre-filled below). Paste snippets from the
              new candidate as needed. Once saved, the candidate is discarded and this text
              becomes the active version.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="min-w-0">
                <p className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">Candidate (read-only reference)</p>
                <div className="max-h-96 overflow-y-auto rounded-md border bg-muted/20 p-3 font-mono text-xs whitespace-pre-wrap">
                  {row.candidate_regen}
                </div>
              </div>
              <div className="min-w-0">
                <p className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">Your merged version</p>
                <Textarea
                  rows={16}
                  className="font-mono text-xs"
                  value={mergeText}
                  onChange={(e) => setMergeText(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active version — read-only or edit mode. Hidden while diff/merge shown. */}
      {row.has_active && !row.has_candidate && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Active version</h3>
              {editMode && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => editMutation.mutate(editText)}
                    disabled={editMutation.isPending || editText === row.user_edited}
                  >
                    {editMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditText(row.user_edited);
                      setEditMode(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
            {editMode ? (
              <Textarea
                rows={16}
                className="font-mono text-xs"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
              />
            ) : (
              <div className="rounded-md border bg-muted/20 p-4 font-mono text-xs whitespace-pre-wrap">
                {row.user_edited}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* KB citation footer */}
      {(row.active_kb_ids.length > 0 || row.candidate_regen_kb_ids.length > 0) && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                Grounded in Knowledge Base
              </p>
            </div>
            {row.active_kb_ids.length > 0 && (
              <div className="text-xs">
                <span className="text-muted-foreground">Active version:</span>{" "}
                <span className="font-mono">
                  {row.active_kb_ids.map((id) => `#${id}`).join(", ")}
                </span>
              </div>
            )}
            {row.candidate_regen_kb_ids.length > 0 && (
              <div className="text-xs">
                <span className="text-muted-foreground">Candidate:</span>{" "}
                <span className="font-mono">
                  {row.candidate_regen_kb_ids.map((id) => `#${id}`).join(", ")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Diff column renderer ───────────────────────────────────────────────────
// `tone` decides which colour palette to use — additions on the right,
// removals on the left. Rendered as a fixed-height scroll box aligned to
// the sibling column so long chapters line up.

function DiffColumn({
  lines,
  tone,
}: {
  lines: DiffLine[];
  tone: "left" | "right";
}) {
  return (
    <div className="max-h-96 overflow-y-auto font-mono text-xs">
      {lines.map((line, i) => {
        const emphasis =
          line.kind === "added" && tone === "right"
            ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
            : line.kind === "removed" && tone === "left"
              ? "bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200"
              : "";
        return (
          <div
            key={i}
            className={cn("min-h-[1.25rem] whitespace-pre-wrap px-3 py-0.5", emphasis)}
          >
            {line.text || " "}
          </div>
        );
      })}
    </div>
  );
}
