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
import { buyerNavigationConfig } from "@/config/navigation-defaults";
import { authApi } from "@/lib/api/auth";
import { resolveBuyerRedirectPath } from "@/lib/buyer-redirect";
import { useAuthStore } from "@/stores/auth-store";
import { useLocaleStore } from "@/stores/locale-store";

export default function BuyerPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocaleStore((state) => state.locale);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const buyerRedirect = useAuthStore((s) => s.buyerRedirect);
  const setBuyerRedirect = useAuthStore((s) => s.setBuyerRedirect);
  const [mounted, setMounted] = useState(false);
  const [checkedFresh, setCheckedFresh] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    authApi
      .me()
      .then((res) => {
        // Assumes /api/auth/me/ is extended to return buyer_redirect for buyer accounts
        setBuyerRedirect(res.buyer_redirect ?? null);
      })
      .finally(() => setCheckedFresh(true));
  }, [
    mounted,
    isAuthenticated, // Assumes /api/auth/me/ is extended to return buyer_redirect for buyer accounts
    setBuyerRedirect,
  ]);

  useEffect(() => {
    if (!mounted || !checkedFresh) return;
    if (!isAuthenticated) {
      router.replace(`/v1/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (buyerRedirect && buyerRedirect.status !== "verified") {
      router.replace(resolveBuyerRedirectPath(buyerRedirect));
    }
  }, [mounted, checkedFresh, isAuthenticated, buyerRedirect, pathname, router]);

  if (!mounted || !checkedFresh || !isAuthenticated) {
    return null;
  }

  if (buyerRedirect && buyerRedirect.status !== "verified") {
    return null;
  }

  return (
    <SidebarProvider>
      <DynamicSidebar config={buyerNavigationConfig} locale={locale} />
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
