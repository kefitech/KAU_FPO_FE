"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useForm,
  useFormState,
  type DefaultValues,
  type FieldValues,
} from "react-hook-form";
import { toast } from "sonner";
import type { ZodType } from "zod";

import { dprApi, type DprSectionKey } from "@/lib/api/dpr";
import { useDprWizardStore } from "@/stores/dpr-store";

import { useReadinessErrorsByField } from "./use-readiness-errors";

/**
 * Turn whatever the backend sent as `message` into a readable toast string.
 *
 * Backend contract (per `apps/core/utils/responses.py`):
 *   - Simple errors → `message: string` (e.g. "Estimated Project Cost shall be greater than zero")
 *   - Field-level validation errors → `message: { field: [msg1, msg2, ...], ... }`
 *
 * Previously toast.error() was handed the raw object and rendered
 * "[object Object]" or nothing. This helper flattens the second shape into
 *   "year_history: Duplicate financial_year at year_history[2]..."
 * so the user actually sees WHY the save failed.
 */
function flattenBackendMessage(msg: unknown): string {
  if (!msg) return "";
  if (typeof msg === "string") return msg;
  if (typeof msg === "object") {
    // Django REST field-error dict: { field: string | string[] }.
    // Non-field-error DRF payloads use `non_field_errors` — surface first.
    const record = msg as Record<string, unknown>;
    const lines: string[] = [];
    for (const [field, value] of Object.entries(record)) {
      const text = Array.isArray(value) ? value.join(" · ") : String(value);
      // Skip generic "non_field_errors" label for readability.
      lines.push(field === "non_field_errors" ? text : `${field}: ${text}`);
    }
    return lines.join("\n") || String(msg);
  }
  return String(msg);
}

/**
 * Shared hook for every DPR section form (hybrid save model).
 *
 * Two save paths:
 *   1. **Manual save** — user clicks the Save button in `SectionShell`.
 *      Fires immediately, no debounce. Preferred user action.
 *   2. **Autosave safety net** — 5s after last user change, if the section is
 *      still dirty. Prevents data loss on browser close / crash. Uses a stable
 *      subscription (mutationRef) so it survives React Query re-renders.
 *
 * Also exposes:
 *   - `isDirty` — user has unsaved changes since last successful save
 *   - `lastSavedAt` — timestamp of last successful save (for status indicator)
 *   - `saveError` — last error object, cleared on next successful save
 *   - `save()` — explicit save (used by button)
 *   - `discard()` — reset form to last-saved server state
 */

const AUTOSAVE_DEBOUNCE_MS = 5000;

export interface UseDprSectionFormOptions<T extends FieldValues> {
  uuid: string;
  sectionKey: DprSectionKey;
  /**
   * Zod schema whose input type equals output type — do NOT use `.transform()` or `.default()`.
   * The `ZodType<T, T>` signature aligns with zodResolver's expectation that
   * schema Input extends FieldValues (zod v4 defaults Input to `unknown`, which fails).
   */
  schema: ZodType<T, T>;
  defaultValues: DefaultValues<T>;
  serializePayload?: (values: T) => Record<string, unknown>;
  mapServerToForm?: (server: unknown) => T;
}

export function useDprSectionForm<T extends FieldValues>({
  uuid,
  sectionKey,
  schema,
  defaultValues,
  serializePayload,
  mapServerToForm,
}: UseDprSectionFormOptions<T>) {
  const queryClient = useQueryClient();
  const markDirty = useDprWizardStore((s) => s.markDirty);
  const markClean = useDprWizardStore((s) => s.markClean);
  const markSaving = useDprWizardStore((s) => s.markSaving);
  const markSaved = useDprWizardStore((s) => s.markSaved);

  // Hybrid save-model state (exposed to SectionShell for the button + indicator)
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<Error | null>(null);

  const query = useQuery({
    queryKey: ["dpr-section", uuid, sectionKey],
    queryFn: () => dprApi.getSection<T>(uuid, sectionKey),
    enabled: !!uuid,
  });

  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  // RHF's isDirty proxy — reactively true when ANY field differs from defaults.
  // Reliable at component level (unlike inside watch callbacks). Combined with
  // our custom `isDirty` state in the return so BOTH register()-based text inputs
  // AND setValue()-based checkboxes reliably enable the Save button.
  const { isDirty: rhfIsDirty } = useFormState({ control: form.control });

  // Seed the form once when server data arrives; never overwrite user edits.
  // `hasFormLoaded` also gates the autosave watcher (so we do not save
  // during initial mount before the server data has populated the form).
  //
  // Kept as reactive state (not a ref) so that when it flips true, dependent
  // computations like the returned `isDirty` re-run — otherwise a ref update
  // wouldn't trigger a re-render and the Save button could stay disabled
  // even after the user starts typing.
  const hasSeededRef = useRef(false);
  const hasFormLoadedRef = useRef(false);
  const [hasFormLoaded, setHasFormLoaded] = useState(false);
  useEffect(() => {
    if (query.data && !hasSeededRef.current) {
      const shaped = mapServerToForm ? mapServerToForm(query.data) : (query.data as T);
      form.reset(shaped);
      hasSeededRef.current = true;
      hasFormLoadedRef.current = true;
      setHasFormLoaded(true);
    }
  }, [query.data, form, mapServerToForm]);

  // Flag flipped by `save()` right before mutating. mutation.onSuccess reads it
  // to decide whether to fire a "Section saved" toast — only for explicit Save
  // button clicks, not for the silent 5s autosave (would spam the tester).
  // Reset to false after each mutation resolves.
  const isExplicitSaveRef = useRef(false);

  const mutation = useMutation({
    mutationFn: (payload: T) => {
      const body = (serializePayload ? serializePayload(payload) : payload) as Partial<T>;
      return dprApi.saveSection<T>(uuid, sectionKey, body);
    },
    onMutate: () => {
      markSaving(sectionKey);
      setSaveError(null);
    },
    onSuccess: (data) => {
      markSaved(sectionKey);
      markClean(sectionKey);
      const shaped = mapServerToForm ? mapServerToForm(data) : (data as T);
      // Explicit Save click → full reset (baseline becomes fresh server state,
      // dirty flag clears immediately, sidebar orange indicator goes off).
      // Silent autosave → `keepDirtyValues: true` so any field the user is
      // *still* typing in isn't overwritten mid-keystroke and dirty stays true
      // for those specific fields only.
      const resetOptions = isExplicitSaveRef.current ? {} : { keepDirtyValues: true };
      form.reset(shaped, resetOptions);
      queryClient.setQueryData(["dpr-section", uuid, sectionKey], data);
      queryClient.refetchQueries({
        queryKey: ["dpr-readiness", uuid, sectionKey],
      });
      // Only clear our local dirty flag if the user hasn't kept typing after
      // save was queued. `formState.isDirty` (via useFormState) reflects the
      // post-reset dirty state accurately thanks to keepDirtyValues.
      setIsDirty(false);
      setLastSavedAt(new Date());
      setSaveError(null);
      // Only toast on explicit Save clicks — autosaves are silent by design
      // so the tester doesn't get spammed every 5s while typing.
      if (isExplicitSaveRef.current) {
        toast.success("Section saved");
        isExplicitSaveRef.current = false;
      }
    },
    onError: (err) => {
      markSaved(sectionKey);
      setSaveError(err instanceof Error ? err : new Error("Unknown error"));
      // Prefer the backend's response message so the user sees the exact
      // reason ("Estimated Project Cost shall be greater than zero" etc.),
      // not a generic "Failed to save".
      //
      // Backend can return `message` as EITHER:
      //   - a string ("Estimated Project Cost shall be greater than zero")
      //   - a field-error object ({ year_history: ["Duplicate financial_year..."], ... })
      // If it's an object, previously we were passing it straight to
      // toast.error() which renders "[object Object]" or silently drops it.
      // Flatten to a readable multi-line string so the user actually sees
      // WHY the save failed.
      const axiosErr = err as { response?: { data?: { message?: string | Record<string, unknown>; errors?: unknown } } };
      const rawMsg = axiosErr?.response?.data?.message;
      const displayMsg = flattenBackendMessage(rawMsg) || "Failed to save. Please try again.";
      toast.error(displayMsg);
      isExplicitSaveRef.current = false;
    },
  });

  // Keep mutation reference in a ref so autosave watcher's subscription
  // does NOT rebuild every time React Query returns a new mutation object.
  // Rebuilding tore down the timer + subscription between renders,
  // silently dropping rapid consecutive user changes (e.g. check + uncheck).
  const mutationRef = useRef(mutation);
  useEffect(() => {
    mutationRef.current = mutation;
  }, [mutation]);

  // Debounced autosave — subscription is STABLE across renders (only depends on
  // `form`, `markDirty`, `sectionKey` which are all stable). Watch callback
  // reads latest mutation via `mutationRef.current`.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const sub = form.watch((values, { name, type }) => {
      if (!name) return;                       // full reset() emission — skip
      if (!hasFormLoadedRef.current) return;   // pre-load — skip
      // Only mark dirty on genuine user input. `type === "change"` means the
      // change came from a user event (Input.onChange, setValue, checkbox
      // toggle). Emissions from `form.reset(shaped, { keepDirtyValues: true })`
      // — which fires when the server-normalised value differs from what we
      // sent (e.g. "500" → "500.000") — have `type === undefined`. Without this
      // filter, every successful autosave would mark the section dirty again,
      // leaving the sidebar's orange indicator stuck on.
      if (type !== "change") return;
      markDirty(sectionKey);
      setIsDirty(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        mutationRef.current.mutate(values as T);
      }, AUTOSAVE_DEBOUNCE_MS);
    });
    return () => {
      sub.unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [form, markDirty, sectionKey]);

  // Explicit save — bypasses debounce, fires immediately.
  // Flips isExplicitSaveRef so mutation.onSuccess fires a toast (autosaves
  // stay silent — they don't set this flag).
  const save = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    isExplicitSaveRef.current = true;
    const values = form.getValues();
    mutationRef.current.mutate(values);
  }, [form]);

  // Same as `save` but returns a promise — used by callers that must await
  // the save (e.g. save-before-navigate flows like the Manage tranches link
  // on the Finance section — user types, clicks the link, and would lose
  // typed data if we didn't flush the save first).
  const saveAsync = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    isExplicitSaveRef.current = true;
    const values = form.getValues();
    return mutationRef.current.mutateAsync(values);
  }, [form]);

  // Discard — reset the form to the last-known server state (query.data).
  // Cancels any pending autosave.
  const discard = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (query.data) {
      const shaped = mapServerToForm ? mapServerToForm(query.data) : (query.data as T);
      form.reset(shaped);
    }
    setIsDirty(false);
    markClean(sectionKey);
  }, [form, mapServerToForm, query.data, markClean, sectionKey]);

  // Field-level backend validation errors — sections can display these inline
  // via <FieldError name="X" errors={fieldErrors} warnings={fieldWarnings} />.
  // Uses the same query key as ReadinessPanel — React Query dedupes the fetch.
  const { errors: fieldErrors, warnings: fieldWarnings } =
    useReadinessErrorsByField(uuid, sectionKey);

  return {
    form,
    isLoading: query.isLoading,
    isSaving: mutation.isPending,
    // Combine two signals so BOTH register()-based text inputs AND setValue()-based
    // checkboxes/dropdowns reliably enable the Save button. See rhfIsDirty above.
    // If EITHER signal (our custom watch-driven state OR RHF's own proxy)
    // says dirty, enable the Save button. Do NOT gate on hasFormLoaded here —
    // that was causing text inputs to fail to enable Save because the render
    // that flips dirty=true can race with the gate. The gate still applies to
    // AUTOSAVE (see the watch subscription below) which is what actually matters.
    isDirty: isDirty || rhfIsDirty,
    lastSavedAt,
    saveError,
    fieldErrors,
    fieldWarnings,
    save,
    saveAsync,
    discard,
  };
}
