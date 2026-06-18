"use client";

import { Suspense, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Eye, EyeOff, Leaf } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";

const schema = z
  .object({
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((v) => v.new_password === v.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [isLoading, setIsLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { new_password: "", confirm_password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    if (!token) {
      toast.error("Invalid or missing reset token. Please request a new reset link.");
      return;
    }
    setIsLoading(true);
    try {
      await authApi.resetPassword({
        token,
        new_password: values.new_password,
        confirm_password: values.confirm_password,
      });
      setSuccess(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset password. The link may have expired.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30">
          <CheckCircle className="size-7" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="font-bold text-2xl">Password reset!</h1>
          <p className="text-muted-foreground text-sm">
            Your password has been updated successfully. You can now log in with your new password.
          </p>
        </div>
        <Button className="w-full" onClick={() => router.push("/v1/login")}>
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-2xl">Set new password</h1>
        <p className="text-muted-foreground text-sm">Choose a strong password for your account.</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FieldGroup className="gap-4">
          <Controller
            control={form.control}
            name="new_password"
            render={({ field, fieldState }) => (
              <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="rp-new">New password</FieldLabel>
                <div className="relative">
                  <Input
                    {...field}
                    id="rp-new"
                    type={showNew ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
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
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="confirm_password"
            render={({ field, fieldState }) => (
              <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="rp-confirm">Confirm password</FieldLabel>
                <div className="relative">
                  <Input
                    {...field}
                    id="rp-confirm"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat your password"
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
              </Field>
            )}
          />
        </FieldGroup>
        <Button className="w-full" type="submit" disabled={isLoading}>
          {isLoading ? "Resetting..." : "Reset Password"}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative flex h-svh items-center justify-center overflow-hidden bg-background p-4">
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>

      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl shadow-lg lg:grid-cols-2">
        {/* Left — Form */}
        <div className="flex flex-col gap-6 bg-card p-8">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center rounded-md bg-green-600 text-white">
              <Leaf className="size-4" />
            </div>
            KAU-FPO Platform
          </Link>

          <Suspense fallback={<div className="text-muted-foreground text-sm">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>

          <p className="text-center text-muted-foreground text-sm">
            <Link href="/v1/login" className="underline underline-offset-4 hover:text-foreground">
              Back to login
            </Link>
          </p>
        </div>

        {/* Right — Branding panel */}
        <div className="hidden flex-col items-center justify-center gap-6 bg-green-700 p-10 text-white lg:flex">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
            <Leaf className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h2 className="font-bold text-2xl leading-snug">
              Empowering Farmers,
              <br />
              Growing Together
            </h2>
            <p className="mt-3 max-w-xs text-green-100 text-sm">
              Connect with Kerala Agricultural University's digital ecosystem for smarter farming decisions across all
              14 districts.
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-white/10 p-3">
              <p className="font-bold text-xl">120+</p>
              <p className="text-green-100 text-xs">FPOs Registered</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <p className="font-bold text-xl">18,000+</p>
              <p className="text-green-100 text-xs">Farmers Connected</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
