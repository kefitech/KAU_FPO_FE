"use client";

import "@/app/globals.css";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { RoleMenuSidebar } from "@/components/layout/role-menu-sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function CbboLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <RoleMenuSidebar title="KAU-FPO" subtitle="CBBO/NGO Portal" />
      <SidebarInset>
        <div className="flex items-center justify-between border-b px-4 py-2">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
        {children}
      </SidebarInset>
      <ConfirmDialog />
    </SidebarProvider>
  );
}
