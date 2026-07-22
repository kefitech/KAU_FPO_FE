"use client";

import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, Eye, EyeOff, Smartphone, XCircle } from "lucide-react";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { fpoRegistrationApi } from "@/app/fpo/_api/fpo-registration";
import { Button } from "@/components/ui/button";
import { Combobox, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import { DISTRICT_OPTIONS } from "@/types/fpo";

type Stage = "eligibility" | "phone-otp" | "account";
type T = Record<string, string>;

// ─── Eligibility form ─────────────────────────────────────────────────────────

type EligibilityValues = {
  member_count: number;
  district: string;
  registered_under_act: boolean;
  has_valid_registration: boolean;
  has_bank_account: boolean;
};

function EligibilityStep({ onPass, t }: { onPass: (token: string) => void; t: T }) {
  const [errors, setErrors] = useState<string[]>([]);
  const [districtQuery, setDistrictQuery] = useState("");
  const skipNextInputChange = useRef(false);

  const filteredDistricts = DISTRICT_OPTIONS.filter((o) =>
    o.label.toLowerCase().includes(districtQuery.toLowerCase())
  );

  const schema = z.object({
    member_count: z.coerce
      .number()
      .min(10, { message: t.eligibility_err_member_min ?? "Minimum 10 members required" })
      .max(100000, { message: t.eligibility_err_member_max ?? "Cannot exceed 1,00,000 members" }),
    district: z.string().min(1, { message: t.eligibility_err_district ?? "Select a district" }),
    registered_under_act: z.boolean(),
    has_valid_registration: z.boolean(),
    has_bank_account: z.boolean(),
  });

  const { register, handleSubmit, control, formState, setValue } = useForm<EligibilityValues>({
    resolver: zodResolver(schema) as unknown as Resolver<EligibilityValues>,
    mode: "onTouched",
    defaultValues: {
      member_count: undefined,
      district: "",
      registered_under_act: false,
      has_valid_registration: false,
      has_bank_account: false,
    },
  });

  const checkMutation = useMutation({
    mutationFn: (values: EligibilityValues) => fpoRegistrationApi.checkEligibility(values),
    onSuccess: (data) => {
      if (data?.eligible && data.eligibility_token) {
        onPass(data.eligibility_token);
      } else {
        setErrors(data?.errors ?? [t.eligibility_err_default ?? "Your FPO does not meet the eligibility criteria."]);
      }
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : (t.eligibility_err_failed ?? "Eligibility check failed. Please try again."));
    },
  });

  return (
    <form
      onSubmit={handleSubmit((v) => {
        setErrors([]);
        checkMutation.mutate(v);
      })}
      className="flex flex-col gap-5"
    >
      <div>
        <h2 className="font-semibold text-lg">{t.eligibility_heading ?? "Eligibility Check"}</h2>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.eligibility_subheading ?? "Let's confirm your FPO meets the minimum requirements before registering."}
        </p>
      </div>

      {errors.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <p className="flex items-center gap-1.5 font-medium text-destructive text-sm">
            <XCircle className="h-4 w-4 shrink-0" />
            {t.eligibility_ineligible ?? "Your FPO is not eligible yet"}
          </p>
          <ul className="flex flex-col gap-1">
            {errors.map((e, i) => (
              <li key={i} className="text-destructive text-xs">
                • {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Field>
        <FieldLabel htmlFor="district">
          {t.eligibility_district_label ?? "District"} <span className="text-destructive">*</span>
        </FieldLabel>
        <Controller
          control={control}
          name="district"
          render={({ field }) => (
            <Combobox
              value={field.value}
              onValueChange={(v) => {
                field.onChange(v);
                const label = DISTRICT_OPTIONS.find((o) => o.value === v)?.label ?? "";
                skipNextInputChange.current = true;
                setDistrictQuery(label);
              }}
              inputValue={districtQuery}
              onInputValueChange={(v) => {
                if (skipNextInputChange.current) {
                  skipNextInputChange.current = false;
                  return;
                }
                setDistrictQuery(v ?? "");
              }}
            >
              <ComboboxInput
                placeholder={t.eligibility_district_ph ?? "Search district…"}
                showClear={!!field.value}
                className="w-full"
              />
              <ComboboxContent>
                <ComboboxList>
                  {filteredDistricts.map((opt) => (
                    <ComboboxItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </ComboboxItem>
                  ))}
                  {filteredDistricts.length === 0 && (
                    <p className="py-2 text-center text-muted-foreground text-sm">
                      {t.eligibility_district_empty ?? "No district found"}
                    </p>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          )}
        />
        {formState.errors.district && <FieldError errors={[formState.errors.district]} />}
      </Field>

      <Field>
        <FieldLabel htmlFor="member_count">
          {t.eligibility_members_label ?? "Total Farmer Members"} <span className="text-destructive">*</span>
        </FieldLabel>
        <Input
          id="member_count"
          type="number"
          min={10}
          max={100000}
          placeholder={t.eligibility_members_ph ?? "Minimum 10 required"}
          className="w-full sm:w-48"
          onInput={(e) => {
            const el = e.currentTarget;
            if (el.value.length > 6) el.value = el.value.slice(0, 6);
          }}
          {...register("member_count")}
        />
        {formState.errors.member_count && <FieldError errors={[formState.errors.member_count]} />}
      </Field>

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <p className="font-medium text-muted-foreground text-sm">
            {t.eligibility_requirements ?? "Requirements"}
          </p>
          <button
            type="button"
            className="text-green-600 text-xs hover:underline"
            onClick={() => {
              setValue("registered_under_act", true);
              setValue("has_valid_registration", true);
              setValue("has_bank_account", true);
            }}
          >
            {t.eligibility_accept_all ?? "Accept all"}
          </button>
        </div>
        {(
          [
            {
              name: "registered_under_act" as const,
              label: t.eligibility_req1 ?? "Registered under an applicable Act (Companies / Cooperative / Producer Companies / Societies)",
            },
            {
              name: "has_valid_registration" as const,
              label: t.eligibility_req2 ?? "Holds a valid registration certificate",
            },
            {
              name: "has_bank_account" as const,
              label: t.eligibility_req3 ?? "Has an active bank account in the FPO's name",
            },
          ] as const
        ).map(({ name, label }) => (
          <label key={name} className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-input accent-green-600"
              {...register(name)}
            />
            <span className="text-sm">{label}</span>
          </label>
        ))}
      </div>

      <Button
        type="submit"
        className="gap-1.5 w-full sm:w-auto sm:self-end bg-green-600 hover:bg-green-700"
        disabled={checkMutation.isPending}
      >
        {checkMutation.isPending
          ? (t.eligibility_btn_checking ?? "Checking…")
          : (t.eligibility_btn_check ?? "Check Eligibility")}
        <ChevronRight className="h-4 w-4" />
      </Button>
    </form>
  );
}

// ─── Phone OTP step ───────────────────────────────────────────────────────────

function PhoneOtpStep({
  onPass,
  onBack,
  t,
}: {
  onPass: (phoneToken: string, phone: string) => void;
  onBack: () => void;
  t: T;
}) {
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");

  const sendMutation = useMutation({
    mutationFn: () => fpoRegistrationApi.sendPreRegisterOtp(phone),
    onSuccess: (data) => {
      setMaskedPhone(data.phone);
      setOtpSent(true);
      setPhoneError("");
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string } | undefined;
      const msg = axiosErr?.response?.data?.message ?? axiosErr?.message ?? (t.phone_err_send_failed ?? "Failed to send OTP. Please try again.");
      setPhoneError(msg);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () => fpoRegistrationApi.verifyPreRegisterOtp(phone, otp),
    onSuccess: (data) => {
      onPass(data.phone_token, phone);
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string } | undefined;
      const msg = axiosErr?.response?.data?.message ?? axiosErr?.message ?? (t.phone_err_invalid_otp ?? "Invalid OTP. Please try again.");
      setOtpError(msg);
    },
  });

  function handleSend() {
    if (!/^\d{10}$/.test(phone)) {
      setPhoneError(t.phone_err_phone ?? "Enter a valid 10-digit phone number");
      return;
    }
    setPhoneError("");
    sendMutation.mutate();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-semibold text-lg">{t.phone_heading ?? "Verify Phone Number"}</h2>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.phone_subheading ?? "We'll send a one-time password to confirm your mobile number."}
        </p>
      </div>

      <Field>
        <FieldLabel htmlFor="phone">
          {t.phone_label ?? "Phone Number"} <span className="text-destructive">*</span>
        </FieldLabel>
        <div className="flex gap-2">
          <Input
            id="phone"
            placeholder={t.phone_placeholder ?? "10-digit mobile number"}
            maxLength={10}
            value={phone}
            inputMode="numeric"
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              setPhone(val);
              setPhoneError("");
            }}
            disabled={otpSent}
            className="flex-1"
          />
          <Button
            type="button"
            variant={otpSent ? "outline" : "default"}
            className={otpSent ? "" : "bg-green-600 hover:bg-green-700"}
            onClick={handleSend}
            disabled={sendMutation.isPending}
          >
            {sendMutation.isPending
              ? (t.phone_btn_sending ?? "Sending…")
              : otpSent
              ? (t.phone_btn_resend ?? "Resend")
              : (t.phone_btn_send ?? "Send OTP")}
          </Button>
        </div>
        {phoneError && <p className="mt-1 text-destructive text-xs">{phoneError}</p>}
      </Field>

      {otpSent && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 dark:border-green-800 dark:bg-green-950/30">
            <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <p className="text-green-700 text-xs dark:text-green-300">
              {t.phone_otp_sent ?? "OTP sent to"}{" "}
              <span className="font-medium font-mono">{maskedPhone}</span>
            </p>
          </div>

          <Field>
            <FieldLabel htmlFor="otp">{t.phone_otp_label ?? "Enter OTP"}</FieldLabel>
            <Input
              id="otp"
              placeholder={t.phone_otp_placeholder ?? "6-digit OTP"}
              maxLength={6}
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value);
                setOtpError("");
              }}
              className="w-40 text-center font-mono text-lg tracking-widest"
            />
            {otpError && <p className="mt-1 text-destructive text-xs">{otpError}</p>}
          </Field>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="outline" onClick={onBack}>
          {t.btn_back ?? "← Back"}
        </Button>
        {otpSent && (
          <Button
            type="button"
            className="gap-1.5 bg-green-600 hover:bg-green-700"
            onClick={() => verifyMutation.mutate()}
            disabled={verifyMutation.isPending || otp.length < 6}
          >
            {verifyMutation.isPending
              ? (t.phone_btn_verifying ?? "Verifying…")
              : (t.phone_btn_verify ?? "Verify & Continue")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Account creation form ────────────────────────────────────────────────────

type AccountValues = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
};

function AccountStep({
  onBack,
  onResetToEligibility,
  eligibilityToken,
  phoneToken,
  verifiedPhone,
  t,
}: {
  onBack: () => void;
  onResetToEligibility: () => void;
  eligibilityToken: string;
  phoneToken: string;
  verifiedPhone: string;
  t: T;
}) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const schema = z
    .object({
      first_name: z
        .string()
        .min(1, { message: t.account_err_first_name_required ?? "First name is required" })
        .max(30, { message: t.account_err_first_name_max ?? "First name must be at most 30 characters" }),
      last_name: z
        .string()
        .min(1, { message: t.account_err_last_name_required ?? "Last name is required" })
        .max(30, { message: t.account_err_last_name_max ?? "Last name must be at most 30 characters" }),
      email: z
        .string()
        .email({ message: t.account_err_email ?? "Enter a valid email address" })
        .max(35, { message: t.account_err_email_max ?? "Email must be at most 35 characters" }),
      password: z
        .string()
        .min(8, { message: t.account_err_pwd_min ?? "At least 8 characters" })
        .regex(/[A-Z]/, { message: t.account_err_pwd_uppercase ?? "At least one uppercase letter" })
        .regex(/[a-z]/, { message: t.account_err_pwd_lowercase ?? "At least one lowercase letter" })
        .regex(/[0-9]/, { message: t.account_err_pwd_number ?? "At least one number" })
        .regex(/[^A-Za-z0-9]/, { message: t.account_err_pwd_special ?? "At least one special character" }),
      confirm_password: z.string().min(1, { message: t.account_err_confirm ?? "Please confirm your password" }),
    })
    .refine((v) => v.password === v.confirm_password, {
      message: t.account_err_pwd_match ?? "Passwords do not match",
      path: ["confirm_password"],
    });

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<AccountValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const passwordVal = watch("password") ?? "";
  const confirmVal = watch("confirm_password") ?? "";
  const passwordsMatch = passwordVal.length >= 8 && confirmVal.length > 0 && passwordVal === confirmVal;
  const passwordsMismatch = confirmVal.length > 0 && passwordVal !== confirmVal;

  const submitMutation = useMutation({
    mutationFn: (values: AccountValues) =>
      authApi.register({
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        phone: verifiedPhone,
        password: values.password,
        confirm_password: values.confirm_password,
        eligibility_token: eligibilityToken,
        phone_token: phoneToken,
      }),
    onSuccess: () => {
      toast.success(t.account_success ?? "Account created! Please log in to continue.");
      router.push("/v1/login");
    },
    onError: (err: unknown) => {
      const axiosErr = err as
        | { response?: { data?: { message?: string; errors?: Record<string, string[]> } }; message?: string }
        | undefined;

      const serverErrors = axiosErr?.response?.data?.errors;

      if (serverErrors?.eligibility_token) {
        toast.error(serverErrors.eligibility_token[0]);
        onResetToEligibility();
        return;
      }

      if (serverErrors?.phone_token) {
        toast.error(serverErrors.phone_token[0]);
        onBack();
        return;
      }

      const FORM_FIELDS = new Set<keyof AccountValues>([
        "first_name",
        "last_name",
        "email",
        "password",
        "confirm_password",
      ]);
      const fieldErrors = Object.entries(serverErrors ?? {}).filter(([f]) =>
        FORM_FIELDS.has(f as keyof AccountValues)
      );

      if (fieldErrors.length > 0) {
        fieldErrors.forEach(([field, messages]) => {
          setError(field as keyof AccountValues, { type: "server", message: messages[0] });
        });
      } else {
        toast.error(
          axiosErr?.response?.data?.message ??
            axiosErr?.message ??
            (t.account_err_failed ?? "Registration failed. Please try again.")
        );
      }
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => submitMutation.mutate(v))} className="flex flex-col gap-5">
      <div>
        <h2 className="font-semibold text-lg">{t.account_heading ?? "Create Your Account"}</h2>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.account_subheading ?? "This account will be used to manage your FPO profile."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="first_name">
            {t.account_first_name ?? "First Name"} <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="first_name"
            placeholder={t.account_first_name_ph ?? "e.g. Rajan"}
            maxLength={50}
            {...register("first_name")}
          />
          {errors.first_name && <FieldError errors={[errors.first_name]} />}
        </Field>

        <Field>
          <FieldLabel htmlFor="last_name">
            {t.account_last_name ?? "Last Name"} <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="last_name"
            placeholder={t.account_last_name_ph ?? "e.g. Kumar"}
            maxLength={50}
            {...register("last_name")}
          />
          {errors.last_name && <FieldError errors={[errors.last_name]} />}
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="email">
          {t.account_email ?? "Email Address"} <span className="text-destructive">*</span>
        </FieldLabel>
        <Input
          id="email"
          type="email"
          placeholder={t.account_email_ph ?? "rajan@example.com"}
          {...register("email")}
        />
        {errors.email && <FieldError errors={[errors.email]} />}
      </Field>

      <Field>
        <FieldLabel>{t.account_phone ?? "Phone Number"}</FieldLabel>
        <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-muted/50 px-3 text-muted-foreground text-sm">
          <span className="font-mono">{verifiedPhone}</span>
          <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-green-600" />
        </div>
        <p className="text-muted-foreground text-xs">
          {t.account_phone_verified ?? "Verified in previous step"}
        </p>
      </Field>

      <Field>
        <FieldLabel htmlFor="password">
          {t.account_password ?? "Password"} <span className="text-destructive">*</span>
        </FieldLabel>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder={t.account_password_ph ?? "Minimum 8 characters"}
            className="pr-10"
            {...register("password")}
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
        {passwordVal.length > 0 && (
          <div className="flex flex-col gap-1 pt-1">
            {[
              { label: t.account_pwd_min_chars ?? "At least 8 characters", met: passwordVal.length >= 8 },
              { label: t.account_pwd_uppercase ?? "One uppercase letter (A–Z)", met: /[A-Z]/.test(passwordVal) },
              { label: t.account_pwd_lowercase ?? "One lowercase letter (a–z)", met: /[a-z]/.test(passwordVal) },
              { label: t.account_pwd_number ?? "One number (0–9)", met: /[0-9]/.test(passwordVal) },
              { label: t.account_pwd_special ?? "One special character (!@#$…)", met: /[^A-Za-z0-9]/.test(passwordVal) },
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

      <Field>
        <FieldLabel htmlFor="confirm_password">
          {t.account_confirm ?? "Confirm Password"} <span className="text-destructive">*</span>
        </FieldLabel>
        <div className="relative">
          <Input
            id="confirm_password"
            type={showConfirm ? "text" : "password"}
            placeholder={t.account_confirm_ph ?? "Re-enter your password"}
            className="pr-10"
            {...register("confirm_password")}
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
        {errors.confirm_password && <FieldError errors={[errors.confirm_password]} />}
        {!errors.confirm_password && passwordsMatch && (
          <p className="flex items-center gap-1 text-green-600 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t.account_passwords_match ?? "Passwords match"}
          </p>
        )}
        {!errors.confirm_password && passwordsMismatch && (
          <p className="flex items-center gap-1 text-destructive text-xs">
            <XCircle className="h-3.5 w-3.5" />
            {t.account_passwords_mismatch ?? "Passwords do not match"}
          </p>
        )}
      </Field>

      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="outline" onClick={onBack}>
          {t.btn_back ?? "← Back"}
        </Button>
        <Button type="submit" className="gap-1.5 bg-green-600 hover:bg-green-700" disabled={submitMutation.isPending}>
          {submitMutation.isPending
            ? (t.account_btn_creating ?? "Creating account…")
            : (t.account_btn_create ?? "Create Account & Continue")}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STAGE_ORDER: Stage[] = ["eligibility", "phone-otp", "account"];

export default function RegisterPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [stage, setStage] = useState<Stage>("eligibility");
  const [eligibilityToken, setEligibilityToken] = useState("");
  const [phoneToken, setPhoneToken] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");

  useEffect(() => {
    if (!locale) return;
    translationsApi.getPublic(locale, "register").then((data) => {
      setT(data.register ?? {});
    });
  }, [locale]);

  const stages: { key: Stage; label: string }[] = [
    { key: "eligibility", label: t.stage_eligibility ?? "Eligibility" },
    { key: "phone-otp", label: t.stage_phone ?? "Verify Phone" },
    { key: "account", label: t.stage_account ?? "Account" },
  ];

  const currentIndex = STAGE_ORDER.indexOf(stage);

  return (
    <div className="flex flex-col items-center justify-center px-4 py-6 sm:py-12">
      {/* Progress indicator */}
      <div className="mb-6 sm:mb-8 flex items-center gap-1.5 sm:gap-2">
        {stages.map(({ key, label }, i) => {
          const done = STAGE_ORDER.indexOf(key) < currentIndex;
          const active = key === stage;
          return (
            <div key={key} className="flex items-center gap-1.5 sm:gap-2">
              <div
                className={`flex items-center gap-1.5 font-medium text-sm ${
                  active ? "text-green-700" : done ? "text-muted-foreground" : "text-muted-foreground/50"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                      active ? "bg-green-600 text-white" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                )}
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden text-xs">{label}</span>
              </div>
              {i < stages.length - 1 && <div className="h-px w-4 sm:w-6 bg-border shrink-0" />}
            </div>
          );
        })}
      </div>

      <div className="w-full max-w-md rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
        {stage === "eligibility" && (
          <EligibilityStep
            t={t}
            onPass={(token) => {
              setEligibilityToken(token);
              setStage("phone-otp");
            }}
          />
        )}
        {stage === "phone-otp" && (
          <PhoneOtpStep
            t={t}
            onPass={(token, phone) => {
              setPhoneToken(token);
              setVerifiedPhone(phone);
              setStage("account");
            }}
            onBack={() => setStage("eligibility")}
          />
        )}
        {stage === "account" && (
          <AccountStep
            t={t}
            onBack={() => setStage("phone-otp")}
            onResetToEligibility={() => setStage("eligibility")}
            eligibilityToken={eligibilityToken}
            phoneToken={phoneToken}
            verifiedPhone={verifiedPhone}
          />
        )}
      </div>
    </div>
  );
}
