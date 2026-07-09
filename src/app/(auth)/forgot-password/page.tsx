"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Leaf, Mail, Phone } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";

type Tab = "email" | "phone";

// ─── Email form ───────────────────────────────────────────────────────────────

const emailSchema = z.object({
  email: z.email("Enter a valid email address"),
});
type EmailValues = z.infer<typeof emailSchema>;

function EmailForm({ onSuccess }: { onSuccess: (email: string) => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: EmailValues) => {
    setIsLoading(true);
    try {
      await authApi.forgotPassword({ email: values.email });
      onSuccess(values.email);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send reset link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="fp-email">Email address</FieldLabel>
              <Input
                {...field}
                id="fp-email"
                type="email"
                placeholder="your@email.com"
                autoComplete="email"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      <Button className="w-full" type="submit" disabled={isLoading}>
        {isLoading ? "Sending..." : "Send Reset Link"}
      </Button>
    </form>
  );
}

// ─── Phone form ───────────────────────────────────────────────────────────────

const phoneSchema = z.object({
  phone: z.string().min(10, "Enter a valid phone number"),
});
type PhoneValues = z.infer<typeof phoneSchema>;

function PhoneForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<PhoneValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });

  const onSubmit = async (values: PhoneValues) => {
    setIsLoading(true);
    try {
      await authApi.forgotPassword({ phone: values.phone });
      router.push(`/verify-otp?phone=${encodeURIComponent(values.phone)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send OTP. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="phone"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="fp-phone">Phone number</FieldLabel>
              <Input
                {...field}
                id="fp-phone"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g. 9876543210"
                autoComplete="tel"
                aria-invalid={fieldState.invalid}
                maxLength={10}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                  field.onChange(value);
                }}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      <Button className="w-full" type="submit" disabled={isLoading}>
        {isLoading ? "Sending OTP..." : "Send OTP"}
      </Button>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ForgotPasswordPage() {
  const [tab, setTab] = useState<Tab>("email");
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);

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

        {sentToEmail ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30">
              <CheckCircle className="size-7" />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="font-bold text-2xl">Check your email</h1>
              <p className="text-muted-foreground text-sm">
                We've sent a password reset link to <span className="font-medium text-foreground">{sentToEmail}</span>
                . Check your inbox and click the link to reset your password.
              </p>
            </div>
            <p className="text-muted-foreground text-xs">
              Didn't receive it?{" "}
              <button
                type="button"
                onClick={() => setSentToEmail(null)}
                className="underline underline-offset-4 hover:text-foreground"
              >
                Try again
              </button>
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <h1 className="font-bold text-2xl">Forgot password?</h1>
              <p className="text-muted-foreground text-sm">
                Enter your email or phone number to receive a reset link or OTP.
              </p>
            </div>

            {/* Tab toggle */}
            <div className="flex gap-1 rounded-lg border p-1">
              <button
                type="button"
                onClick={() => setTab("email")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 font-medium text-sm transition-colors ${
                  tab === "email"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Mail className="size-4" />
                Email
              </button>
              <button
                type="button"
                onClick={() => setTab("phone")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 font-medium text-sm transition-colors ${
                  tab === "phone"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Phone className="size-4" />
                Phone (OTP)
              </button>
            </div>

            {tab === "email" ? <EmailForm onSuccess={(email) => setSentToEmail(email)} /> : <PhoneForm />}
          </>
        )}

        <p className="text-center text-muted-foreground text-sm">
          Remember your password?{" "}
          <Link href="/v1/login" className="underline underline-offset-4 hover:text-foreground">
            Back to login
          </Link>
        </p>

        <a href="/" className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Home
        </a>
      </div>
    </div>
  );
}
