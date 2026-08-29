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
  // `hasFormLoadedRef` also gates the autosave watcher (so we do not save
  // during initial mount before the server data has populated the form).
  const hasSeededRef = useRef(false);
  const hasFormLoadedRef = useRef(false);
  useEffect(() => {
    if (query.data && !hasSeededRef.current) {
      const shaped = mapServerToForm ? mapServerToForm(query.data) : (query.data as T);
      form.reset(shaped);
      hasSeededRef.current = true;
      hasFormLoadedRef.current = true;
    }
  }, [query.data, form, mapServerToForm]);

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
      form.reset(shaped);
      queryClient.setQueryData(["dpr-section", uuid, sectionKey], data);
      queryClient.refetchQueries({
        queryKey: ["dpr-readiness", uuid, sectionKey],
      });
      setIsDirty(false);
      setLastSavedAt(new Date());
      setSaveError(null);
    },
    onError: (err) => {
      markSaved(sectionKey);
      setSaveError(err instanceof Error ? err : new Error("Unknown error"));
      toast.error("Failed to save. Please try again.");
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
    const sub = form.watch((values, { name }) => {
      if (!name) return;                       // reset() emission — skip
      if (!hasFormLoadedRef.current) return;   // pre-load — skip
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
  const save = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const values = form.getValues();
    mutationRef.current.mutate(values);
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
    isDirty: (isDirty || rhfIsDirty) && hasFormLoadedRef.current,
    lastSavedAt,
    saveError,
    fieldErrors,
    fieldWarnings,
    save,
    discard,
  };
}
