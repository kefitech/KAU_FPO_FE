/**
 * Scheme "Valid till" helpers (backend field: Scheme.deadline, a YYYY-MM-DD date).
 * A scheme is auto-deactivated a few days after this date (SubAdminConfig
 * scheme_expiry_days), so FPOs can briefly see an expired one.
 */

/** Days before the end date that a scheme counts as "closing soon". */
const CLOSING_SOON_DAYS = 7;

/** Today as YYYY-MM-DD in the browser's timezone — for <input type="date" min> and comparisons. */
export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export type SchemeValidity = "open" | "closing_soon" | "expired";

/** null when the scheme has no end date. */
export function schemeValidity(validTill: string | null | undefined): SchemeValidity | null {
  if (!validTill) return null;
  const today = todayIso();
  if (validTill < today) return "expired";
  const daysLeft = (Date.parse(validTill) - Date.parse(today)) / 86_400_000;
  return daysLeft <= CLOSING_SOON_DAYS ? "closing_soon" : "open";
}

/** "15 Nov 2026" */
export function formatSchemeDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
