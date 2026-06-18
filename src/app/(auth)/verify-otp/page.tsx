"use client";

import { Suspense, useRef, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Leaf } from "lucide-react";
import { toast } from "sonner";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") ?? "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const otpValue = otp.join("");

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...otp];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] ?? "";
    setOtp(next);
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (otpValue.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await authApi.verifyOtp({ phone, otp: otpValue });
      router.push(`/reset-password?token=${encodeURIComponent(result.reset_token)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid or expired OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await authApi.forgotPassword({ phone });
      toast.success("A new OTP has been sent to your phone.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to resend OTP.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-2xl">Verify OTP</h1>
        <p className="text-muted-foreground text-sm">
          Enter the 6-digit code sent to <span className="font-medium text-foreground">{phone || "your phone"}</span>.
        </p>
      </div>

      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <Input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="h-12 w-12 text-center font-semibold text-lg"
            aria-label={`OTP digit ${i + 1}`}
          />
        ))}
      </div>

      <Button className="w-full" type="submit" disabled={isLoading || otpValue.length !== 6}>
        {isLoading ? "Verifying..." : "Verify OTP"}
      </Button>

      <p className="text-center text-muted-foreground text-sm">
        Didn't receive the code?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
          className="underline underline-offset-4 hover:text-foreground disabled:opacity-50"
        >
          {isResending ? "Resending..." : "Resend OTP"}
        </button>
      </p>
    </form>
  );
}

export default function VerifyOtpPage() {
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
            <VerifyOtpForm />
          </Suspense>

          <p className="text-center text-muted-foreground text-sm">
            <Link href="/forgot-password" className="underline underline-offset-4 hover:text-foreground">
              Back
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
