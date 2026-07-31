"use client";

import { useEffect, useState } from "react";

import { VantaBirds } from "@/components/common/vanta-birds";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { LoginForm } from "../../_components/login-form";

export default function LoginV1() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<Record<string, string>>({});
  const [translationsLoading, setTranslationsLoading] = useState(true);


  useEffect(() => {
    if (!locale) return;
    translationsApi.getPublic(locale, "login").then((data) => {
      setTranslationsLoading(true);
      setT(data.login ?? {});
    })
     .catch(() => undefined)
     .finally(() => setTranslationsLoading(false));
  }, [locale]);

  if (translationsLoading) {
    return (
      <div className="relative flex h-svh items-center justify-center overflow-hidden p-4">
        <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/80 dark:bg-neutral-900/90 p-5 sm:p-8 shadow-xl backdrop-blur-md flex flex-col gap-5 sm:gap-6 animate-pulse">
          <div className="h-12 w-32 rounded bg-neutral-300/60 dark:bg-neutral-700/60" />
          <div className="h-7 w-2/3 rounded bg-neutral-300/60 dark:bg-neutral-700/60" />
          <div className="h-4 w-1/2 rounded bg-neutral-300/60 dark:bg-neutral-700/60" />
          <div className="h-40 w-full rounded bg-neutral-300/40 dark:bg-neutral-700/40" />
        </div>
      </div>
    );
  }
 
  return (
    <div
      className="relative flex h-svh items-center justify-center overflow-hidden p-4"
      style={{ backgroundImage: "url('/assets/img/background/background.png')", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      {/* Vanta Birds animation background */}
      <VantaBirds />

      {/* Top-right controls */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full bg-white/70 dark:bg-white/10 px-3 py-1.5 shadow backdrop-blur-sm">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/80 dark:bg-neutral-900/90 p-5 sm:p-8 shadow-xl backdrop-blur-md flex flex-col gap-5 sm:gap-6">
        <a href="/" className="flex items-center gap-2 font-medium">
          <img src="/assets/img/logo.png" alt="KAU" className="h-12 w-auto" />
          KAU-FPO Platform
        </a>

        <div className="flex flex-col gap-1">
          <h1 className="font-bold text-2xl">{t.title ?? "Login to your account"}</h1>
          <p className="text-muted-foreground text-sm">{t.subtitle ?? "Enter your email below to login to your account"}</p>
        </div>

        <LoginForm t={t} />

        <p className="text-center text-muted-foreground text-sm">
          {t.no_account ?? "Don't have an account?"}{" "}
          <a href="/register" className="underline underline-offset-4 hover:text-foreground">
            {t.sign_up ?? "Sign up"}
          </a>
        </p>

        <a href="/" className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {t.back_to_home ?? "← Back to Home"}
        </a>
      </div>
    </div>
  );
}
