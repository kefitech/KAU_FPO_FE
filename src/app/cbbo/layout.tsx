"use client";

import "@/app/globals.css";

import { DynamicSidebar } from "@/components/layout/dynamic-sidebar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cbboNavigationConfig } from "@/config/navigation-defaults";
import { usePortalNavigation } from "@/hooks/use-navigation";
import { useLocaleStore } from "@/stores/locale-store";

export default function CbboLayout({ children }: { children: React.ReactNode }) {
  const { data: navConfig, isLoading, isError } = usePortalNavigation("cbbo");
  const locale = useLocaleStore((state) => state.locale);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  const config = navConfig ?? (isError ? cbboNavigationConfig : undefined);

  if (!config) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <DynamicSidebar config={config} locale={locale} />
      <SidebarInset>{children}</SidebarInset>
      <ConfirmDialog />
    </SidebarProvider>
  );
}
