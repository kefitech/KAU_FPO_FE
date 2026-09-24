"use client";

import { useEffect, useState } from "react";

import { usePathname, useRouter } from "next/navigation";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { NotificationBell } from "@/components/layout/notification-bell";
import { RoleMenuSidebar } from "@/components/layout/role-menu-sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Shell for role portals (CBBO, Government, Expert) — same auth guard, header and
 * backend-driven sidebar as the FPO portal layout, minus the FPO registration-stage redirect.
 */
export function RolePortalLayout({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.replace(`/v1/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [mounted, isAuthenticated, pathname, router]);

  if (!mounted || !isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <RoleMenuSidebar title="KAU-FPO" subtitle={subtitle} />
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1 cursor-pointer" />
          <Separator orientation="vertical" className="h-4" />
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </header>
        {children}
        <ConfirmDialog />
      </SidebarInset>
    </SidebarProvider>
  );
}
