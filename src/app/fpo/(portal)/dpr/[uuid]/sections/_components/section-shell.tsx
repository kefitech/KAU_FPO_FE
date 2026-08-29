"use client";

import { useEffect, useState } from "react";

import {
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Loader2,
  Save,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DPR_SECTIONS, type DprSectionKey } from "@/lib/api/dpr";
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
}: Props) {
  const section = DPR_SECTIONS.find((s) => s.key === sectionKey);
  const showSaveControls = onSave !== undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      {/* Header — title + status */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {section?.group}
          </div>
          <h1 className="text-2xl font-semibold">{section?.title ?? "Section"}</h1>
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
          {children}
          <ReadinessPanel uuid={uuid} sectionKey={sectionKey} />

          {/* Footer — Discard + Save. Only when the section is wired up for hybrid save. */}
          {showSaveControls && (
            <div className="sticky bottom-0 -mx-6 border-t bg-background/95 px-6 py-3 backdrop-blur">
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onDiscard}
                  disabled={!isDirty || isSaving}
                  className={cn(!isDirty && "opacity-50")}
                >
                  <Undo2 className="mr-1.5 h-4 w-4" />
                  Discard changes
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
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
