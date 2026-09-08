/**
 * Land area unit conversions — mirrors apps/core/utils/land_area.py.
 *
 * Per KAU RCD reply B.3 (2026-09-02): support Acre/Cent/Are/Hectare/Sqm,
 * store canonical in acres, display in user's chosen unit.
 *
 * Kept as plain numbers (not BigNumber) — DPR land inputs never exceed a few
 * hundred acres so double precision is more than enough. Backend uses Decimal
 * for storage precision.
 */

export type LandUnit = "acre" | "cent" | "are" | "hectare" | "sqm";

// Ratios must stay in lock-step with land_area.py. If you edit one, edit both.
const ACRES_PER_UNIT: Record<LandUnit, number> = {
  acre: 1,
  cent: 0.01,
  are: 0.024710538146717,
  hectare: 2.47105381467165,
  sqm: 0.00024710538146717,
};

export const LAND_UNIT_OPTIONS: ReadonlyArray<{ value: LandUnit; label: string }> = [
  { value: "acre", label: "Acre" },
  { value: "cent", label: "Cent" },
  { value: "are", label: "Are" },
  { value: "hectare", label: "Hectare" },
  { value: "sqm", label: "Square metre" },
];

export const CANONICAL_UNIT: LandUnit = "acre";

export function toAcres(value: number | string | null | undefined, unit: LandUnit): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return n * ACRES_PER_UNIT[unit];
}

export function fromAcres(acres: number | string | null | undefined, unit: LandUnit): number {
  if (acres === null || acres === undefined || acres === "") return 0;
  const n = typeof acres === "number" ? acres : Number(acres);
  if (!Number.isFinite(n)) return 0;
  const factor = ACRES_PER_UNIT[unit];
  if (factor === 0) return 0;
  return n / factor;
}

export function convertLand(
  value: number | string | null | undefined,
  from: LandUnit,
  to: LandUnit,
): number {
  return fromAcres(toAcres(value, from), to);
}
