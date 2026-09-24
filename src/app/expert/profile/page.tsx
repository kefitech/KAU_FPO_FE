"use client";

import { useEffect, useRef, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Smartphone } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { fpoProfileApi } from "@/app/fpo/_api/profile";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

function makeProfileSchema(t: T) {
  return z.object({
    first_name: z.string().min(1, { message: t.val_first_name_required ?? "First name is required." }),
    last_name: z.string().min(1, { message: t.val_last_name_required ?? "Last name is required." }),
    phone: z
      .string()
      .optional()
      .refine((v) => !v || /^[6-9]\d{9}$/.test(v), {
        message: t.val_invalid_phone ?? "Enter a valid 10-digit mobile number.",
      }),
    preferred_language: z.string().optional(),
  });
}
type ProfileValues = { first_name: string; last_name: string; phone?: string; preferred_language?: string };

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-sm">
      {initials}
    </div>
  );
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
    <div className="flex flex-col gap-2 border-b py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium text-sm">{label}</span>
        {description && <span className="text-muted-foreground text-xs">{description}</span>}
      </div>
      <div className="w-full sm:w-64 sm:shrink-0">{children}</div>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return <h2 className="pt-2 pb-1 font-semibold text-base">{title}</h2>;
}

// ─── Phone OTP block ────────────────────────────────────────────────────────
// Nothing here touches the profile until confirmMutation succeeds. Reuses the
// same phone-OTP mechanism as the FPO, government, and CBBO portals
// (fpoProfileApi.sendPhoneOtp / verifyPhoneOtp) -- despite the "fpo" name,
// this is the established shared pattern already used across portals for
// verifying a phone number via OTP before saving it.

function PhoneOtpBlock({
  newPhone,
  onVerified,
  onCancel,
  t,
}: {
  newPhone: string;
  onVerified: () => void;
  onCancel: () => void;
  t: T;
}) {
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const hasSentInitialOtp = useRef(false);

  const sendMutation = useMutation({
    mutationFn: () => fpoProfileApi.sendPhoneOtp(newPhone),
    onSuccess: () => {
      setOtpSent(true);
      setOtpError("");
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string } | undefined;
      toast.error(axiosErr?.response?.data?.message ?? axiosErr?.message ?? (t.toast_otp_send_failed ?? "Failed to send OTP."));
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      await fpoProfileApi.verifyPhoneOtp(newPhone, otp);
      return authApi.updateProfile({ phone: newPhone });
    },
    onSuccess: () => {
      toast.success(t.toast_phone_updated ?? "Phone number updated and verified.");
      onVerified();
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string } | undefined;
      setOtpError(axiosErr?.response?.data?.message ?? axiosErr?.message ?? (t.otp_error_default ?? "Invalid or expired OTP."));
    },
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: guarded by hasSentInitialOtp ref, intentionally runs once on mount
  useEffect(() => {
    if (hasSentInitialOtp.current) return;
    hasSentInitialOtp.current = true;
    sendMutation.mutate();
  }, []);

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4">
      <div className="flex flex-col gap-1">
        <span className="font-medium text-sm">{t.otp_title ?? "Verify new phone number"}</span>
        <p className="text-muted-foreground text-xs">
          {t.otp_desc ??
            "We'll send a one-time password to confirm this number. It won't be saved to your profile until verified."}
        </p>
      </div>

      {otpSent && (
        <div className="flex items-start gap-2.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 dark:border-green-800 dark:bg-green-950/30">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
          <p className="text-green-700 text-xs dark:text-green-300">
            {t.otp_sent_msg ?? "OTP sent to"} <span className="font-medium font-mono">{newPhone}</span>
          </p>
        </div>
      )}

      {otpSent && (
        <div className="flex flex-col gap-1">
          <Input
            placeholder={t.otp_placeholder ?? "6-digit OTP"}
            maxLength={6}
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.replace(/\D/g, ""));
              setOtpError("");
            }}
            className="w-40 text-center font-mono text-lg tracking-widest"
          />
          {otpError && <p className="text-destructive text-xs">{otpError}</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={confirmMutation.isPending || otp.length < 6}
          onClick={() => confirmMutation.mutate()}
        >
          {confirmMutation.isPending ? (t.otp_confirming_btn ?? "Verifying...") : (t.otp_confirm_btn ?? "Confirm & Save")}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {t.btn_cancel ?? "Cancel"}
        </Button>
        <button
          type="button"
          onClick={() => sendMutation.mutate()}
          disabled={sendMutation.isPending}
          className="ml-auto text-muted-foreground text-xs underline underline-offset-4 hover:text-foreground disabled:opacity-50"
        >
          {sendMutation.isPending ? (t.otp_resending_btn ?? "Sending...") : (t.otp_resend_btn ?? "Resend OTP")}
        </button>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ExpertSettingsProfilePage() {
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  const [editing, setEditing] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "fpo_settings,expert_settings,common")
      .then((data) => {
        setT({ ...(data.common ?? {}), ...(data.fpo_settings ?? {}), ...(data.expert_settings ?? {}) });
      })
      .catch(() => undefined);
  }, [locale]);

  const LANGUAGES = [
    { value: "en", label: t.lang_english ?? "English" },
    { value: "ml", label: t.lang_malayalam ?? "Malayalam" },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ["auth-me", locale],
    queryFn: authApi.me,
    staleTime: 5 * 60 * 1000,
  });

  const user = data?.user;
  const fullName = user ? `${user.first_name} ${user.last_name ?? ""}`.trim() : "";

  const form = useForm<ProfileValues>({
    resolver: zodResolver(makeProfileSchema(t)),
    defaultValues: { first_name: "", last_name: "", phone: "", preferred_language: "en" },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        first_name: user.first_name ?? "",
        last_name: user.last_name ?? "",
        phone: user.phone ?? "",
        preferred_language: user.preferred_language ?? "en",
      });
    }
  }, [user, form]);

  const mutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
      toast.success(t.toast_updated ?? "Profile updated successfully.");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : (t.toast_failed ?? "Failed to update profile."));
    },
  });

  const onSubmit = (values: ProfileValues) => {
    const payload: Partial<ProfileValues> = {};
    if (values.first_name !== (user?.first_name ?? "")) payload.first_name = values.first_name;
    if (values.last_name !== (user?.last_name ?? "")) payload.last_name = values.last_name;
    if (values.preferred_language !== (user?.preferred_language ?? "en"))
      payload.preferred_language = values.preferred_language;

    const phoneChanged = values.phone !== (user?.phone ?? "");

    if (Object.keys(payload).length === 0 && !phoneChanged) {
      toast.info(t.toast_no_changes ?? "No changes to save.");
      setEditing(false);
      return;
    }

    // Name/language save immediately, independent of phone verification.
    if (Object.keys(payload).length > 0) {
      mutation.mutate(payload);
    }

    // Phone is held back -- nothing is written for it until OTP is verified.
    if (phoneChanged && values.phone) {
      setPendingPhone(values.phone);
      setOtpStep(true);
    } else if (Object.keys(payload).length > 0) {
      setEditing(false);
    }
  };

  const handleVerified = () => {
    queryClient.invalidateQueries({ queryKey: ["auth-me"] });
    setOtpStep(false);
    setPendingPhone(null);
    setEditing(false);
  };

  const handleCancel = () => {
    form.reset({
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      phone: user?.phone ?? "",
      preferred_language: user?.preferred_language ?? "en",
    });
    setOtpStep(false);
    setPendingPhone(null);
    setEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <SectionHeading title={t.section_profile ?? "Profile"} />
        {!editing ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            {t.btn_edit ?? "Edit"}
          </Button>
        ) : !otpStep ? (
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={handleCancel}>
              {t.btn_cancel ?? "Cancel"}
            </Button>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? (t.btn_saving ?? "Saving...") : (t.btn_save ?? "Save")}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col">
        <SettingRow label={t.label_avatar ?? "Avatar"}>
          {fullName ? <UserAvatar name={fullName} /> : <span className="text-muted-foreground text-sm">—</span>}
        </SettingRow>

        <Controller
          control={form.control}
          name="first_name"
          render={({ field, fieldState }) => (
            <SettingRow label={t.label_first_name ?? "First Name"}>
              {editing ? (
                <div className="flex flex-col gap-1">
                  <Input {...field} disabled={otpStep} placeholder={t.label_first_name ?? "First name"} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">{user?.first_name || "—"}</span>
              )}
            </SettingRow>
          )}
        />

        <Controller
          control={form.control}
          name="last_name"
          render={({ field, fieldState }) => (
            <SettingRow label={t.label_last_name ?? "Last Name"}>
              {editing ? (
                <div className="flex flex-col gap-1">
                  <Input {...field} disabled={otpStep} placeholder={t.label_last_name ?? "Last name"} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">{user?.last_name || "—"}</span>
              )}
            </SettingRow>
          )}
        />

        <Controller
          control={form.control}
          name="phone"
          render={({ field, fieldState }) => (
            <SettingRow label={t.label_phone ?? "Phone"} description={t.label_phone_desc ?? "Used for SMS notifications and account recovery."}>
              {editing && !otpStep ? (
                <div className="flex flex-col gap-1">
                  <Input
                    {...field}
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="9876543210"
                    aria-invalid={fieldState.invalid}
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </div>
              ) : otpStep ? (
                <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-muted/50 px-3 text-muted-foreground text-sm">
                  <span className="font-mono">{pendingPhone}</span>
                  <span className="ml-auto text-xs">{t.otp_pending_label ?? "Pending verification"}</span>
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">{user?.phone || "—"}</span>
              )}
            </SettingRow>
          )}
        />

        {otpStep && pendingPhone && (
          <div className="py-4">
            <PhoneOtpBlock newPhone={pendingPhone} onVerified={handleVerified} onCancel={handleCancel} t={t} />
          </div>
        )}

        <Controller
          control={form.control}
          name="preferred_language"
          render={({ field, fieldState }) => (
            <SettingRow label={t.label_language ?? "Preferred Language"} description={t.label_language_desc ?? "Language used for notifications and emails."}>
              {editing ? (
                <select
                  {...field}
                  disabled={otpStep}
                  className="h-9 w-full rounded-md border bg-background px-3 text-foreground text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-muted-foreground text-sm">
                  {LANGUAGES.find((l) => l.value === (user?.preferred_language ?? "en"))?.label ?? "English"}
                </span>
              )}
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </SettingRow>
          )}
        />
      </div>

      <SectionHeading title={t.section_account ?? "Account"} />

      <div className="flex flex-col">
        <SettingRow label={t.label_email ?? "Email Address"} description={t.label_email_desc ?? "Your email cannot be changed."}>
          <span className="text-muted-foreground text-sm">{user?.email}</span>
        </SettingRow>

        <SettingRow label={t.label_role ?? "Role"}>
          <span className="inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-xs capitalize">
            {user?.role?.replace(/_/g, " ") || "—"}
          </span>
        </SettingRow>
      </div>
    </form>
  );
}