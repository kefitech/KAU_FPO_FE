"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/auth";
import { twoFactorApi } from "@/lib/api/two-factor";
import { useAuthStore } from "@/stores/auth-store";

type Mode = "totp" | "backup" | "lockout";
type LockoutStep = "request" | "verify";

export function TwoFactorForm() {
  const router = useRouter();
  const [partialToken, setPartialToken] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("totp");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);

  // Lockout flow state
  const [lockoutStep, setLockoutStep] = useState<LockoutStep>("request");
  const [emailOtp, setEmailOtp] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem("2fa_partial_token");
    if (!token) {
      router.replace("/v1/login");
      return;
    }
    setPartialToken(token);
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!partialToken || !code.trim()) return;

    setIsLoading(true);
    try {
      if (mode === "totp") {
        await twoFactorApi.loginVerify(partialToken, code.trim());
      } else {
        await twoFactorApi.loginBackup(partialToken, code.trim());
      }
      const me = await authApi.me();
      setUser(me.user);
      sessionStorage.removeItem("2fa_partial_token");
      sessionStorage.setItem("show_welcome", "1");
      router.replace("/admin/dashboard");
    } catch {
      toast.error(
        mode === "totp" ? "Invalid or expired code. Please try again." : "Invalid backup code. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRequestOtp() {
    if (!partialToken) return;
    setIsLoading(true);
    try {
      const res = await twoFactorApi.requestDisableOtp(partialToken);
      toast.success(res.message);
      setLockoutStep("verify");
    } catch {
      toast.error("Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDisableWithOtp() {
    if (!partialToken || !emailOtp.trim()) return;
    setIsLoading(true);
    try {
      await twoFactorApi.disable({ partial_token: partialToken, email_otp: emailOtp.trim() });
      sessionStorage.removeItem("2fa_partial_token");
      toast.success("Two-factor authentication has been disabled. Please log in again.");
      router.replace("/v1/login");
    } catch {
      toast.error("Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function resetToNormal() {
    setMode("totp");
    setCode("");
    setLockoutStep("request");
    setEmailOtp("");
  }

  // ── Lockout flow ──────────────────────────────────────────────────────────
  if (mode === "lockout") {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <p className="font-medium text-sm">Can't access your authenticator?</p>
          <p className="text-muted-foreground text-xs">
            We'll send a one-time code to your registered email to disable 2FA. You can then log in normally.
          </p>
        </div>

        {lockoutStep === "request" ? (
          <div className="flex flex-col gap-3">
            <Button onClick={handleRequestOtp} disabled={isLoading} className="w-full">
              {isLoading ? "Sending..." : "Send OTP to my email"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-sm" htmlFor="lockout-otp">
                Enter the OTP sent to your email
              </label>
              <input
                id="lockout-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={emailOtp}
                onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                autoComplete="one-time-code"
                className="h-11 w-full rounded-md border bg-background px-3 text-center font-mono text-xl tracking-[0.5em] shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <Button onClick={handleDisableWithOtp} disabled={isLoading || emailOtp.length < 6} className="w-full">
              {isLoading ? "Verifying..." : "Disable 2FA & go to login"}
            </Button>
            <button
              type="button"
              className="text-center text-muted-foreground text-xs hover:text-foreground"
              onClick={() =>
                twoFactorApi.requestDisableOtp(partialToken ?? undefined).then((r) => toast.success(r.message))
              }
            >
              Resend OTP
            </button>
          </div>
        )}

        <button
          type="button"
          className="text-center text-muted-foreground text-sm hover:text-foreground"
          onClick={resetToNormal}
        >
          ← Back to verification
        </button>
      </div>
    );
  }

  // ── Normal flow (totp / backup) ───────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex gap-1 rounded-lg border p-1 text-sm">
          <button
            type="button"
            onClick={() => {
              setMode("totp");
              setCode("");
            }}
            className={`flex-1 rounded-md px-3 py-1.5 font-medium transition-colors ${mode === "totp" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Authenticator App
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("backup");
              setCode("");
            }}
            className={`flex-1 rounded-md px-3 py-1.5 font-medium transition-colors ${mode === "backup" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Backup Code
          </button>
        </div>
      </div>

      {mode === "totp" ? (
        <div className="flex flex-col gap-1.5">
          <label className="font-medium text-sm" htmlFor="2fa-code">
            6-digit code
          </label>
          <input
            id="2fa-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            autoComplete="one-time-code"
            className="h-11 w-full rounded-md border bg-background px-3 text-center font-mono text-xl tracking-[0.5em] shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="text-muted-foreground text-xs">
            Open your authenticator app and enter the current 6-digit code.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label className="font-medium text-sm" htmlFor="2fa-backup">
            Backup code
          </label>
          <input
            id="2fa-backup"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.trim())}
            placeholder="xxxxxxxx-xxxx"
            autoComplete="off"
            className="h-10 w-full rounded-md border bg-background px-3 font-mono text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="text-muted-foreground text-xs">
            Enter one of the backup codes you saved when setting up 2FA. Each code can only be used once.
          </p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading || code.length < (mode === "totp" ? 6 : 1)}>
        <ShieldCheck className="mr-2 h-4 w-4" />
        {isLoading ? "Verifying..." : "Verify"}
      </Button>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          className="text-muted-foreground text-xs underline-offset-2 hover:text-foreground hover:underline"
          onClick={() => {
            setMode("lockout");
            setCode("");
          }}
        >
          Lost access to all your devices?
        </button>
        <button
          type="button"
          className="text-muted-foreground text-sm hover:text-foreground"
          onClick={() => {
            sessionStorage.removeItem("2fa_partial_token");
            router.replace("/v1/login");
          }}
        >
          ← Back to login
        </button>
      </div>
    </form>
  );
}
