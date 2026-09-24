import { useQuery } from "@tanstack/react-query";

import { authApi } from "@/lib/api/auth";
import { useLocaleStore } from "@/stores/locale-store";

/** Sub-admin permission codenames a super admin can grant (backend SUB_ADMIN_PERMISSIONS). */
export type SubAdminPermission =
  | "can_approve_fpo"
  | "can_view_all_fpos"
  | "can_request_info"
  | "can_verify_documents"
  | "can_generate_reports";

/**
 * What the logged-in admin may do. Super admins can do everything; sub-admins only
 * what was granted to them (returned in /auth/me `user.permissions`).
 * Shares the ["auth-me", locale] query the sidebar already fetches.
 */
export function useAdminPermissions() {
  const locale = useLocaleStore((s) => s.locale);
  const { data } = useQuery({
    queryKey: ["auth-me", locale],
    queryFn: authApi.me,
    staleTime: 5 * 60 * 1000,
  });

  const user = data?.user;
  const isSuperAdmin = user?.role === "super_admin";
  const granted = new Set(user?.permissions ?? []);

  return {
    isSuperAdmin,
    can: (permission: SubAdminPermission) => isSuperAdmin || granted.has("*") || granted.has(permission),
  };
}
