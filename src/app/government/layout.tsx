"use client";

import "@/app/globals.css";
import { DynamicSidebar } from "@/components/layout/dynamic-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { usePortalNavigation } from "@/hooks/use-navigation";
import { useLocaleStore } from "@/stores/locale-store";

export default function GovernmentLayout({ children }: { children: React.ReactNode }) {
  const { data: navConfig, isLoading } = usePortalNavigation("government");
  const locale = useLocaleStore((state) => state.locale);

  if (isLoading || !navConfig) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <DynamicSidebar config={navConfig} locale={locale} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
