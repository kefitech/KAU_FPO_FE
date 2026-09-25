"use client";

import { useEffect, useRef, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Smartphone } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { buyerAccountProfileApi } from "@/app/buyer/_api/account-profile";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

const profileSchema = z.object({
  first_name: z.string().min(1, { message: "First name is required." }),
  last_name: z.string().min(1, { message: "Last name is required." }),
  phone: z.string().optional(),
  preferred_language: z.string().optional(),
});
type ProfileValues = z.infer<typeof profileSchema>;

const LANGUAGE_CODES = ["en", "ml"] as const;

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
// Nothing here touches the database until confirmMutation succeeds.

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
    mutationFn: () => buyerAccountProfileApi.sendPhoneOtp(newPhone),
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
      await buyerAccountProfileApi.verifyPhoneOtp(newPhone, otp);
      return buyerAccountProfileApi.update({ phone: newPhone });
    },
    onSuccess: () => {
      toast.success(t.toast_phone_updated ?? "Phone number updated and verified.");
      onVerified();
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string } | undefined;
      setOtpError(axiosErr?.response?.data?.message ?? axiosErr?.message ?? (t.err_otp_invalid ?? "Invalid or expired OTP."));
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
        <span className="font-medium text-sm">{t.otp_verify_title ?? "Verify new phone number"}</span>
        <p className="text-muted-foreground text-xs">
          {t.otp_verify_desc ??
            "We'll send a one-time password to confirm this number. It won't be saved to your profile until verified."}
        </p>
      </div>

      {otpSent && (
        <div className="flex items-start gap-2.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 dark:border-green-800 dark:bg-green-950/30">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
          <p className="text-green-700 text-xs dark:text-green-300">
            {t.otp_sent_prefix ?? "OTP sent to"} <span className="font-medium font-mono">{newPhone}</span>
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
          {confirmMutation.isPending ? (t.btn_verifying ?? "Verifying...") : (t.btn_confirm_save ?? "Confirm & Save")}
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
          {sendMutation.isPending ? (t.btn_sending ?? "Sending...") : (t.btn_resend ?? "Resend OTP")}
        </button>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function BuyerProfilePage() {
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [editing, setEditing] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);

  useEffect(() => {
    if (!locale) return;
    translationsApi.getPublic(locale, "buyer_my_profile").then((data) => {
      setT(data.buyer_my_profile ?? {});
    });
  }, [locale]);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["buyer-account-profile"],
    queryFn: buyerAccountProfileApi.get,
    staleTime: 5 * 60 * 1000,
  });

  const fullName = profile ? `${profile.first_name} ${profile.last_name ?? ""}`.trim() : "";

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { first_name: "", last_name: "", phone: "", preferred_language: "en" },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        first_name: profile.first_name ?? "",
        last_name: profile.last_name ?? "",
        phone: profile.phone ?? "",
        preferred_language: profile.preferred_language ?? "en",
      });
    }
  }, [profile, form]);

  const mutation = useMutation({
    mutationFn: buyerAccountProfileApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buyer-account-profile"] });
      toast.success(t.toast_profile_updated ?? "Profile updated successfully.");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : (t.toast_update_failed ?? "Failed to update profile."));
    },
  });

  const onSubmit = (values: ProfileValues) => {
    const payload: Partial<ProfileValues> = {};
    if (values.first_name !== (profile?.first_name ?? "")) payload.first_name = values.first_name;
    if (values.last_name !== (profile?.last_name ?? "")) payload.last_name = values.last_name;
    if (values.preferred_language !== (profile?.preferred_language ?? "en"))
      payload.preferred_language = values.preferred_language;

    const phoneChanged = values.phone !== (profile?.phone ?? "");

    if (Object.keys(payload).length === 0 && !phoneChanged) {
      toast.info(t.toast_no_changes ?? "No changes to save.");
      setEditing(false);
      return;
    }

    // Name/language save immediately, independent of phone verification.
    if (Object.keys(payload).length > 0) {
      mutation.mutate(payload);
    }

    // Phone is held back — nothing is written for it until OTP is verified.
    if (phoneChanged && values.phone) {
      setPendingPhone(values.phone);
      setOtpStep(true);
    } else if (Object.keys(payload).length > 0) {
      setEditing(false);
    }
  };

  const handleVerified = () => {
    queryClient.invalidateQueries({ queryKey: ["buyer-account-profile"] });
    setOtpStep(false);
    setPendingPhone(null);
    setEditing(false);
  };

  const handleCancel = () => {
    form.reset({
      first_name: profile?.first_name ?? "",
      last_name: profile?.last_name ?? "",
      phone: profile?.phone ?? "",
      preferred_language: profile?.preferred_language ?? "en",
    });
    setOtpStep(false);
    setPendingPhone(null);
    setEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="px-3 py-4 sm:px-6 sm:py-6">
      <div className="mb-4">
        <h1 className="font-bold text-xl sm:text-2xl">{t.page_title ?? "My Profile"}</h1>
        <p className="text-muted-foreground text-sm">{t.page_subtitle ?? "Manage your account profile."}</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-1 rounded-xl border bg-card p-4 sm:p-6">
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
                    <Input
                      {...field}
                      disabled={otpStep}
                      placeholder={t.placeholder_first_name ?? "First name"}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">{profile?.first_name || "—"}</span>
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
                    <Input
                      {...field}
                      disabled={otpStep}
                      placeholder={t.placeholder_last_name ?? "Last name"}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">{profile?.last_name || "—"}</span>
                )}
              </SettingRow>
            )}
          />

          <Controller
            control={form.control}
            name="phone"
            render={({ field, fieldState }) => (
              <SettingRow
                label={t.label_phone ?? "Phone"}
                description={t.desc_phone ?? "Used for SMS notifications and account recovery."}
              >
                {editing && !otpStep ? (
                  <div className="flex flex-col gap-1">
                    <Input
                      {...field}
                      type="tel"
                      placeholder={t.placeholder_phone ?? "+91 98765 43210"}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </div>
                ) : otpStep ? (
                  <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-muted/50 px-3 text-muted-foreground text-sm">
                    <span className="font-mono">{pendingPhone}</span>
                    <span className="ml-auto text-xs">{t.pending_verification ?? "Pending verification"}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">{profile?.phone || "—"}</span>
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
              <SettingRow
                label={t.label_preferred_language ?? "Preferred Language"}
                description={t.desc_preferred_language ?? "Language used for notifications and emails."}
              >
                {editing ? (
                  <select
                    {...field}
                    disabled={otpStep}
                    className="h-9 w-full rounded-md border bg-background px-3 text-foreground text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {LANGUAGE_CODES.map((code) => (
                      <option key={code} value={code}>
                        {t[`lang_${code}`] ?? (code === "en" ? "English" : "Malayalam")}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-muted-foreground text-sm">
                    {(() => {
                      const code = profile?.preferred_language ?? "en";
                      return t[`lang_${code}`] ?? (code === "en" ? "English" : "Malayalam");
                    })()}
                  </span>
                )}
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </SettingRow>
            )}
          />
        </div>

        <SectionHeading title={t.section_account ?? "Account"} />
        <div className="flex flex-col">
          <SettingRow label={t.label_email ?? "Email Address"} description={t.desc_email ?? "Your email cannot be changed."}>
            <span className="text-muted-foreground text-sm">{profile?.email}</span>
          </SettingRow>
        </div>
      </form>
    </div>
  );
}