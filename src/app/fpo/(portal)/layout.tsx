"use client";

import "@/app/globals.css";
import { useEffect, useState } from "react";

import { usePathname, useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { NotificationBell } from "@/components/layout/notification-bell";
import { RoleMenuSidebar } from "@/components/layout/role-menu-sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { authApi } from "@/lib/api/auth";
import { resolvePostLoginPath } from "@/lib/fpo-redirect";
import { useAuthStore } from "@/stores/auth-store";
import { useLocaleStore } from "@/stores/locale-store";

export default function FpoPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocaleStore((state) => state.locale);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const fpoRedirect = useAuthStore((s) => s.fpoRedirect);
  const setFpoRedirect = useAuthStore((s) => s.setFpoRedirect);
  const [mounted, setMounted] = useState(false);
  const [checkedFresh, setCheckedFresh] = useState(false);

  // The guard below must decide on a fresh /auth/me answer. A cached copy can
  // carry an outdated redirect stage (e.g. "status" from a portal visit before
  // the application was approved), which bounced "Go to Dashboard" back to
  // /fpo/status until a hard refresh. staleTime 0 makes this observer refetch
  // when it becomes enabled, and isFetchedAfterMount ignores the cached copy.
  // Other ["auth-me", locale] users keep their own 5-minute staleTime.
  const { data, isFetchedAfterMount } = useQuery({
    queryKey: ["auth-me", locale],
    queryFn: authApi.me,
    staleTime: 0,
    enabled: mounted && isAuthenticated,
  });

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!isFetchedAfterMount) return;
    setFpoRedirect(data?.redirect ?? null);
    setCheckedFresh(true);
  }, [isFetchedAfterMount, data, setFpoRedirect]);
  useEffect(() => {
    if (!mounted || !checkedFresh) return;
    if (!isAuthenticated) {
      router.replace(`/v1/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (fpoRedirect && fpoRedirect.stage !== "dashboard") {
      router.replace(resolvePostLoginPath(fpoRedirect));
    }
  }, [mounted, checkedFresh, isAuthenticated, fpoRedirect, pathname, router]);

  if (!mounted || !checkedFresh || !isAuthenticated) {
    return null;
  }

  if (fpoRedirect && fpoRedirect.stage !== "dashboard") {
    return null;
  }

  return (
    <SidebarProvider>
      <RoleMenuSidebar title="KAU-FPO" subtitle="FPO Portal" />
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
