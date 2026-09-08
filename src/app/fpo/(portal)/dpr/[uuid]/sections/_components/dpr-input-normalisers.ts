/**
 * Shared input normalisers for DPR section forms.
 *
 * Extracted from investment / products / location / (soon) baseline after
 * hitting the 4th duplicate. Every DPR section that has a Decimal-backed
 * money / quantity / percentage input funnels raw user text through
 * `normaliseDecimalInput` so:
 *
 *   1. Non-numeric characters are stripped (guards against `type="number"`'s
 *      unbounded-length paste vulnerability — a 60-digit paste sails through
 *      the native number input with no cap).
 *   2. Only one decimal point survives.
 *   3. Decimal places are capped at `maxDecimals` (matches backend
 *      `DecimalField(decimal_places=N)`).
 *   4. The final value is clipped at `max` — silently caps runaway pastes
 *      rather than 400-ing at save time with a confusing error.
 *
 * Empty string passes through unchanged so the field can be cleared.
 *
 * Companion `normaliseIntegerInput` for `IntegerField`-backed inputs where
 * decimals aren't valid at all (e.g. `num_employees` in Baseline).
 *
 * Author: Athul Gopan (Kefi Tech Solutions)
 */

interface DecimalNormaliseOptions {
  /** Upper bound; anything beyond is silently clipped. */
  max: number;
  /** Max digits after the decimal point (matches backend `decimal_places`). */
  maxDecimals: number;
  /** Optional lower bound (default 0). Values below are clipped to `min`. */
  min?: number;
}

/**
 * Normalise a decimal-input string. See file docstring for behaviour.
 */
export function normaliseDecimalInput(
  raw: string,
  { max, maxDecimals, min = 0 }: DecimalNormaliseOptions,
): string {
  if (raw === "" || raw == null) return "";
  const cleaned = raw.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  const withOneDot =
    parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;
  const [intPart = "", decPart] = withOneDot.split(".");
  const trimmedDec = decPart !== undefined ? decPart.slice(0, maxDecimals) : undefined;
  const finalStr =
    trimmedDec !== undefined ? `${intPart}.${trimmedDec}` : intPart;
  if (finalStr === "" || finalStr === ".") return finalStr;
  const n = Number(finalStr);
  if (!Number.isFinite(n)) return finalStr;
  if (n > max) return String(max);
  if (n < min) return String(min);
  return finalStr;
}

interface IntegerNormaliseOptions {
  /** Upper bound; anything beyond is silently clipped. */
  max: number;
  /** Optional lower bound (default 0). Values below are clipped to `min`. */
  min?: number;
}

/**
 * Normalise an integer-input string — strips non-digits (also rejects
 * decimals, which `normaliseDecimalInput` would allow). Use for
 * `IntegerField`-backed inputs like employee counts, batch sizes, etc.
 */
export function normaliseIntegerInput(
  raw: string,
  { max, min = 0 }: IntegerNormaliseOptions,
): string {
  if (raw === "" || raw == null) return "";
  const cleaned = raw.replace(/\D/g, "");
  if (cleaned === "") return "";
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return cleaned;
  if (n > max) return String(max);
  if (n < min) return String(min);
  return cleaned;
}
