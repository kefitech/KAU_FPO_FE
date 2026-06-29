import Link from "next/link";

import { ChangePasswordForm } from "@/app/(auth)/_components/change-password-form";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function ChangePasswordPage() {
  return (
    <div
      className="relative flex h-svh items-center justify-center overflow-hidden p-4"
      style={{ backgroundImage: "url('/assets/img/background/background.png')", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      {/* Dark mode overlay */}
      <div className="absolute inset-0 hidden dark:block bg-black/70" />

      {/* Top-right controls */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full bg-white/70 dark:bg-white/10 px-3 py-1.5 shadow backdrop-blur-sm">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/80 dark:bg-neutral-900/90 p-8 shadow-xl backdrop-blur-md flex flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 font-medium">
          <img src="/assets/img/logo.png" alt="KAU" className="h-8 w-auto" />
          KAU-FPO Platform
        </Link>

        <div className="flex flex-col gap-1">
          <h1 className="font-bold text-2xl">Set a new password</h1>
          <p className="text-muted-foreground text-sm">
            Your account requires a password change before you can continue. Choose a strong password you haven't used
            before.
          </p>
        </div>

        <ChangePasswordForm />

        <a href="/" className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Home
        </a>
      </div>
    </div>
  );
}
