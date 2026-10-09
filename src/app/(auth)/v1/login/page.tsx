"use client";

import { useEffect, useState } from "react";

import { ArrowRight, LogIn, Sprout, UserPlus } from "lucide-react";

import { MobileMenuLogo } from "@/app/(public)/_components/header-logos";
import { VantaBirds } from "@/components/common/vanta-birds";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { LoginForm } from "../../_components/login-form";

// Feed the cursor position to the sign-up panel's spotlight via CSS vars (no re-render)
function trackSpotlight(el: HTMLDivElement | null) {
  if (!el) return;
  const track = (e: PointerEvent) => {
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  };
  el.addEventListener("pointermove", track);
  return () => el.removeEventListener("pointermove", track);
}

// Plain <a> (not next/link) for every link off this page: a client-side hop to a
// public page pulls in its Bootstrap/theme CSS, which then overrides Tailwind here
// when the user comes back.
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
      className="relative flex min-h-dvh items-center justify-center overflow-hidden p-4 sm:p-6"
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

      <div className="fade-in zoom-in-95 relative z-10 w-full max-w-sm animate-in fill-mode-both duration-500 motion-reduce:animate-none md:max-w-4xl">
        <Card className="overflow-hidden border-0 p-0 shadow-2xl backdrop-blur-md bg-white/85 dark:bg-neutral-900/90">
          <CardContent className="grid p-0 md:grid-cols-2">
            {/* ── LEFT: login (already a user) ─────────────────────────── */}
            <div className="fade-in slide-in-from-left-6 flex animate-in flex-col gap-5 fill-mode-both p-6 delay-150 duration-700 motion-reduce:animate-none sm:gap-6 sm:p-8">
              <a href="/" className="flex items-center gap-2 font-medium">
                <MobileMenuLogo className="h-8 w-8 shrink-0 object-contain" />
                <span>KAU-FPO Platform</span>
              </a>

              <div className="flex flex-col gap-1 fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-500 motion-reduce:animate-none delay-300">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-800 dark:text-emerald-300">
                  <LogIn className="h-4 w-4" />
                  {t.existing_user ?? "Already a user? Login"}
                </div>
                <h1 className="text-2xl font-bold">{t.title ?? "Login to your account"}</h1>
                <p className="text-sm text-muted-foreground">
                  {t.subtitle ?? "Enter your email below to login to your account"}
                </p>
              </div>

              <div className="fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-500 motion-reduce:animate-none delay-400">
                <LoginForm t={t} />
              </div>

              {/* Mobile-only registration — the right panel is hidden below md */}
              <div className="flex flex-col gap-2 border-t pt-5 md:hidden">
                <Button asChild variant="outline" className="w-full">
                  <a href="/register">
                    <UserPlus className="mr-2 h-4 w-4" />
                    {t.new_here ?? "New User? Register"}
                  </a>
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  {t.buyer_register_prompt ?? "External buyer?"}{" "}
                  <a href="/register?mode=buyer" className="underline underline-offset-4 hover:text-foreground">
                    {t.register_as_buyer ?? "Buyer Registration"}
                  </a>
                </p>
                <p className="text-center text-sm text-muted-foreground">
                  {t.official_register_prompt ?? "Government or CBBO/NGO official?"}{" "}
                  <a href="/official-register" className="underline underline-offset-4 hover:text-foreground">
                    {t.official_register_link ?? "Register here"}
                  </a>
                </p>
              </div>

              <a
                href="/"
                className="flex items-center justify-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t.back_to_home ?? "← Back to Home"}
              </a>
            </div>

            {/* ── RIGHT: registration (new user, desktop only) ─────────── */}
            {/* Cream / off-white academic panel — logo as an oversized
                translucent watermark, dark slate typography, solid dark
                button. Institutional feel without competing with the app's
                primary green. */}
            <div
              ref={trackSpotlight}
              className="group/panel fade-in slide-in-from-right-6 relative hidden animate-in fill-mode-both delay-300 duration-700 motion-reduce:animate-none md:flex md:flex-col md:items-start md:justify-between md:gap-6 md:overflow-hidden md:p-8"
            >
              {/* Cream base */}
              <div className="absolute inset-0 bg-[#f7f3ea] dark:bg-neutral-800" />
              {/* Soft emerald spotlight that follows the cursor */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/panel:opacity-100 motion-reduce:hidden"
                style={{
                  background:
                    "radial-gradient(320px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(16, 185, 129, 0.14), transparent 70%)",
                }}
              />
              {/* Oversized logo watermark, bottom-right corner */}
              <MobileMenuLogo className="pointer-events-none login-watermark-drift absolute -right-16 -bottom-16 h-80 w-80 object-contain opacity-[0.08] select-none dark:opacity-[0.06]" />
              {/* Thin brand accent bar down the left edge */}
              <div className="login-accent-grow absolute inset-y-0 left-0 w-1 bg-emerald-700/70 dark:bg-emerald-500/60" />

              <div className="relative flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-800 dark:text-emerald-300 fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-500 motion-reduce:animate-none delay-500">
                <Sprout className="login-sprout-sway h-4 w-4" />
                {t.new_here ?? "New User? Register"}
              </div>

              <div className="relative flex flex-col gap-3 fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-500 motion-reduce:animate-none delay-600">
                <h2 className="text-2xl font-bold leading-tight text-slate-900 dark:text-neutral-100">
                  {t.sign_up_headline ?? "Register your FPO in a few simple steps"}
                </h2>
                <p className="text-sm text-slate-600 dark:text-neutral-300">
                  {t.sign_up_subtext ??
                    "Join Kerala's official FPO platform to access training, schemes, market linkages and Detailed Project Reports."}
                </p>
              </div>

              <div className="relative flex w-full flex-col gap-3 fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-500 motion-reduce:animate-none delay-700">
                <Button
                  asChild
                  size="lg"
                  className="group/cta relative w-full overflow-hidden bg-slate-900 text-white hover:bg-slate-800 dark:bg-neutral-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  <a href="/register">
                    <span aria-hidden="true" className="login-cta-sheen" />
                    <UserPlus className="mr-2 h-5 w-5" />
                    {t.sign_up_cta ?? "Create a new account"}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-1" />
                  </a>
                </Button>
                <p className="text-center text-sm text-slate-600 dark:text-neutral-300">
                  {t.buyer_register_prompt ?? "External buyer?"}{" "}
                  <a
                    href="/register?mode=buyer"
                    className="font-medium text-slate-900 underline underline-offset-4 hover:text-emerald-800 dark:text-neutral-100 dark:hover:text-emerald-300"
                  >
                    {t.register_as_buyer ?? "Buyer Registration"}
                  </a>
                </p>
                <p className="text-center text-sm text-slate-600 dark:text-neutral-300">
                  {t.official_register_prompt ?? "Government or CBBO/NGO official?"}{" "}
                  <a
                    href="/official-register"
                    className="font-medium text-slate-900 underline underline-offset-4 hover:text-emerald-800 dark:text-neutral-100 dark:hover:text-emerald-300"
                  >
                    {t.official_register_link ?? "Register here"}
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
