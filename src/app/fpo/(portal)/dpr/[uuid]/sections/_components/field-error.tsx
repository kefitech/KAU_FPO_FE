"use client";

/**
 * Displays a backend-driven validation error (red) or warning (amber) under
 * a specific field. Reads from the maps returned by `useReadinessErrorsByField`
 * (or from the `fieldErrors` / `fieldWarnings` returned by `useDprSectionForm`).
 *
 * The `name` prop must match the `field` string the backend validator produces
 * (see `apps/fpo/services/dpr/<section>_validators.py`).
 */
export function FieldError({
  name,
  errors,
  warnings,
}: {
  name: string;
  errors: Map<string, string>;
  warnings?: Map<string, string>;
}) {
  const err = errors.get(name);
  const warn = warnings?.get(name);

  if (err) {
    return <p className="mt-1 text-xs text-destructive">{err}</p>;
  }
  if (warn) {
    return <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">{warn}</p>;
  }
  return null;
}
