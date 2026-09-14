import type { BuyerRedirect } from "@/types/auth";

export function resolveBuyerRedirectPath(redirect: BuyerRedirect | null): string {
  if (!redirect) return "/buyer/status";
  switch (redirect.status) {
    case "verified":
      return "/buyer/dashboard";
    case "pending":
    case "rejected":
    default:
      return "/buyer/status";
  }
}
