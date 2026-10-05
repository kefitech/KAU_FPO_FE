"use client";

import { RoleMenuSidebar } from "@/components/layout/role-menu-sidebar";
import { useAuthStore } from "@/stores/auth-store";

export function AdminSidebar() {
  const isSubAdmin = useAuthStore((s) => s.user?.role === "sub_admin");

  return (
    <RoleMenuSidebar
      title="KAU-FPO"
      subtitle={isSubAdmin ? "Sub-Admin Portal" : "Admin Portal"}
      settingsHref="/admin/settings/profile"
    />
  );
}
