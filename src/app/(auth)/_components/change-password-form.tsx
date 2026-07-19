"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Eye, EyeOff, KeyRound, XCircle } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth-store";

const formSchema = z
  .object({
    new_password: z
      .string()
      .min(8, { message: "At least 8 characters" })
      .regex(/[A-Z]/, { message: "At least one uppercase letter" })
      .regex(/[a-z]/, { message: "At least one lowercase letter" })
      .regex(/[0-9]/, { message: "At least one number" })
      .regex(/[^A-Za-z0-9]/, { message: "At least one special character" }),
    confirm_password: z.string().min(1, { message: "Please confirm your password." }),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

type FormValues = z.infer<typeof formSchema>;

export function ChangePasswordForm() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [partialToken, setPartialToken] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("change_password_partial_token");
    if (!token) {
      router.replace("/v1/login");
      return;
    }
    setPartialToken(token);
  }, [router]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { new_password: "", confirm_password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    if (!partialToken) return;
    setIsLoading(true);
    try {
      const result = await authApi.changePassword({
        partial_token: partialToken,
        new_password: values.new_password,
        confirm_password: values.confirm_password,
      });
      sessionStorage.removeItem("change_password_partial_token");
      setUser(result.user);
      sessionStorage.setItem("show_welcome", "1");
      router.replace("/v1/login");
    } catch (error) {
      const err = error as { message?: string; data?: { message?: string } };
      toast.error(err.data?.message ?? err.message ?? "Failed to change password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="new_password"
          render={({ field, fieldState }) => {
            const passwordVal = field.value ?? "";
            return (
              <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="new-password">New Password</FieldLabel>
                <div className="relative">
                  <Input
                    {...field}
                    id="new-password"
                    type={showNew ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    autoFocus
                    aria-invalid={fieldState.invalid}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                {passwordVal.length > 0 && (
                  <div className="flex flex-col gap-1 pt-1">
                    {[
                      { label: "At least 8 characters", met: passwordVal.length >= 8 },
                      { label: "One uppercase letter (A–Z)", met: /[A-Z]/.test(passwordVal) },
                      { label: "One lowercase letter (a–z)", met: /[a-z]/.test(passwordVal) },
                      { label: "One number (0–9)", met: /[0-9]/.test(passwordVal) },
                      { label: "One special character (!@#$…)", met: /[^A-Za-z0-9]/.test(passwordVal) },
                    ].map(({ label, met }) => (
                      <p
                        key={label}
                        className={`flex items-center gap-1.5 text-xs ${met ? "text-green-600" : "text-muted-foreground"}`}
                      >
                        {met ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                        ) : (
                          <span className="ml-0.5 h-3 w-3 shrink-0 inline-flex items-center justify-center rounded-full border border-current text-[8px]">
                            ✕
                          </span>
                        )}
                        {label}
                      </p>
                    ))}
                  </div>
                )}
              </Field>
            );
          }}
        />
        <Controller
          control={form.control}
          name="confirm_password"
          render={({ field, fieldState }) => {
            const confirmVal = field.value ?? "";
            const passwordVal = form.watch("new_password") ?? "";
            const passwordsMatch = confirmVal.length > 0 && passwordVal === confirmVal;
            const passwordsMismatch = confirmVal.length > 0 && passwordVal !== confirmVal;
            return (
              <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                <div className="relative">
                  <Input
                    {...field}
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    aria-invalid={fieldState.invalid}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                {!fieldState.invalid && passwordsMatch && (
                  <p className="flex items-center gap-1 text-green-600 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Passwords match
                  </p>
                )}
                {!fieldState.invalid && passwordsMismatch && (
                  <p className="flex items-center gap-1 text-destructive text-xs">
                    <XCircle className="h-3.5 w-3.5" /> Passwords do not match
                  </p>
                )}
              </Field>
            );
          }}
        />
      </FieldGroup>

      <Button type="submit" className="w-full" disabled={isLoading}>
        <KeyRound className="mr-2 h-4 w-4" />
        {isLoading ? "Saving..." : "Set New Password"}
      </Button>

      <button
        type="button"
        className="text-center text-muted-foreground text-sm hover:text-foreground"
        onClick={() => {
          sessionStorage.removeItem("change_password_partial_token");
          router.replace("/v1/login");
        }}
      >
        ← Back to login
      </button>
    </form>
  );
}
