"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";
import { translationsApi } from "@/lib/api/translations";
import { useAuthStore } from "@/stores/auth-store";
import { useLocaleStore } from "@/stores/locale-store";
import type { FpoRedirect } from "@/types/auth";

function resolvePostLoginPath(redirect: FpoRedirect | null): string {
  if (!redirect) return "/admin/dashboard";
  switch (redirect.stage) {
    case "wizard_step":
      return redirect.step ? `/fpo/register?step=${redirect.step}` : "/fpo/register";
    case "verify_email":
    case "verify_phone":
    case "upload_documents":
    case "submit":
      return "/fpo/register";
    case "status":
      return "/fpo/status";
    case "dashboard":
      return "/fpo/dashboard";
    default:
      return "/dashboard";
  }
}

const formSchema = z.object({
  username: z.string().min(1, { message: "Username is required." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type FormValues = z.infer<typeof formSchema>;

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);

  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<Record<string, string>>({});

  useEffect(() => {
    translationsApi.getPublic(locale, "login").then((data) => {
      setT(data.login ?? {});
    });
  }, [locale]);

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
        setUser(meData.user);
        sessionStorage.setItem("show_welcome", "1");
        router.push(resolvePostLoginPath(meData.redirect));
      }
    } catch (error) {
      const axiosErr = error as { response?: { data?: { message?: string } }; message?: string } | undefined;
      const msg = axiosErr?.response?.data?.message ?? axiosErr?.message ?? "Invalid username or password.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
                  Forgot password?
                </Link>
              </div>
            </Field>
          )}
        />
      </FieldGroup>
      <Button className="w-full" type="submit" disabled={isLoading}>
        {isLoading ? "Signing in..." : (t.submit_btn ?? "Sign In")}
      </Button>
    </form>
  );
}
