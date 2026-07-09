"use client";

import "@/app/globals.css";
import { useEffect, useState } from "react";

import { usePathname, useRouter } from "next/navigation";

import { DynamicSidebar } from "@/components/layout/dynamic-sidebar";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { fpoNavigationConfig } from "@/config/navigation-defaults";
import { useAuthStore } from "@/stores/auth-store";
import { useLocaleStore } from "@/stores/locale-store";

export default function FpoPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocaleStore((state) => state.locale);
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
      <DynamicSidebar config={fpoNavigationConfig} locale={locale} />
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
