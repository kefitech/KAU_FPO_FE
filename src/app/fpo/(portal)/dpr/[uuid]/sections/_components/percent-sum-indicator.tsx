"use client";

/**
 * Live percent-sum indicator for DPR sections where a group of fields must
 * sum to exactly 100 (or ≤ 100) — mirrors backend validators like
 * `credit_cash_over_100`, `channel_share_over_100`, `channel_mix_over_100`.
 *
 * Colour meaning:
 *   • red    — sum > target  (backend will reject on save)
 *   • amber  — 0 < sum < target and `mustEqualTarget` is true (backend warning)
 *   • green  — sum === target (or ≤ target when `mustEqualTarget` is false)
 *
 * Values can be strings (from RHF register), numbers, or null — anything
 * non-finite is treated as 0.
 */
export interface PercentSumIndicatorProps {
  /** Field values to sum. Non-numeric / null / "" are treated as 0. */
  values: ReadonlyArray<string | number | null | undefined>;
  /** Human label for the group, e.g. "Credit + Cash". */
  label: string;
  /** Target total. Defaults to 100. */
  target?: number;
  /**
   * If true (default) sub-100 is amber ("should ideally total X").
   * If false, sub-100 is fine (only >target is flagged) — use for "≤ 100" fields.
   */
  mustEqualTarget?: boolean;
  /** Optional class overrides. */
  className?: string;
}

export function PercentSumIndicator({
  values,
  label,
  target = 100,
  mustEqualTarget = true,
  className,
}: PercentSumIndicatorProps) {
  const sum = values.reduce<number>((acc, v) => {
    if (v === null || v === undefined || v === "") return acc;
    const n = typeof v === "number" ? v : Number(v);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);

  if (sum === 0) return null;

  const over = sum > target;
  const under = sum < target;
  const exact = sum === target;

  const tone =
    over
      ? "text-destructive"
      : under && mustEqualTarget
        ? "text-amber-600 dark:text-amber-500"
        : "text-emerald-600 dark:text-emerald-500";

  return (
    <p className={`text-xs ${tone} ${className ?? ""}`}>
      {label} = {sum.toFixed(2)}
      {target === 100 ? "%" : ""}
      {over && " — exceeds " + target + (target === 100 ? "%" : "") + ". Backend will reject on save."}
      {under && mustEqualTarget && " — should ideally total " + target + (target === 100 ? "%" : "") + "."}
      {exact && " ✓"}
    </p>
  );
}

/**
 * Helper: derived boolean matching the "red" state above. Lets the caller
 * apply red borders to individual input fields participating in the sum.
 */
export function isPercentSumOver(
  values: ReadonlyArray<string | number | null | undefined>,
  target = 100,
): boolean {
  const sum = values.reduce<number>((acc, v) => {
    if (v === null || v === undefined || v === "") return acc;
    const n = typeof v === "number" ? v : Number(v);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
  return sum > target;
}
