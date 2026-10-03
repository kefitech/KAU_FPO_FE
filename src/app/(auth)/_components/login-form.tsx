"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";
import { translationsApi } from "@/lib/api/translations";
import { resolvePostLoginPath } from "@/lib/fpo-redirect";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useLocaleStore } from "@/stores/locale-store";

const formSchema = z.object({
  username: z.string().min(1, { message: "Username is required." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type FormValues = z.infer<typeof formSchema>;

// How long the success state shows before the hard redirect
const SUCCESS_REDIRECT_DELAY_MS = 900;

/**
 * Sanitise the ?next= param. Only relative in-app paths are honoured; anything
 * else (external URL, javascript:, protocol-relative) falls back to null so a
 * hostile link can't hijack the post-login redirect.
 */
function safeNextPath(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export function LoginForm({ t: tProp }: { t?: Record<string, string> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams?.get("next") ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);

  const locale = useLocaleStore((s) => s.locale);
  const [tLocal, setTLocal] = useState<Record<string, string>>({});
  const t = tProp ?? tLocal;

  useEffect(() => {
    if (tProp) return; // parent already fetched
    translationsApi.getPublic(locale, "login").then((data) => {
      setTLocal(data.login ?? {});
    });
  }, [locale, tProp]);

  // Browser Back after login restores this page from the bfcache with state frozen
  // mid-redirect — reset the button so it doesn't stay stuck in the success state.
  useEffect(() => {
    const resetOnRestore = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      setIsSuccess(false);
      setIsLoading(false);
    };
    window.addEventListener("pageshow", resetOnRestore);
    return () => window.removeEventListener("pageshow", resetOnRestore);
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const result = await authApi.login(values);
      if ("must_change_password" in result && result.must_change_password) {
        sessionStorage.setItem("change_password_partial_token", result.partial_token);
        router.push("/v1/login/change-password");
      } else if ("two_factor_required" in result && result.two_factor_required) {
        sessionStorage.setItem("2fa_partial_token", result.partial_token);
        router.push("/v1/login/2fa");
      } else if ("user" in result) {
        const meData = await authApi.me();
        setUser(meData.user, meData.redirect);
        sessionStorage.setItem("show_welcome", "1");
        // Honour ?next= when the session was timed out mid-navigation — user
        // expects to land back where they were, not on the default dashboard.
        // resolvePostLoginPath's role-specific redirects (wizard / status /
        // fpo-dashboard) override next, since those exist for stateful reasons.
        const defaultPath = resolvePostLoginPath(meData.redirect, meData.menu?.[0]?.path);
        const useNext = nextPath && !meData.redirect; // redirect from BE takes priority
        // Hold on the success state briefly so the user sees it (skipped for reduced motion)
        setIsSuccess(true);
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!reduceMotion) await new Promise((r) => setTimeout(r, SUCCESS_REDIRECT_DELAY_MS));
        // Hard navigation intentionally — Next.js keeps route segments in a
        // client cache. If we soft-navigate here, the Back button after a
        // previous logout can render the PREVIOUS user's pages from cache
        // with no auth re-check. window.location wipes it and starts the
        // new user's session on a clean React tree.
        window.location.href = useNext ? nextPath! : defaultPath;
      }
    } catch (error) {
      const axiosErr = error as { response?: { data?: { message?: string } }; message?: string } | undefined;
      const msg = axiosErr?.response?.data?.message ?? axiosErr?.message ?? "Invalid username or password.";
      toast.error(msg);
      setShake(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      onAnimationEnd={(e) => e.target === e.currentTarget && setShake(false)}
      className={cn("flex flex-col gap-4", shake && "login-shake")}
    >
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="username"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-username">{t.username_label ?? "Username"}</FieldLabel>
              <Input
                {...field}
                id="login-username"
                type="text"
                placeholder={t.username_placeholder ?? "your username"}
                autoComplete="username"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-password">{t.password_label ?? "Password"}</FieldLabel>
              <div className="relative">
                <Input
                  {...field}
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t.password_placeholder ?? "••••••••"}
                  autoComplete="current-password"
                  aria-invalid={fieldState.invalid}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-muted-foreground text-xs underline underline-offset-4 hover:text-foreground"
                >
                  {t.forgot_password ?? "Forgot password?"}
                </Link>
              </div>
            </Field>
          )}
        />
      </FieldGroup>
      <Button
        className={cn(
          "w-full transition-colors duration-300",
          isSuccess && "login-success-pulse bg-emerald-600 text-white hover:bg-emerald-600 disabled:opacity-100",
        )}
        type="submit"
        disabled={isLoading || isSuccess}
      >
        {isSuccess ? (
          <>
            <svg viewBox="0 0 24 24" className="mr-2 h-5 w-5" fill="none" aria-hidden="true">
              <path
                d="M5 12.5l4.5 4.5L19 7.5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="login-check-draw"
              />
            </svg>
            {t.signing_in ?? "Signing in..."}
          </>
        ) : isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t.signing_in ?? "Signing in..."}
          </>
        ) : (
          (t.submit_btn ?? "Sign In")
        )}
      </Button>
    </form>
  );
}
