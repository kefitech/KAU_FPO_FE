import type { ProductUnit } from "@/types/fpo";

/**
 * Upper bound for a stock batch quantity. Mirrors the backend constant
 * `ProductStock.MAX_QUANTITY` (apps/database/models/marketplace.py), which the
 * API enforces on batch create and edit. It is derived from the column
 * `DecimalField(max_digits=12, decimal_places=2)`: 10 integer digits + 2 decimals.
 * Change both sides together.
 */
export const MAX_STOCK_QUANTITY = 9_999_999_999.99;
export const MAX_STOCK_QUANTITY_LABEL = "9,999,999,999.99";

/** Units that are counted rather than weighed or measured — their quantities must be whole numbers. */
const COUNT_UNITS: ReadonlySet<string> = new Set<ProductUnit>(["piece"]);

export function isCountUnit(unit: string | undefined): boolean {
  return unit !== undefined && COUNT_UNITS.has(unit);
}

/** Drops everything from the decimal point onward ("12.50" → "12"). */
export function toWholeQuantity(value: string): string {
  return value.split(".")[0] ?? "";
}

/**
 * Sanitises raw keyboard input for a quantity field: digits only, at most
 * one decimal point, and no decimal point at all for count units.
 */
export function cleanQuantityInput(raw: string, unit: string | undefined): string {
  const digitsAndDots = raw.replace(/[^0-9.]/g, "");
  if (isCountUnit(unit)) return digitsAndDots.replace(/\./g, "");
  return digitsAndDots.replace(/(\..*)\./g, "$1");
}
