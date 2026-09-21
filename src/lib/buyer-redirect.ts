import type { BuyerRedirect } from "@/types/auth";

export function resolveBuyerRedirectPath(redirect: BuyerRedirect | null): string {
  if (!redirect) return "/buyer/pending";
  switch (redirect.status) {
    case "verified":
      return "/buyer/dashboard";
    case "pending":
      return "/buyer/pending";
    case "rejected":
      return "/buyer/rejected";
    default:
      return "/buyer/pending";
  }
}
