"use client";

/**
 * useFieldSource — read the provenance for one DPR field.
 *
 * Per KAU RCD replies C.6 + C.7 (2026-09-02). Reads from the cached project
 * identification response (already fetched at wizard level via React Query
 * key ["dpr-identification", uuid]). No extra HTTP request.
 *
 * Usage:
 *   const source = useFieldSource(uuid, "raw_material", "annual_procurement_cost");
 *   <FieldSourceBadge source={source} />
 *
 * Falls back to "user_entered" when the key is absent — same semantics as
 * the backend helper (see apps/fpo/services/dpr/field_sources.py).
 */

import { useQueryClient } from "@tanstack/react-query";

import { dprApi, type DprProjectIdentification } from "@/lib/api/dpr";
import type { FieldSource } from "@/app/fpo/(portal)/dpr/[uuid]/sections/_components/field-source-badge";

export function useFieldSource(
  uuid: string,
  sectionKey: string,
  fieldName: string,
): FieldSource {
  const qc = useQueryClient();
  // Reads from cache — the project identification response already lives here
  // after the wizard's initial fetch. If the cache is cold (rare — layout
  // fetches on mount), returns user_entered as a safe default.
  const cached = qc.getQueryData<DprProjectIdentification>(["dpr-identification", uuid]);
  const source = cached?.field_sources?.[sectionKey]?.[fieldName];
  if (!source) return "user_entered";
  // Backend is source of truth for valid values — narrow via cast rather than
  // re-validating here, since a mismatch would be a backend contract break.
  return source as FieldSource;
}

/**
 * useAllFieldSourcesForSection — get the full { field_name -> source } map
 * for one section. Useful when a section wants to render badges on many
 * fields without calling useFieldSource repeatedly.
 */
export function useAllFieldSourcesForSection(
  uuid: string,
  sectionKey: string,
): Record<string, FieldSource> {
  const qc = useQueryClient();
  const cached = qc.getQueryData<DprProjectIdentification>(["dpr-identification", uuid]);
  const map = cached?.field_sources?.[sectionKey] ?? {};
  return map as Record<string, FieldSource>;
}

/**
 * Kick off a fetch of the project identification (which includes field_sources)
 * if it isn't already cached. Call from layout or the section shell mount.
 * Wraps dprApi.getIdentification via React Query's prefetch. Idempotent.
 */
export async function ensureFieldSourcesLoaded(
  uuid: string,
  qc: ReturnType<typeof useQueryClient>,
): Promise<void> {
  await qc.prefetchQuery({
    queryKey: ["dpr-identification", uuid],
    queryFn: () => dprApi.getIdentification(uuid),
  });
}
