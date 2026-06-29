"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Copy, Eye, EyeOff, RotateCcw, ShieldCheck, ShieldOff, ShieldX } from "lucide-react";
import { Controller, type ControllerFieldState, type ControllerRenderProps, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";
import { twoFactorApi } from "@/lib/api/two-factor";
import type { BackupCodesResponse, TwoFactorSetupResponse } from "@/types/auth";

function SectionHeading({ title }: { title: string }) {
  return <h2 className="pt-2 pb-1 font-semibold text-base">{title}</h2>;
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-8 border-b py-4 last:border-0">
      <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
        <span className="font-medium text-sm">{label}</span>
        {description && <span className="text-muted-foreground text-xs">{description}</span>}
      </div>
      <div className="w-64 shrink-0">{children}</div>
    </div>
  );
}

// ─── Change Password ──────────────────────────────────────────────────────────

const passwordSchema = z
  .object({
    current_password: z.string().min(1, { message: "Current password is required." }),
    new_password: z.string().min(8, { message: "Password must be at least 8 characters." }),
    confirm_password: z.string().min(1, { message: "Please confirm your new password." }),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });
type PasswordValues = z.infer<typeof passwordSchema>;
const passwordDefaults: PasswordValues = { current_password: "", new_password: "", confirm_password: "" };

function PasswordInput({
  id,
  field,
  fieldState,
  label,
}: {
  id: string;
  field: ControllerRenderProps<PasswordValues>;
  fieldState: ControllerFieldState;
  label: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <Field className="gap-1">
      <FieldLabel htmlFor={id} className="text-muted-foreground text-xs">
        {label}
      </FieldLabel>
      <div className="relative">
        <Input
          {...field}
          id={id}
          type={show ? "text" : "password"}
          placeholder="••••••••"
          autoComplete="off"
          aria-invalid={fieldState.invalid}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          tabIndex={-1}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  );
}

function ChangePasswordSection() {
  const [open, setOpen] = useState(false);
  const form = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema), defaultValues: passwordDefaults });

  const mutation = useMutation({
    mutationFn: authApi.changeCurrentPassword,
    onSuccess: () => {
      form.reset(passwordDefaults);
      toast.success("Password changed successfully.");
      setOpen(false);
    },
    onError: (error: unknown) => {
      const message = (error as { message?: string })?.message ?? "Incorrect current password.";
      toast.error(message);
    },
  });

  return (
    <>
      <SettingRow label="Password" description="Change your account password.">
        {!open ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
            Change Password
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                form.reset(passwordDefaults);
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={mutation.isPending}
              onClick={form.handleSubmit((v) => mutation.mutate(v))}
            >
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </SettingRow>

      {open && (
        <div className="mb-2 flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
          <Controller
            control={form.control}
            name="current_password"
            render={({ field, fieldState }) => (
              <PasswordInput id="cur-pw" field={field} fieldState={fieldState} label="Current Password" />
            )}
          />
          <Controller
            control={form.control}
            name="new_password"
            render={({ field, fieldState }) => (
              <PasswordInput id="new-pw" field={field} fieldState={fieldState} label="New Password" />
            )}
          />
          <Controller
            control={form.control}
            name="confirm_password"
            render={({ field, fieldState }) => (
              <PasswordInput id="conf-pw" field={field} fieldState={fieldState} label="Confirm New Password" />
            )}
          />
        </div>
      )}
    </>
  );
}

// ─── 2FA ─────────────────────────────────────────────────────────────────────

type SetupStep = "idle" | "qr" | "backup_codes";
type RegenStep = "idle" | "confirm" | "codes";
type DisableStep = "idle" | "confirm";

function BackupCodeList({ codes, warning }: { codes: string[]; warning?: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex flex-col gap-3">
      {warning && (
        <p className="flex items-start gap-1.5 text-muted-foreground text-xs">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
          {warning}
        </p>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        {codes.map((code) => (
          <code
            key={code}
            className="rounded border bg-muted/60 px-3 py-2 text-center font-mono text-foreground text-sm tracking-widest"
          >
            {code}
          </code>
        ))}
      </div>
      <Button variant="outline" size="sm" className="w-fit" onClick={handleCopy}>
        {copied ? <Check className="mr-2 h-3.5 w-3.5" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy all codes"}
      </Button>
    </div>
  );
}

function TwoFactorSection() {
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useQuery({ queryKey: ["2fa-status"], queryFn: twoFactorApi.getStatus });

  const [setupStep, setSetupStep] = useState<SetupStep>("idle");
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<BackupCodesResponse | null>(null);
  const [regenStep, setRegenStep] = useState<RegenStep>("idle");
  const [regenCode, setRegenCode] = useState("");
  const [regenResult, setRegenResult] = useState<BackupCodesResponse | null>(null);
  const [disableStep, setDisableStep] = useState<DisableStep>("idle");
  const [disableCode, setDisableCode] = useState("");
  const [disableMode, setDisableMode] = useState<"totp" | "email">("totp");
  const [disableEmailOtp, setDisableEmailOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const setupMutation = useMutation({
    mutationFn: twoFactorApi.setup,
    onSuccess: (data) => {
      setSetupData(data);
      setSetupStep("qr");
    },
    onError: () => toast.error("Failed to initiate 2FA setup."),
  });

  const verifySetupMutation = useMutation({
    mutationFn: (code: string) => twoFactorApi.verifySetup(code),
    onSuccess: (data) => {
      setBackupCodes(data);
      setSetupCode("");
      setSetupStep("backup_codes");
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
    },
    onError: () => toast.error("Invalid code. Please check your authenticator app."),
  });

  const regenMutation = useMutation({
    mutationFn: (code: string) => twoFactorApi.regenerateBackupCodes(code),
    onSuccess: (data) => {
      setRegenResult(data);
      setRegenCode("");
      setRegenStep("codes");
    },
    onError: () => toast.error("Invalid TOTP code. Please try again."),
  });

  const disableMutation = useMutation({
    mutationFn: (payload: { code: string } | { email_otp: string }) => twoFactorApi.disable(payload),
    onSuccess: () => {
      toast.success("Two-factor authentication disabled.");
      setDisableStep("idle");
      setDisableCode("");
      setDisableEmailOtp("");
      setDisableMode("totp");
      setOtpSent(false);
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
    },
    onError: () => toast.error("Invalid code. Please try again."),
  });

  const requestOtpMutation = useMutation({
    mutationFn: twoFactorApi.requestDisableOtp,
    onSuccess: (data) => {
      setOtpSent(true);
      toast.success(data.message);
    },
    onError: () => toast.error("Failed to send OTP. Please try again."),
  });

  const isEnabled = status?.is_enabled ?? false;

  return (
    <>
      <SettingRow
        label="Two-Factor Authentication"
        description={
          isEnabled
            ? `Enabled · ${status?.backup_codes_remaining ?? 0} backup codes remaining`
            : "Add an extra layer of security using an authenticator app."
        }
      >
        {isLoading ? (
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        ) : (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-border font-normal text-[11px] text-muted-foreground">
              {isEnabled ? (
                <>
                  <ShieldCheck className="mr-1 h-3 w-3" />
                  Enabled
                </>
              ) : (
                <>
                  <ShieldOff className="mr-1 h-3 w-3" />
                  Disabled
                </>
              )}
            </Badge>
            {!isEnabled && setupStep === "idle" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setupMutation.mutate()}
                disabled={setupMutation.isPending}
              >
                {setupMutation.isPending ? "Setting up..." : "Enable"}
              </Button>
            )}
            {isEnabled && regenStep === "idle" && disableStep === "idle" && (
              <Button size="sm" variant="outline" onClick={() => setRegenStep("confirm")}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Regenerate
              </Button>
            )}
            {isEnabled && disableStep === "idle" && regenStep === "idle" && (
              <Button
                size="sm"
                variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/8 hover:text-destructive"
                onClick={() => setDisableStep("confirm")}
              >
                <ShieldX className="mr-1.5 h-3.5 w-3.5" />
                Disable
              </Button>
            )}
          </div>
        )}
      </SettingRow>

      {/* Setup wizard */}
      {!isEnabled && setupStep === "qr" && setupData && (
        <div className="mb-2 flex flex-col gap-4 rounded-lg border bg-muted/30 p-5">
          <div>
            <h3 className="font-semibold text-sm">Scan the QR code</h3>
            <p className="mt-0.5 text-muted-foreground text-xs">{setupData.instructions}</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-lg border bg-white p-3">
              <img
                src={
                  setupData.qr_code.startsWith("data:")
                    ? setupData.qr_code
                    : `data:image/png;base64,${setupData.qr_code}`
                }
                alt="2FA QR code"
                className="h-40 w-40"
              />
            </div>
            <details className="w-full text-center">
              <summary className="cursor-pointer text-muted-foreground text-xs hover:text-foreground">
                Can't scan? Enter manually
              </summary>
              <code className="mt-2 block break-all rounded-md border bg-muted px-3 py-2 font-mono text-xs">
                {setupData.secret}
              </code>
            </details>
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-medium text-sm" htmlFor="setup-code">
              Enter the 6-digit code from your app
            </label>
            <div className="flex gap-2">
              <input
                id="setup-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="h-10 w-36 rounded-md border bg-background px-3 text-center font-mono text-lg tracking-[0.4em] shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button
                onClick={() => verifySetupMutation.mutate(setupCode)}
                disabled={setupCode.length < 6 || verifySetupMutation.isPending}
              >
                {verifySetupMutation.isPending ? "Verifying..." : "Verify & Enable"}
              </Button>
            </div>
          </div>
          <button
            type="button"
            className="text-left text-muted-foreground text-xs hover:text-foreground"
            onClick={() => {
              setSetupStep("idle");
              setSetupData(null);
              setSetupCode("");
            }}
          >
            ← Cancel setup
          </button>
        </div>
      )}

      {setupStep === "backup_codes" && backupCodes && (
        <div className="mb-2 flex flex-col gap-4 rounded-lg border bg-muted/30 p-5">
          <div>
            <h3 className="font-semibold text-sm">Two-factor authentication enabled</h3>
            <p className="mt-0.5 text-muted-foreground text-xs">
              Save these backup codes somewhere safe. Each code can only be used once.
            </p>
          </div>
          <BackupCodeList codes={backupCodes.backup_codes} warning={backupCodes.warning} />
          <Button
            size="sm"
            variant="outline"
            className="w-fit"
            onClick={() => {
              setSetupStep("idle");
              setBackupCodes(null);
            }}
          >
            Done
          </Button>
        </div>
      )}

      {isEnabled && regenStep === "confirm" && (
        <div className="mb-2 flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
          <label className="font-medium text-sm" htmlFor="regen-code">
            Enter your current TOTP code to confirm
          </label>
          <div className="flex gap-2">
            <input
              id="regen-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={regenCode}
              onChange={(e) => setRegenCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="h-10 w-36 rounded-md border bg-background px-3 text-center font-mono text-lg tracking-[0.4em] shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button
              onClick={() => regenMutation.mutate(regenCode)}
              disabled={regenCode.length < 6 || regenMutation.isPending}
            >
              {regenMutation.isPending ? "Regenerating..." : "Confirm"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setRegenStep("idle");
                setRegenCode("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isEnabled && disableStep === "confirm" && (
        <div className="mb-2 flex flex-col gap-4 rounded-lg border bg-muted/30 p-4">
          <div>
            <h3 className="font-semibold text-sm">Disable two-factor authentication</h3>
            <p className="mt-0.5 text-muted-foreground text-xs">Your account will be less secure without 2FA.</p>
          </div>

          {disableMode === "totp" ? (
            <div className="flex flex-col gap-3">
              <label className="font-medium text-sm" htmlFor="disable-totp">
                Enter your 6-digit authenticator code
              </label>
              <div className="flex gap-2">
                <input
                  id="disable-totp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="h-10 w-36 rounded-md border bg-background px-3 text-center font-mono text-lg tracking-[0.4em] shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button
                  variant="destructive"
                  onClick={() => disableMutation.mutate({ code: disableCode })}
                  disabled={disableCode.length < 6 || disableMutation.isPending}
                >
                  {disableMutation.isPending ? "Disabling..." : "Confirm Disable"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDisableStep("idle");
                    setDisableCode("");
                    setDisableMode("totp");
                    setOtpSent(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
              <button
                type="button"
                className="w-fit text-left text-muted-foreground text-xs underline-offset-2 hover:text-foreground hover:underline"
                onClick={() => {
                  setDisableMode("email");
                  setDisableCode("");
                }}
              >
                I don't have access to my authenticator app
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {!otpSent ? (
                <>
                  <p className="text-muted-foreground text-xs">
                    We'll send a one-time code to your registered email address.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => requestOtpMutation.mutate(undefined)}
                      disabled={requestOtpMutation.isPending}
                    >
                      {requestOtpMutation.isPending ? "Sending..." : "Send OTP to my email"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setDisableStep("idle");
                        setDisableEmailOtp("");
                        setDisableMode("totp");
                        setOtpSent(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <label className="font-medium text-sm" htmlFor="disable-email-otp">
                    Enter the OTP sent to your email
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="disable-email-otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={disableEmailOtp}
                      onChange={(e) => setDisableEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="h-10 w-36 rounded-md border bg-background px-3 text-center font-mono text-lg tracking-[0.4em] shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <Button
                      variant="destructive"
                      onClick={() => disableMutation.mutate({ email_otp: disableEmailOtp })}
                      disabled={disableEmailOtp.length < 6 || disableMutation.isPending}
                    >
                      {disableMutation.isPending ? "Disabling..." : "Confirm Disable"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setDisableStep("idle");
                        setDisableEmailOtp("");
                        setDisableMode("totp");
                        setOtpSent(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  <button
                    type="button"
                    className="w-fit text-left text-muted-foreground text-xs underline-offset-2 hover:text-foreground hover:underline"
                    onClick={() => requestOtpMutation.mutate(undefined)}
                    disabled={requestOtpMutation.isPending}
                  >
                    Resend OTP
                  </button>
                </>
              )}
              <button
                type="button"
                className="w-fit text-left text-muted-foreground text-xs underline-offset-2 hover:text-foreground hover:underline"
                onClick={() => {
                  setDisableMode("totp");
                  setDisableEmailOtp("");
                  setOtpSent(false);
                }}
              >
                ← Use authenticator app instead
              </button>
            </div>
          )}
        </div>
      )}

      {isEnabled && regenStep === "codes" && regenResult && (
        <div className="mb-2 flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
          <p className="text-muted-foreground text-xs">
            Your new backup codes — save them now, they won't be shown again.
          </p>
          <BackupCodeList codes={regenResult.backup_codes} warning={regenResult.warning} />
          <Button
            size="sm"
            variant="outline"
            className="w-fit"
            onClick={() => {
              setRegenStep("idle");
              setRegenResult(null);
              queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
            }}
          >
            Done
          </Button>
        </div>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsSecurityPage() {
  return (
    <div className="flex flex-col gap-1">
      <SectionHeading title="Password" />
      <div className="flex flex-col">
        <ChangePasswordSection />
      </div>

      <SectionHeading title="Two-Factor Authentication" />
      <div className="flex flex-col">
        <TwoFactorSection />
      </div>
    </div>
  );
}
