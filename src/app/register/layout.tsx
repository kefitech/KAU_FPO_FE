import "@/app/globals.css";
import Link from "next/link";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-background dark:via-background dark:to-background">
      <header className="flex items-center justify-between border-b bg-background/80 px-4 sm:px-6 py-3 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2 font-medium text-sm">
          <img src="/assets/img/logo.png" alt="KAU" className="h-7 w-auto" />
          <span className="hidden sm:inline">KAU-FPO Platform</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-muted-foreground text-sm">
            <span className="hidden sm:inline">Already registered? </span>
            <Link href="/v1/login" className="font-medium text-green-600 hover:underline">
              Sign in
            </Link>
          </span>
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </header>
      {children}
    </div>
  );
}
