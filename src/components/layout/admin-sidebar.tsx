"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import { LogOut, Settings } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { authApi } from "@/lib/api/auth";
import { getIcon } from "@/lib/utils/icon-map";
import { useLocaleStore } from "@/stores/locale-store";

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted font-semibold text-muted-foreground text-xs">
      {initials}
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const locale = useLocaleStore((s) => s.locale);
  const { setOpenMobile, isMobile } = useSidebar();

  const closeMobile = () => { if (isMobile) setOpenMobile(false); };

  const { data, isLoading } = useQuery({
    queryKey: ["auth-me", locale],
    queryFn: authApi.me,
    staleTime: 5 * 60 * 1000,
  });

  const menuItems = data?.menu ?? [];
  const user = data?.user;
  const fullName = user ? `${user.first_name} ${user.last_name ?? ""}`.trim() : "";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-border/50 border-b pb-3">
        <div className="flex items-center gap-2.5 px-2 pt-1">
          <img src="/assets/img/logo.png" alt="KAU" className="h-8 w-auto shrink-0 dark:hidden" />
          <img src="/assets/img/logo-light.png" alt="KAU" className="h-8 w-auto shrink-0 hidden dark:block" />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-semibold text-sm leading-tight tracking-tight">KAU-FPO</span>
            <span className="text-[11px] text-muted-foreground">Admin Portal</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-semibold text-[10px] text-muted-foreground/60 uppercase tracking-widest group-data-[collapsible=icon]:hidden">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <SidebarMenuItem key={i}>
                      <div className="flex items-center gap-2.5 px-2 py-1.5">
                        <Skeleton className="h-4 w-4 shrink-0 rounded" />
                        <Skeleton className="h-3.5 w-24 group-data-[collapsible=icon]:hidden" />
                      </div>
                    </SidebarMenuItem>
                  ))
                : menuItems.map((item) => {
                    const Icon = getIcon(item.icon);
                    const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className={isActive ? "!bg-slate-800 !text-white dark:!bg-slate-700 dark:!text-white" : ""}
                        >
                          <Link href={item.path} onClick={closeMobile}>
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="text-sm group-data-[collapsible=icon]:hidden">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-border/50 border-t pt-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith("/admin/settings")}
              className={pathname.startsWith("/admin/settings") ? "!bg-slate-800 !text-white dark:!bg-slate-700 dark:!text-white" : ""}
            >
              <Link href="/admin/settings/profile" onClick={closeMobile}>
                <Settings className="h-4 w-4 shrink-0" />
                <span className="text-sm group-data-[collapsible=icon]:hidden">Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => logout()}
              className="text-muted-foreground hover:bg-destructive/8 hover:text-destructive"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="text-sm group-data-[collapsible=icon]:hidden">Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarSeparator className="mt-1" />
        {isLoading ? (
          <div className="flex items-center gap-2.5 px-2 py-2 group-data-[collapsible=icon]:justify-center">
            <Skeleton className="h-7 w-7 shrink-0 rounded-md" />
            <div className="flex flex-col gap-1.5 group-data-[collapsible=icon]:hidden">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2.5 w-32" />
            </div>
          </div>
        ) : fullName ? (
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith("/admin/settings")}>
              <Link
                href="/admin/settings/profile"
                className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center"
              >
                <UserAvatar name={fullName} />
                <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-medium text-xs leading-tight">{fullName}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{user?.email}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
