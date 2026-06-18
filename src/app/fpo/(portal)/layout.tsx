"use client";

import { DynamicSidebar } from "@/components/layout/dynamic-sidebar";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { fpoNavigationConfig } from "@/config/navigation-defaults";
import { useLocaleStore } from "@/stores/locale-store";

export default function FpoPortalLayout({ children }: { children: React.ReactNode }) {
  const locale = useLocaleStore((state) => state.locale);

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
