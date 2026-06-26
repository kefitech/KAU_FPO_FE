"use client";

import { useRef, useState } from "react";

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
import { DISTRICT_OPTIONS } from "@/types/fpo";

type Stage = "eligibility" | "phone-otp" | "account";

// ─── Eligibility form ─────────────────────────────────────────────────────────

const eligibilitySchema = z.object({
  member_count: z.coerce
    .number()
    .min(10, { message: "Minimum 10 members required" })
    .max(100000, { message: "Cannot exceed 1,00,000 members" }),
  district: z.string().min(1, { message: "Select a district" }),
  registered_under_act: z.boolean(),
  has_valid_registration: z.boolean(),
  has_bank_account: z.boolean(),
});

type EligibilityValues = {
  member_count: number;
  district: string;
  registered_under_act: boolean;
  has_valid_registration: boolean;
  has_bank_account: boolean;
};

function EligibilityStep({ onPass }: { onPass: (token: string) => void }) {
  const [errors, setErrors] = useState<string[]>([]);
  const [districtQuery, setDistrictQuery] = useState("");
  const skipNextInputChange = useRef(false);
  const filteredDistricts = DISTRICT_OPTIONS.filter((o) => o.label.toLowerCase().includes(districtQuery.toLowerCase()));
  const { register, handleSubmit, control, formState } = useForm<EligibilityValues>({
    resolver: zodResolver(eligibilitySchema) as unknown as Resolver<EligibilityValues>,
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
        setErrors(data?.errors ?? ["Your FPO does not meet the eligibility criteria."]);
      }
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Eligibility check failed. Please try again.");
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
        <h2 className="font-semibold text-lg">Eligibility Check</h2>
        <p className="mt-0.5 text-muted-foreground text-sm">
          Let's confirm your FPO meets the minimum requirements before registering.
        </p>
      </div>

      {errors.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <p className="flex items-center gap-1.5 font-medium text-destructive text-sm">
            <XCircle className="h-4 w-4 shrink-0" />
            Your FPO is not eligible yet
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
          District <span className="text-destructive">*</span>
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
              <ComboboxInput placeholder="Search district…" showClear={!!field.value} className="w-full" />
              <ComboboxContent>
                <ComboboxList>
                  {filteredDistricts.map((opt) => (
                    <ComboboxItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </ComboboxItem>
                  ))}
                  {filteredDistricts.length === 0 && (
                    <p className="py-2 text-center text-muted-foreground text-sm">No district found</p>
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
          Total Farmer Members <span className="text-destructive">*</span>
        </FieldLabel>
        <Input
          id="member_count"
          type="number"
          min={10}
          max={100000}
          placeholder="Minimum 10 required"
          className="w-48"
          onInput={(e) => {
            const el = e.currentTarget;
            if (el.value.length > 6) el.value = el.value.slice(0, 6);
          }}
          {...register("member_count")}
        />
        {formState.errors.member_count && <FieldError errors={[formState.errors.member_count]} />}
      </Field>

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <p className="font-medium text-muted-foreground text-sm">Requirements</p>
        {(
          [
            {
              name: "registered_under_act" as const,
              label: "Registered under an applicable Act (Companies / Cooperative / Producer Companies / Societies)",
            },
            { name: "has_valid_registration" as const, label: "Holds a valid registration certificate" },
            { name: "has_bank_account" as const, label: "Has an active bank account in the FPO's name" },
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
        className="gap-1.5 self-end bg-green-600 hover:bg-green-700"
        disabled={checkMutation.isPending}
      >
        {checkMutation.isPending ? "Checking…" : "Check Eligibility"}
        <ChevronRight className="h-4 w-4" />
      </Button>
    </form>
  );
}

// ─── Phone OTP step ───────────────────────────────────────────────────────────

function PhoneOtpStep({ onPass, onBack }: { onPass: (phoneToken: string, phone: string) => void; onBack: () => void }) {
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
      const msg = axiosErr?.response?.data?.message ?? axiosErr?.message ?? "Failed to send OTP. Please try again.";
      setPhoneError(msg);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () => fpoRegistrationApi.verifyPreRegisterOtp(phone, otp),
    onSuccess: (data) => {
      onPass(data.phone_token, phone);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Invalid OTP. Please try again.";
      setOtpError(msg);
    },
  });

  function handleSend() {
    if (!/^\d{10}$/.test(phone)) {
      setPhoneError("Enter a valid 10-digit phone number");
      return;
    }
    setPhoneError("");
    sendMutation.mutate();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-semibold text-lg">Verify Phone Number</h2>
        <p className="mt-0.5 text-muted-foreground text-sm">
          We'll send a one-time password to confirm your mobile number.
        </p>
      </div>

      {/* Phone input */}
      <Field>
        <FieldLabel htmlFor="phone">
          Phone Number <span className="text-destructive">*</span>
        </FieldLabel>
        <div className="flex gap-2">
          <Input
            id="phone"
            placeholder="10-digit mobile number"
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
            {sendMutation.isPending ? "Sending…" : otpSent ? "Resend" : "Send OTP"}
          </Button>
        </div>
        {phoneError && <p className="mt-1 text-destructive text-xs">{phoneError}</p>}
      </Field>

      {/* OTP input — shown after send */}
      {otpSent && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 dark:border-green-800 dark:bg-green-950/30">
            <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <p className="text-green-700 text-xs dark:text-green-300">
              OTP sent to <span className="font-medium font-mono">{maskedPhone}</span>
            </p>
          </div>

          <Field>
            <FieldLabel htmlFor="otp">Enter OTP</FieldLabel>
            <Input
              id="otp"
              placeholder="6-digit OTP"
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
          ← Back
        </Button>
        {otpSent && (
          <Button
            type="button"
            className="gap-1.5 bg-green-600 hover:bg-green-700"
            onClick={() => verifyMutation.mutate()}
            disabled={verifyMutation.isPending || otp.length < 6}
          >
            {verifyMutation.isPending ? "Verifying…" : "Verify & Continue"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Account creation form ────────────────────────────────────────────────────

const accountSchema = z
  .object({
    first_name: z
      .string()
      .min(1, { message: "First name is required" })
      .max(20, { message: "First name must be at most 20 characters" }),
    last_name: z
      .string()
      .min(1, { message: "Last name is required" })
      .max(20, { message: "Last name must be at most 20 characters" }),
    email: z
      .string()
      .email({ message: "Enter a valid email address" })
      .max(35, { message: "Email must be at most 35 characters" }),
    password: z
      .string()
      .min(8, { message: "At least 8 characters" })
      .regex(/[A-Z]/, { message: "At least one uppercase letter" })
      .regex(/[a-z]/, { message: "At least one lowercase letter" })
      .regex(/[0-9]/, { message: "At least one number" }),
    confirm_password: z.string().min(1, { message: "Please confirm your password" }),
  })
  .refine((v) => v.password === v.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type AccountValues = z.infer<typeof accountSchema>;

function AccountStep({
  onBack,
  eligibilityToken,
  phoneToken,
  verifiedPhone,
}: {
  onBack: () => void;
  eligibilityToken: string;
  phoneToken: string;
  verifiedPhone: string;
}) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
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
      toast.success("Account created! Please log in to continue.");
      router.push("/v1/login");
    },
    onError: (err: unknown) => {
      const apiErr = err as { data?: { errors?: Record<string, string[]> }; message?: string } | undefined;
      const serverErrors = apiErr?.data?.errors;
      if (serverErrors && Object.keys(serverErrors).length > 0) {
        Object.entries(serverErrors).forEach(([field, messages]) => {
          setError(field as keyof AccountValues, { type: "server", message: messages[0] });
        });
      } else {
        toast.error(apiErr?.message ?? "Registration failed. Please try again.");
      }
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => submitMutation.mutate(v))} className="flex flex-col gap-5">
      <div>
        <h2 className="font-semibold text-lg">Create Your Account</h2>
        <p className="mt-0.5 text-muted-foreground text-sm">This account will be used to manage your FPO profile.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="first_name">
            First Name <span className="text-destructive">*</span>
          </FieldLabel>
          <Input id="first_name" placeholder="e.g. Rajan" {...register("first_name")} />
          {errors.first_name && <FieldError errors={[errors.first_name]} />}
        </Field>

        <Field>
          <FieldLabel htmlFor="last_name">
            Last Name <span className="text-destructive">*</span>
          </FieldLabel>
          <Input id="last_name" placeholder="e.g. Kumar" {...register("last_name")} />
          {errors.last_name && <FieldError errors={[errors.last_name]} />}
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="email">
          Email Address <span className="text-destructive">*</span>
        </FieldLabel>
        <Input id="email" type="email" placeholder="rajan@example.com" {...register("email")} />
        {errors.email && <FieldError errors={[errors.email]} />}
      </Field>

      {/* Phone is pre-verified — show as read-only */}
      <Field>
        <FieldLabel>Phone Number</FieldLabel>
        <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-muted/50 px-3 text-muted-foreground text-sm">
          <span className="font-mono">{verifiedPhone}</span>
          <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-green-600" />
        </div>
        <p className="text-muted-foreground text-xs">Verified in previous step</p>
      </Field>

      <Field>
        <FieldLabel htmlFor="password">
          Password <span className="text-destructive">*</span>
        </FieldLabel>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Minimum 8 characters"
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
              { label: "At least 8 characters", met: passwordVal.length >= 8 },
              { label: "One uppercase letter (A–Z)", met: /[A-Z]/.test(passwordVal) },
              { label: "One lowercase letter (a–z)", met: /[a-z]/.test(passwordVal) },
              { label: "One number (0–9)", met: /[0-9]/.test(passwordVal) },
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
          Confirm Password <span className="text-destructive">*</span>
        </FieldLabel>
        <div className="relative">
          <Input
            id="confirm_password"
            type={showConfirm ? "text" : "password"}
            placeholder="Re-enter your password"
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
            <CheckCircle2 className="h-3.5 w-3.5" /> Passwords match
          </p>
        )}
        {!errors.confirm_password && passwordsMismatch && (
          <p className="flex items-center gap-1 text-destructive text-xs">
            <XCircle className="h-3.5 w-3.5" /> Passwords do not match
          </p>
        )}
      </Field>

      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button type="submit" className="gap-1.5 bg-green-600 hover:bg-green-700" disabled={submitMutation.isPending}>
          {submitMutation.isPending ? "Creating account…" : "Create Account & Continue"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STAGES: { key: Stage; label: string }[] = [
  { key: "eligibility", label: "Eligibility" },
  { key: "phone-otp", label: "Verify Phone" },
  { key: "account", label: "Account" },
];

const STAGE_ORDER: Stage[] = ["eligibility", "phone-otp", "account"];

export default function RegisterPage() {
  const [stage, setStage] = useState<Stage>("eligibility");
  const [eligibilityToken, setEligibilityToken] = useState("");
  const [phoneToken, setPhoneToken] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");

  const currentIndex = STAGE_ORDER.indexOf(stage);

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12">
      {/* Progress indicator */}
      <div className="mb-8 flex items-center gap-2">
        {STAGES.map(({ key, label }, i) => {
          const done = STAGE_ORDER.indexOf(key) < currentIndex;
          const active = key === stage;
          return (
            <div key={key} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 font-medium text-sm ${active ? "text-green-700" : done ? "text-muted-foreground" : "text-muted-foreground/50"}`}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${active ? "bg-green-600 text-white" : "bg-muted text-muted-foreground"}`}
                  >
                    {i + 1}
                  </span>
                )}
                {label}
              </div>
              {i < STAGES.length - 1 && <div className="h-px w-6 bg-border" />}
            </div>
          );
        })}
      </div>

      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        {stage === "eligibility" && (
          <EligibilityStep
            onPass={(token) => {
              setEligibilityToken(token);
              setStage("phone-otp");
            }}
          />
        )}
        {stage === "phone-otp" && (
          <PhoneOtpStep
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
            onBack={() => setStage("phone-otp")}
            eligibilityToken={eligibilityToken}
            phoneToken={phoneToken}
            verifiedPhone={verifiedPhone}
          />
        )}
      </div>
    </div>
  );
}
