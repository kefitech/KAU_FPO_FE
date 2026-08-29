"use client";

import { useQuery } from "@tanstack/react-query";

import { dprApi, type DprSectionKey } from "@/lib/api/dpr";

/**
 * Returns backend readiness errors and warnings grouped by field name, so each
 * section can display an inline error under the corresponding input.
 *
 * Uses the SAME query key as `ReadinessPanel` — React Query dedupes the fetch,
 * so both components share one network call and stay in sync.
 *
 * The backend is the single source of truth for validation. Do NOT duplicate
 * this logic in zod schemas; it will drift.
 */
export function useReadinessErrorsByField(
  uuid: string,
  sectionKey: DprSectionKey,
) {
  const { data } = useQuery({
    queryKey: ["dpr-readiness", uuid, sectionKey],
    queryFn: () => dprApi.getReadiness(uuid, sectionKey),
    enabled: !!uuid,
    staleTime: 5_000,
  });

  const errors = new Map<string, string>();
  const warnings = new Map<string, string>();
  if (data) {
    for (const e of data.errors ?? []) errors.set(e.field, e.message);
    for (const w of data.warnings ?? []) warnings.set(w.field, w.message);
  }

  return {
    errors,
    warnings,
    isComplete: data?.is_complete ?? false,
  };
}
