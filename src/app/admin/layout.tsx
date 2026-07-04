"use client";

import "@/app/globals.css";

import { usePathname, useRouter } from "next/navigation";

import { ChevronLeft } from "lucide-react";

import { AdminBreadcrumb } from "@/components/layout/admin-breadcrumb";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { LiveClock } from "@/components/layout/live-clock";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { NetworkStatus } from "@/components/layout/network-status";
import { NotificationBell } from "@/components/layout/notification-bell";
import { SessionTimeoutDialog } from "@/components/layout/session-timeout-dialog";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useSessionTimeout } from "@/hooks/use-session-timeout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();

  const { showWarning, secondsLeft, extendSession } = useSessionTimeout({
    onExpire: () => logout(),
  });

  return (
    <SidebarProvider defaultOpen={false}>
      <AdminSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-15 items-center gap-2 border-b bg-background px-4">
          <TooltipProvider delayDuration={500}>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarTrigger className="-ml-1 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Toggle sidebar <kbd className="ml-1 rounded border px-1 py-0.5 font-mono text-xs">Ctrl+B</kbd>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Separator orientation="vertical" className="h-4" />
          <AdminBreadcrumb />
          <div className="ml-auto flex items-center gap-3">
            <NetworkStatus />
            <LiveClock />
            <Separator orientation="vertical" className="h-4" />
            <NotificationBell />
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </header>

        {pathname !== "/admin/dashboard" && (
          <div className="mx-auto w-full max-w-[1440px] px-8 pt-4">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => router.back()}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        )}

        <div className="mx-auto w-full max-w-[1440px]">{children}</div>
      </SidebarInset>
      <ConfirmDialog />
      <SessionTimeoutDialog
        open={showWarning}
        secondsLeft={secondsLeft}
        onStay={extendSession}
        onLogout={() => logout()}
      />
    </SidebarProvider>
  );
}
