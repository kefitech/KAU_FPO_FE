"use client";

/**
 * CountedTextarea — Textarea + character counter + defensive char cap.
 *
 * Extracted from investment.remarks / products.description / location.
 * project_address / rationale.justification after hitting the 4th duplicate.
 *
 * Behaviour:
 *   - `maxChars` enforced via native `maxLength` (blocks further typing /
 *     paste in the DOM) + defensive `.slice(0, maxChars)` in onChange
 *     (guards against scripted paste that bypasses the DOM cap).
 *   - Character counter turns amber past 90% of `maxChars`, destructive-red
 *     at cap. Muted otherwise.
 *   - Optional `error` prop turns the border red — pairs cleanly with
 *     `<Field>` / `<F>` wrappers that render the error message separately.
 *
 * Not a general shadcn wrapper — DPR-scoped for now. Promote to shared UI
 * if we ever want the same treatment on non-DPR forms.
 *
 * Author: Athul Gopan (Kefi Tech Solutions)
 */

import { Textarea } from "@/components/ui/textarea";

interface CountedTextareaProps {
  value: string;
  onChange: (v: string) => void;
  maxChars: number;
  rows?: number;
  placeholder?: string;
  /** When true, applies a red border to signal an error (message rendered elsewhere). */
  error?: boolean;
  /** Optional id passed through to the inner textarea. */
  id?: string;
}

export function CountedTextarea({
  value,
  onChange,
  maxChars,
  rows = 3,
  placeholder,
  error,
  id,
}: CountedTextareaProps) {
  const len = (value ?? "").length;
  const near = len > maxChars * 0.9;
  const at = len >= maxChars;

  return (
    <div className="space-y-1">
      <Textarea
        id={id}
        rows={rows}
        placeholder={placeholder}
        value={value ?? ""}
        maxLength={maxChars}
        onChange={(e) => onChange(e.target.value.slice(0, maxChars))}
        className={
          error
            ? "text-sm border-destructive focus-visible:ring-destructive/40"
            : "text-sm"
        }
      />
      <div
        className={
          at
            ? "text-right text-xs font-medium text-destructive"
            : near
              ? "text-right text-xs text-amber-600"
              : "text-right text-xs text-muted-foreground"
        }
      >
        {len} / {maxChars} chars
      </div>
    </div>
  );
}
