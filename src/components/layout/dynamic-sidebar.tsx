"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { getIcon } from "@/lib/utils/icon-map";
import { useAuthStore } from "@/stores/auth-store";
import type { MenuItem, NavigationConfig } from "@/types/navigation";

interface DynamicSidebarProps {
  config: NavigationConfig;
  locale?: string;
}

function MenuItemComponent({
  item,
  pathname,
  locale = "en",
}: {
  item: MenuItem;
  pathname: string;
  locale?: string;
}) {
  const { logout } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const Icon = getIcon(item.icon);
  const title = item.translations?.[locale] ?? item.title;
  const isActive = pathname === item.url || pathname.startsWith(`${item.url}/`);

  function closeMobile() {
    if (isMobile) setOpenMobile(false);
  }

  if (item.id === "logout") {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton onClick={() => { closeMobile(); logout(); }}>
          <Icon className="h-4 w-4 shrink-0" />
          <span className="text-sm group-data-[collapsible=icon]:hidden">{title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  if (item.children && item.children.length > 0) {
    return (
      <Collapsible asChild defaultOpen={isActive}>
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-sm group-data-[collapsible=icon]:hidden">{title}</span>
              <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:hidden group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.children.map((child) => {
                const ChildIcon = getIcon(child.icon);
                const childTitle = child.translations?.[locale] ?? child.title;
                const isChildActive = pathname === child.url;

                return (
                  <SidebarMenuSubItem key={child.id}>
                    <SidebarMenuSubButton asChild isActive={isChildActive}>
                      <Link href={child.url} onClick={closeMobile}>
                        <ChildIcon className="h-3.5 w-3.5" />
                        <span className="text-sm">{childTitle}</span>
                        {child.badge && (
                          <Badge variant="secondary" className="ml-auto text-[10px]">
                            {child.badge}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link href={item.url} onClick={closeMobile}>
          <Icon className="h-4 w-4 shrink-0" />
          <span className="text-sm group-data-[collapsible=icon]:hidden">{title}</span>
          {item.badge && (
            <Badge variant="secondary" className="ml-auto text-[10px]">
              {item.badge}
            </Badge>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function DynamicSidebar({ config, locale = "en" }: DynamicSidebarProps) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "super_admin";
  const LogoIcon = getIcon(config.logo.icon);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-border/50 border-b pb-3">
        <div className="flex items-center gap-2.5 px-2 pt-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary">
            <LogoIcon className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-semibold text-sm leading-tight tracking-tight">{config.logo.title}</span>
            <span className="text-[11px] text-muted-foreground">{config.logo.subtitle}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {config.groups.map((group) => {
          const groupLabel = group.translations?.[locale] ?? group.label;

          return (
            <SidebarGroup key={group.id}>
              <SidebarGroupLabel className="font-semibold text-[10px] text-muted-foreground/60 uppercase tracking-widest group-data-[collapsible=icon]:hidden">
                {groupLabel}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <MenuItemComponent key={item.id} item={item} pathname={pathname} locale={locale} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-border/50 border-t pt-2">
        <SidebarMenu>
          {config.footerItems
            .filter((item) => item.id !== "settings" || isSuperAdmin)
            .map((item) => (
              <MenuItemComponent key={item.id} item={item} pathname={pathname} locale={locale} />
            ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
