"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

import { dprApi, type DprSectionKey } from "@/lib/api/dpr";

/**
 * Reusable readiness display for any section.
 *
 * Fetches /readiness/ (backend runs the section's validator, returns
 * {errors[], warnings[], is_complete}) and renders it as color-coded panels.
 * Refetches automatically when the section save mutation invalidates its cache.
 */
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
                <span className="font-medium">{e.field}</span> — {e.message}
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
                <span className="font-medium">{w.field}</span> — {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
