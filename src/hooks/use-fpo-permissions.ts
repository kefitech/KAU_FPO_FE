import { useQuery } from "@tanstack/react-query";

import { authApi } from "@/lib/api/auth";
import { useLocaleStore } from "@/stores/locale-store";

/** FPO action codes checked in the UI (backend FPOAction, seeded by scripts/seed_fpo_permissions.py). */
export type FpoPermission =
  | "can_edit_tier_assessment"
  | "can_manage_products"
  | "can_book_experts"
  | "can_generate_recommendations"
  | "can_generate_business_plan";

/**
 * What the logged-in FPO user may do. The primary user can do everything; a team member
 * only what the primary granted within the super admin's role ceiling (returned in
 * /auth/me `fpo_access.actions`). Shares the ["auth-me", locale] query the layouts fetch.
 *
 * `can()` is false until /auth/me has loaded, so edit controls never flash up for members.
 */
export function useFpoPermissions() {
  const locale = useLocaleStore((s) => s.locale);
  const { data, isLoading } = useQuery({
    queryKey: ["auth-me", locale],
    queryFn: authApi.me,
    // Always re-check on page load / window focus, so permission changes made by the
    // primary user show up without logging out (the layouts keep a 5-minute cache).
    staleTime: 0,
  });

  const isPrimary = data?.user?.role === "primary";
  const actions = data?.fpo_access?.actions ?? {};

  return {
    isLoading,
    isPrimary,
    can: (permission: FpoPermission) => isPrimary || actions[permission] === true,
  };
}
