"use client";

import "@/app/globals.css";

import { useEffect, useRef, useState } from "react";

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
import { useAuthStore } from "@/stores/auth-store";

const STRUCTURAL_PARENT_OVERRIDES: Record<string, string> = {
  "/admin/notification-templates": "/admin/notifications?tab=templates",
  "/admin/notification-template-codes": "/admin/notifications?tab=codes",
  "/admin/notification-channel-settings": "/admin/notifications?tab=channels",
};

function getStructuralParent(pathname: string): string {
  const clean = pathname.split("?")[0];
  const segments = clean.split("/").filter(Boolean);
  if (segments.length <= 2) return "/admin/dashboard";
  segments.pop();
  const parent = "/" + segments.join("/");
  return STRUCTURAL_PARENT_OVERRIDES[parent] ?? parent;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [mounted, setMounted] = useState(false);

  const navHistoryRef = useRef<string[]>([]);
  const isPoppingRef = useRef(false);

  const { showWarning, secondsLeft, extendSession } = useSessionTimeout({
    onExpire: () => logout(),
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.replace(`/v1/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [mounted, isAuthenticated, pathname, router]);

  useEffect(() => {
    if (isPoppingRef.current) {
      isPoppingRef.current = false;
      return;
    }
    const stack = navHistoryRef.current;
    const lastEntry = stack[stack.length - 1];

    // Strip the /new entry when the user navigates away from a /new page
    if (lastEntry?.endsWith("/new") && !pathname.endsWith("/new")) {
      const withoutNew = stack.slice(0, -1);
      if (withoutNew[withoutNew.length - 1] === pathname) {
        navHistoryRef.current = withoutNew;
      } else {
        navHistoryRef.current = [...withoutNew, pathname];
      }
      return;
    }

    // Skip duplicate consecutive entries (e.g. save → redirect back to list page)
    if (lastEntry === pathname) return;

    navHistoryRef.current = [...stack, pathname];
  }, [pathname]);

  function handleBack() {
    const isNewPage = pathname.endsWith("/new");
    if (isNewPage) {
      navHistoryRef.current = navHistoryRef.current.slice(0, -1);
      isPoppingRef.current = true;
      router.push(getStructuralParent(pathname));
      return;
    }

    // Top-level section pages (/admin/X) always go straight to dashboard —
    // don't step through the history stack which may contain stale edit/search entries.
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length <= 2) {
      router.push("/admin/dashboard");
      return;
    }

    const stack = navHistoryRef.current;
    if (stack.length >= 2) {
      const prev = stack[stack.length - 2];
      navHistoryRef.current = stack.slice(0, -1);
      isPoppingRef.current = true;
      router.push(prev);
    } else {
      router.push(getStructuralParent(pathname));
    }
  }

  if (!mounted || !isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <AdminSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background px-3 sm:px-4">
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
          <div className="flex-1 min-w-0 overflow-hidden">
            <AdminBreadcrumb />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <NetworkStatus />
            <span className="hidden md:flex items-center gap-3">
              <LiveClock />
              <Separator orientation="vertical" className="h-4" />
            </span>
            <NotificationBell />
            <span>
              <LocaleSwitcher />
            </span>
            <ThemeToggle />
          </div>
        </header>

        {pathname !== "/admin/dashboard" && (
          <div className="mx-auto w-full max-w-[1440px] px-3 sm:px-6 lg:px-8 pt-4">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 gap-1 text-muted-foreground hover:text-foreground"
              onClick={handleBack}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        )}

        <div className="mx-auto w-full max-w-[1440px] px-3 sm:px-6 lg:px-8">{children}</div>
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
