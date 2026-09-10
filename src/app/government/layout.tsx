"use client";

import "@/app/globals.css";
import { RoleMenuSidebar } from "@/components/layout/role-menu-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function GovernmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <RoleMenuSidebar title="KAU-FPO" subtitle="Government Portal" />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
