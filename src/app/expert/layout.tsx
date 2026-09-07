"use client";
import "@/app/globals.css";

import { DynamicSidebar } from "@/components/layout/dynamic-sidebar";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { expertNavigationConfig } from "@/config/navigation-defaults";
import { usePortalNavigation } from "@/hooks/use-navigation";
import { useLocaleStore } from "@/stores/locale-store";

export default function ExpertLayout({ children }: { children: React.ReactNode }) {
  const { data: navConfig } = usePortalNavigation(
    "expert" as Parameters<typeof usePortalNavigation>[0],
  );
  const locale = useLocaleStore((state) => state.locale);

  const config = navConfig ?? expertNavigationConfig;

  return (
    <SidebarProvider>
      <DynamicSidebar config={config} locale={locale} />
      <SidebarInset>
        <div className="flex items-center justify-between border-b px-4 py-2">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
        <div className="p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}