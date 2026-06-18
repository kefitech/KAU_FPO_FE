import Link from "next/link";

import { Leaf } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-background dark:via-background dark:to-background">
      <header className="flex items-center justify-between border-b bg-background/80 px-6 py-3 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2 font-medium text-sm">
          <div className="flex size-6 items-center justify-center rounded-md bg-green-600 text-white">
            <Leaf className="size-4" />
          </div>
          KAU-FPO Platform
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">
            Already registered?{" "}
            <Link href="/v1/login" className="font-medium text-green-600 hover:underline">
              Sign in
            </Link>
          </span>
          <ThemeToggle />
        </div>
      </header>
      {children}
    </div>
  );
}
