"use client";

import { useRouter } from "next/navigation";

import Link from "next/link";

import { LayoutDashboard, MoveLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function FpoNotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-[70vh] flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <span className="select-none font-bold text-8xl text-muted-foreground/20 tracking-tight">404</span>
        <h1 className="font-semibold text-xl">Page not found</h1>
        <p className="max-w-sm text-muted-foreground text-sm">
          The page you're looking for doesn't exist or you don't have access to it.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <MoveLeft className="mr-1.5 h-4 w-4" />
          Go back
        </Button>
        <Button size="sm" asChild>
          <Link href="/fpo/dashboard">
            <LayoutDashboard className="mr-1.5 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
