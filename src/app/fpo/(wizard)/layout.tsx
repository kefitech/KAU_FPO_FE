import "@/app/globals.css";
import Link from "next/link";

import { Leaf } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function FpoWizardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b bg-card px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-medium text-sm">
          <div className="flex size-6 items-center justify-center rounded-md bg-green-600 text-white">
            <Leaf className="size-4" />
          </div>
          KAU-FPO Platform
        </Link>
        <ThemeToggle />
      </header>
      {children}
    </div>
  );
}
