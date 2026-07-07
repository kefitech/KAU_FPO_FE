"use client";

import "@/app/globals.css";
import Link from "next/link";

import { Leaf, LogOut } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function FpoWizardLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b bg-card px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-medium text-sm">
          <div className="flex size-6 items-center justify-center rounded-md bg-green-600 text-white">
            <Leaf className="size-4" />
          </div>
          KAU-FPO Platform
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => logout()}
          >
            <LogOut className="mr-1.5 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>
      {children}
    </div>
  );
}
