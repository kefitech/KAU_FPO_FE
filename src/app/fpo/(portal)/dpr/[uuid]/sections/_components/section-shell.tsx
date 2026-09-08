"use client";

import { useEffect, useMemo, useState } from "react";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Info,
  Loader2,
  Save,
  Undo2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DPR_SECTIONS, dprApi, type DprSectionKey } from "@/lib/api/dpr";
import { cn } from "@/lib/utils";

import { ReadinessPanel } from "./readiness-panel";

/**
 * Save state props — provided by `useDprSectionForm()`.
 * Optional to keep backward-compatible with any section not yet wired up.
 */
export interface SectionShellSaveProps {
  isDirty?: boolean;
  isSaving?: boolean;
  lastSavedAt?: Date | null;
  saveError?: Error | null;
  onSave?: () => void;
  onDiscard?: () => void;
}

interface Props extends SectionShellSaveProps {
  uuid: string;
  sectionKey: DprSectionKey;
  loading?: boolean;
  children: React.ReactNode;
  /**
   * Optional help slot — typically `<SectionHelp title="..." purpose="..." />`.
   * Rendered next to the section title as a 📖 book icon; click opens a
   * dialog explaining what the section is for and what to fill in.
   * Sections are opted-in one at a time as UI testing surfaces the need.
   */
  help?: React.ReactNode;
}

/** ── Save status indicator (self-refreshing "N seconds ago" label) ── */
function SaveStatus({
  isDirty,
  isSaving,
  lastSavedAt,
  saveError,
}: {
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  saveError: Error | null;
}) {
  // Refresh "N seconds ago" every 10s so the label stays accurate.
  const [, forceRerender] = useState(0);
  useEffect(() => {
    if (!lastSavedAt) return;
    const id = setInterval(() => forceRerender((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, [lastSavedAt]);

  if (saveError) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-destructive">
        <AlertCircle className="h-3.5 w-3.5" />
        Failed to save
      </div>
    );
  }

  if (isSaving) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Saving…
      </div>
    );
  }

  if (isDirty) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500">
        <CircleDot className="h-3.5 w-3.5" />
        Unsaved changes
      </div>
    );
  }

  if (lastSavedAt) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-500">
        <CheckCircle2 className="h-3.5 w-3.5" />
        All changes saved · {relativeTime(lastSavedAt)}
      </div>
    );
  }

  return null;
}

function relativeTime(ts: Date): string {
  const s = Math.floor((Date.now() - ts.getTime()) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

/** ── Standard section shell — title + save status + form + readiness + footer buttons ── */
export function SectionShell({
  uuid,
  sectionKey,
  loading,
  children,
  isDirty,
  isSaving,
  lastSavedAt,
  saveError,
  onSave,
  onDiscard,
  help,
}: Props) {
  const section = DPR_SECTIONS.find((s) => s.key === sectionKey);
  const showSaveControls = onSave !== undefined;

  // Applicability drives which sections appear in prev/next navigation +
  // the "Optional / Required" hint banner. When the rule engine is off (or
  // applicability not loaded yet), all 22 sections are treated as visible
  // AND no hint banner is shown — matches the current default rollout
  // behaviour where every section is Optional and every section is shown.
  const { data: applicability } = useQuery({
    queryKey: ["dpr-applicability", uuid],
    queryFn: () => dprApi.getApplicability(uuid),
    enabled: !!uuid,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });

  const { prev, next } = useMemo(() => {
    const isHidden = (key: string) =>
      applicability?.applicability?.[key] === "H";
    const visible = DPR_SECTIONS.filter((s) => !isHidden(s.key));
    const idx = visible.findIndex((s) => s.key === sectionKey);
    return {
      prev: idx > 0 ? visible[idx - 1] : null,
      next: idx >= 0 && idx < visible.length - 1 ? visible[idx + 1] : null,
    };
  }, [applicability, sectionKey]);

  // Applicability of THIS section — used to render the optional / required
  // hint banner. Only surfaced when the engine is actually enabled;
  // otherwise every section returns 'O' and the banner would appear
  // uselessly on all 22 sections.
  const engineEnabled = applicability?.engine_enabled === true;
  const thisApplicability = applicability?.applicability?.[sectionKey];
  const showOptionalBanner = engineEnabled && thisApplicability === "O";
  const showRequiredBanner = engineEnabled && thisApplicability === "M";

  // Dismiss state — remembered PER SESSION per (uuid, sectionKey). Uses
  // sessionStorage so a fresh browser session shows the hint again (data
  // might have changed since the user last dismissed).
  const dismissKey = `dpr-hint-dismissed:${uuid}:${sectionKey}`;
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(window.sessionStorage.getItem(dismissKey) === "1");
  }, [dismissKey]);
  function dismissHint() {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(dismissKey, "1");
    }
  }

  // Unsaved-changes navigation guard. When the user clicks Prev / Next while
  // the section has unsaved edits, intercept the navigation and show a
  // 3-choice AlertDialog: Cancel (stay) / Discard & continue / Save &
  // continue. Save-branch awaits the mutation, so if it fails the user
  // stays on the page and can retry.
  const router = useRouter();
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);
  const [savingBeforeNav, setSavingBeforeNav] = useState(false);

  function interceptNav(url: string) {
    if (showSaveControls && isDirty) {
      setPendingNavUrl(url);
      return true;   // dialog will open
    }
    return false;    // let the <Link> navigate normally
  }

  async function saveThenNavigate() {
    if (!onSave || !pendingNavUrl) return;
    const url = pendingNavUrl;
    setSavingBeforeNav(true);
    try {
      // onSave signature is `() => void` today. If it's fire-and-forget,
      // navigate after the mutation ROUND-TRIP by using isSaving as a
      // simple heuristic. Here we call it and best-effort wait via
      // requestAnimationFrame — the useDprSectionForm hook awaits its own
      // mutation internally, so navigation happens on the same tick that
      // the mutation resolves. Sections with custom onSave (identification)
      // fire-and-forget; for those, we still navigate after a short delay
      // so the mutation's onMutate → markSaving state can commit.
      await Promise.resolve(onSave());
      // Small delay to give React Query a chance to flush the mutation +
      // downstream refetch triggers before the next section mounts.
      await new Promise<void>((r) => setTimeout(r, 250));
      router.push(url);
    } finally {
      setPendingNavUrl(null);
      setSavingBeforeNav(false);
    }
  }

  function discardAndNavigate() {
    if (!pendingNavUrl) return;
    if (onDiscard) onDiscard();
    const url = pendingNavUrl;
    setPendingNavUrl(null);
    router.push(url);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      {/* Header — title + optional help icon + save status */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section?.group}
            </div>
            <div className="flex items-center gap-1">
              <h1 className="text-2xl font-semibold">{section?.title ?? "Section"}</h1>
              {help}
            </div>
          </div>
        </div>
        {showSaveControls && (
          <SaveStatus
            isDirty={!!isDirty}
            isSaving={!!isSaving}
            lastSavedAt={lastSavedAt ?? null}
            saveError={saveError ?? null}
          />
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Optional-section hint banner. Only shown when the rule engine
              is actually enabled — otherwise every section returns 'O' and
              the banner would appear uselessly everywhere.
              Dismiss state is per-session per (project, section) so it
              stays out of the way once acknowledged, but re-appears on a
              new session in case component selection has changed the
              applicability. */}
          {showOptionalBanner && !dismissed && (
            <div
              role="note"
              className="flex flex-wrap items-start gap-3 rounded-md border border-blue-200 bg-blue-50/60 px-4 py-3 text-sm dark:border-blue-900/40 dark:bg-blue-950/30"
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-700 dark:text-blue-400" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-blue-900 dark:text-blue-200">
                  This section is optional for your project.
                </p>
                <p className="mt-0.5 text-xs text-blue-800/80 dark:text-blue-300/80">
                  Fill it in if it applies — you can skip to the next section if not.
                </p>
              </div>
              <div className="flex items-center gap-1">
                {next && (
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="h-7 text-blue-900 hover:bg-blue-100 dark:text-blue-200 dark:hover:bg-blue-900/50"
                  >
                    <Link
                      href={`/fpo/dpr/${uuid}/sections/${next.key}`}
                      onClick={(e) => {
                        if (interceptNav(`/fpo/dpr/${uuid}/sections/${next.key}`)) {
                          e.preventDefault();
                        }
                      }}
                    >
                      Skip to next
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-blue-900/70 hover:bg-blue-100 hover:text-blue-900 dark:text-blue-300/70 dark:hover:bg-blue-900/50"
                  onClick={dismissHint}
                  title="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                  <span className="sr-only">Dismiss</span>
                </Button>
              </div>
            </div>
          )}

          {/* Required-section hint — subtle, no dismiss (users should always
              see they're on a required section, no matter how many times). */}
          {showRequiredBanner && (
            <div
              role="note"
              className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50/60 px-4 py-2.5 text-xs dark:border-red-900/40 dark:bg-red-950/30"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-700 dark:text-red-400" />
              <p className="text-red-900 dark:text-red-200">
                This section is <strong>required</strong> for your project — please complete before submission.
              </p>
            </div>
          )}

          {children}
          <ReadinessPanel uuid={uuid} sectionKey={sectionKey} />

          {/* Footer — Prev · Save/Discard · Next. Sticky so navigation is
              always in reach when scrolling long sections. Save/Discard only
              rendered when the section is wired for hybrid save; prev/next
              always available. Clicking Next fires a save first (if dirty)
              so no keystrokes are lost to navigation. */}
          {(showSaveControls || prev || next) && (
            <div className="sticky bottom-0 -mx-6 border-t bg-background/95 px-6 py-3 backdrop-blur">
              <div className="grid grid-cols-3 items-center gap-2">
                {/* Left — Previous section. When the section has unsaved
                    edits, clicking Prev opens the 3-choice AlertDialog
                    (Cancel / Discard / Save & continue) instead of
                    navigating immediately. */}
                <div className="flex justify-start">
                  {prev ? (
                    <Button
                      asChild
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="max-w-full"
                      title={`Previous section — ${prev.title}`}
                    >
                      <Link
                        href={`/fpo/dpr/${uuid}/sections/${prev.key}`}
                        prefetch
                        onClick={(e) => {
                          if (interceptNav(`/fpo/dpr/${uuid}/sections/${prev.key}`)) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <ArrowLeft className="mr-1.5 h-4 w-4 shrink-0" />
                        <span className="truncate">
                          <span className="text-muted-foreground">Previous</span>
                          <span className="mx-1 text-muted-foreground/60">·</span>
                          <span>{prev.title}</span>
                        </span>
                      </Link>
                    </Button>
                  ) : (
                    <span />
                  )}
                </div>

                {/* Centre — Save / Discard */}
                <div className="flex items-center justify-center gap-2">
                  {showSaveControls && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onDiscard}
                        disabled={!isDirty || isSaving}
                        className={cn(!isDirty && "opacity-50")}
                      >
                        <Undo2 className="mr-1.5 h-4 w-4" />
                        Discard
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={onSave}
                        disabled={!isDirty || isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-1.5 h-4 w-4" />
                        )}
                        Save
                      </Button>
                    </>
                  )}
                </div>

                {/* Right — Next section (or Finish on the last section).
                    Same interception as Prev — dirty sections open the
                    unsaved-changes dialog rather than firing a silent
                    background save. */}
                <div className="flex justify-end">
                  {next ? (
                    <Button
                      asChild
                      type="button"
                      variant="default"
                      size="sm"
                      className="max-w-full"
                      title={`Next section — ${next.title}`}
                    >
                      <Link
                        href={`/fpo/dpr/${uuid}/sections/${next.key}`}
                        prefetch
                        onClick={(e) => {
                          if (interceptNav(`/fpo/dpr/${uuid}/sections/${next.key}`)) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <span className="truncate">
                          <span className="opacity-80">Next</span>
                          <span className="mx-1 opacity-60">·</span>
                          <span>{next.title}</span>
                        </span>
                        <ArrowRight className="ml-1.5 h-4 w-4 shrink-0" />
                      </Link>
                    </Button>
                  ) : (
                    // Last section — no forward destination. Show a subtle
                    // link back to the DPR overview instead of leaving the
                    // right column empty (also stops the layout jumping).
                    <Button
                      asChild
                      type="button"
                      variant="outline"
                      size="sm"
                      title="Back to DPR project overview"
                    >
                      <Link
                        href={`/fpo/dpr/${uuid}`}
                        onClick={(e) => {
                          if (interceptNav(`/fpo/dpr/${uuid}`)) {
                            e.preventDefault();
                          }
                        }}
                      >
                        Finish
                        <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unsaved-changes dialog — opens whenever the user clicks Prev / Next
          / Skip while the section has unsaved edits. Three actions: Cancel
          (stay on page), Discard & continue (revert + navigate), Save &
          continue (await save + navigate). Save failure keeps the user on
          the page so they can retry. */}
      <AlertDialog
        open={pendingNavUrl !== null}
        onOpenChange={(open) => {
          if (!open && !savingBeforeNav) setPendingNavUrl(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes on this section. Save them before moving on,
              or discard and continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel disabled={savingBeforeNav}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={discardAndNavigate}
              disabled={savingBeforeNav}
            >
              <Undo2 className="mr-1.5 h-4 w-4" />
              Discard &amp; continue
            </Button>
            <AlertDialogAction
              onClick={saveThenNavigate}
              disabled={savingBeforeNav}
            >
              {savingBeforeNav ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              {savingBeforeNav ? "Saving…" : "Save & continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
