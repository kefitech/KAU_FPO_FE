"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { ArrowRight, ChevronLeft, Sprout, UserPlus } from "lucide-react";

import { VantaBirds } from "@/components/common/vanta-birds";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { LoginForm } from "../../_components/login-form";

export default function LoginV1() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<Record<string, string>>({});
  const [translationsLoading, setTranslationsLoading] = useState(true);
  const effectiveLocale = locale || "en";

  useEffect(() => {
    setTranslationsLoading(true);
    translationsApi
      .getPublic(effectiveLocale, "login")
      .then((data) => {
        setT(data.login ?? {});
      })
      .catch(() => undefined)
      .finally(() => setTranslationsLoading(false));
  }, [effectiveLocale]);

  if (translationsLoading) {
    return (
      <div className="relative flex h-svh items-center justify-center overflow-hidden p-4">
        <div className="relative z-10 w-full max-w-sm md:max-w-4xl animate-pulse rounded-2xl bg-white/80 p-8 shadow-xl backdrop-blur-md dark:bg-neutral-900/90">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-5">
              <div className="h-12 w-40 rounded bg-neutral-300/60 dark:bg-neutral-700/60" />
              <div className="h-6 w-2/3 rounded bg-neutral-300/60 dark:bg-neutral-700/60" />
              <div className="h-4 w-1/2 rounded bg-neutral-300/60 dark:bg-neutral-700/60" />
              <div className="h-40 w-full rounded bg-neutral-300/40 dark:bg-neutral-700/40" />
            </div>
            <div className="hidden h-64 rounded bg-neutral-300/40 md:block dark:bg-neutral-700/40" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-svh items-center justify-center overflow-hidden p-4 sm:p-6"
      style={{
        backgroundImage: "url('/assets/img/background/background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Vanta Birds animation background */}
      <VantaBirds />

      {/* Top-right controls */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 shadow backdrop-blur-sm dark:bg-white/10">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-sm md:max-w-4xl">
        <Card className="overflow-hidden border-0 p-0 shadow-2xl backdrop-blur-md bg-white/85 dark:bg-neutral-900/90">
          <CardContent className="grid p-0 md:grid-cols-2">
            {/* ── LEFT: login form ─────────────────────────────────────── */}
            <div className="flex flex-col gap-5 p-6 sm:gap-6 sm:p-8">
              <a href="/" className="flex items-center gap-2 font-medium">
                <img src="/assets/img/logo.png" alt="KAU" className="h-12 w-auto" />
                <span>KAU-FPO Platform</span>
              </a>

              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold">
                  {t.title ?? "Login to your account"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t.subtitle ?? "Enter your email below to login to your account"}
                </p>
              </div>

              <LoginForm t={t} />

              {/* Mobile-only sign-up call-out — the right panel is hidden below md */}
              <div className="md:hidden">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/register">
                    <UserPlus className="mr-2 h-4 w-4" />
                    {t.sign_up_cta ?? "Create a new account"}
                  </Link>
                </Button>
              </div>

              <Link
                href="/"
                className="flex items-center justify-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                {t.back_to_home ?? "Back to Home"}
              </Link>
            </div>

            {/* ── RIGHT: sign-up call to action (desktop only) ─────────── */}
            {/* Cream / off-white academic panel — KAU logo as an oversized
                translucent watermark, dark slate typography, solid dark
                button. Institutional feel without competing with the app's
                primary green. */}
            <div className="relative hidden md:flex md:flex-col md:items-start md:justify-between md:gap-6 md:overflow-hidden md:p-8">
              {/* Cream base */}
              <div className="absolute inset-0 bg-[#f7f3ea] dark:bg-neutral-800" />
              {/* Oversized logo watermark, bottom-right corner */}
              <img
                src="/assets/img/logo.png"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -bottom-16 h-80 w-80 opacity-[0.08] select-none dark:opacity-[0.06]"
              />
              {/* Thin brand accent bar down the left edge */}
              <div className="absolute inset-y-0 left-0 w-1 bg-emerald-700/70 dark:bg-emerald-500/60" />

              <div className="relative flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-800 dark:text-emerald-300">
                <Sprout className="h-4 w-4" />
                {t.new_here ?? "New to KAU-FPO"}
              </div>

              <div className="relative flex flex-col gap-3">
                <h2 className="text-2xl font-bold leading-tight text-slate-900 dark:text-neutral-100">
                  {t.sign_up_headline ?? "Register your FPO in a few simple steps"}
                </h2>
                <p className="text-sm text-slate-600 dark:text-neutral-300">
                  {t.sign_up_subtext ??
                    "Join Kerala's official FPO platform to access training, schemes, market linkages and Detailed Project Reports."}
                </p>
              </div>

              <Button
                asChild
                size="lg"
                className="relative w-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-neutral-100 dark:text-slate-900 dark:hover:bg-white"
              >
                <Link href="/register">
                  <UserPlus className="mr-2 h-5 w-5" />
                  {t.sign_up_cta ?? "Create a new account"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
