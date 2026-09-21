import type { BuyerRedirect } from "@/types/auth";

// /buyer/status is the single page that handles both pending and rejected
// verification states — no /buyer/pending or /buyer/rejected route exists.
// Arunima's original resolver pointed at those non-existent paths, so a
// pending buyer landed nowhere (Next.js 404 + stale (portal) layout kept
// them at /buyer/dashboard). Fixed 2026-09-21.
export function resolveBuyerRedirectPath(redirect: BuyerRedirect | null): string {
  if (!redirect) return "/buyer/status";
  switch (redirect.status) {
    case "verified":
      return "/buyer/dashboard";
    case "pending":
    case "rejected":
      return "/buyer/status";
    default:
      return "/buyer/status";
  }
}
