"use client";

import Link from "next/link";

import { Leaf } from "lucide-react";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600">
            <Leaf className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-bold text-green-700 text-sm">KAU-FPO</span>
            <span className="text-muted-foreground text-xs">Platform</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="#features" className="text-muted-foreground text-sm transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="#portals" className="text-muted-foreground text-sm transition-colors hover:text-foreground">
            Portals
          </Link>
          <Link href="#about" className="text-muted-foreground text-sm transition-colors hover:text-foreground">
            About
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/v1/login">Login</Link>
          </Button>
          <Button size="sm" className="bg-green-600 hover:bg-green-700" asChild>
            <Link href="/v1/register">Register FPO</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
