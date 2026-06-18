"use client";

import { useEffect } from "react";

import Link from "next/link";

import { AlertTriangle, LayoutDashboard, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface AdminErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: AdminErrorProps) {
  useEffect(() => {
    console.error("[AdminError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <h1 className="font-semibold text-xl">Something went wrong</h1>
        <p className="max-w-sm text-muted-foreground text-sm">
          An unexpected error occurred. You can try again or return to the dashboard.
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-[11px] text-muted-foreground/60">Error ID: {error.digest}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={reset}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Try again
        </Button>
        <Button size="sm" asChild>
          <Link href="/admin/dashboard">
            <LayoutDashboard className="mr-1.5 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
