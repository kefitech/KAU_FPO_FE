"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

import { dprApi, type DprSectionKey } from "@/lib/api/dpr";

import { humaniseFieldPath } from "./humanise-field";

/**
 * Reusable readiness display for any section.
 *
 * Fetches /readiness/ (backend runs the section's validator, returns
 * {errors[], warnings[], is_complete}) and renders it as color-coded panels.
 * Refetches automatically when the section save mutation invalidates its cache.
 *
 * Every error/warning is a clickable button — clicking dispatches
 * `dpr:field-focus` on window, and any section-side listener that recognises
 * the root key scrolls its card into view and flashes a highlight. Nested-row
 * fields (`materials[0].xxx`) also carry the row index so a NestedListCard
 * ref can pop open the exact row's modal.
 */
function focusField(field: string) {
  if (typeof window === "undefined" || !field) return;
  // Scroll to any element tagged with the root key so the user's eye lands
  // on the correct card even before the modal auto-opens. Falls back
  // gracefully — if the section hasn't wired an id yet, nothing breaks.
  const rootKey = field.split(/[.[]/)[0];
  const targetId = `dpr-field-${rootKey}`;
  const target = document.getElementById(targetId);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    // Temporary flash highlight — CSS class defined globally.
    // Force restart the animation in case the class was already applied.
    target.classList.remove("dpr-flash");
    // Force reflow so the animation restarts even on rapid re-clicks.
    void target.offsetWidth;
    target.classList.add("dpr-flash");
    window.setTimeout(() => target.classList.remove("dpr-flash"), 2400);
  } else if (typeof console !== "undefined") {
    // Non-fatal — the section just hasn't tagged this field yet. Log so we
    // know which id is missing and can add it in the next round.
    console.warn(`[DPR readiness] No scroll target #${targetId} for field "${field}". Tag the field with id="${targetId}" in the section component.`);
  }
  // Sections can listen and do more (open modal for the specific row, etc.).
  window.dispatchEvent(new CustomEvent("dpr:field-focus", { detail: { field } }));
}
export function ReadinessPanel({
  uuid,
  sectionKey,
}: {
  uuid: string;
  sectionKey: DprSectionKey;
}) {
  const { data } = useQuery({
    queryKey: ["dpr-readiness", uuid, sectionKey],
    queryFn: () => dprApi.getReadiness(uuid, sectionKey),
    enabled: !!uuid,
    staleTime: 5_000,
  });

  if (!data) return null;

  const { errors, warnings } = data;

  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/30">
        <div className="flex items-center gap-2 font-medium text-emerald-900 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          Section complete
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm">
          <div className="mb-2 flex items-center gap-2 font-medium text-destructive">
            <AlertCircle className="h-4 w-4" />
            {errors.length} {errors.length === 1 ? "issue" : "issues"} to resolve
          </div>
          <ul className="list-disc space-y-1 pl-6 text-xs text-destructive/90">
            {errors.map((e, i) => (
              <li key={`${e.code}-${i}`}>
                <button
                  type="button"
                  onClick={() => focusField(e.field)}
                  className="text-left underline-offset-2 hover:underline focus:outline-none focus-visible:underline"
                >
                  <span className="font-medium">{humaniseFieldPath(e.field, sectionKey)}</span> — {e.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/30">
          <div className="mb-2 flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            {warnings.length} {warnings.length === 1 ? "suggestion" : "suggestions"}
          </div>
          <ul className="list-disc space-y-1 pl-6 text-xs text-amber-800 dark:text-amber-300">
            {warnings.map((w, i) => (
              <li key={`${w.code}-${i}`}>
                <button
                  type="button"
                  onClick={() => focusField(w.field)}
                  className="text-left underline-offset-2 hover:underline focus:outline-none focus-visible:underline"
                >
                  <span className="font-medium">{humaniseFieldPath(w.field, sectionKey)}</span> — {w.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
