"use client";

import { useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

import { fpoRegistrationApi } from "@/app/fpo/_api/fpo-registration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FpoProfile } from "@/types/fpo";

interface OtpSectionProps {
  type: "email" | "phone";
  contact: string;
  verified: boolean;
  onVerified: () => void;
}

function OtpSection({ type, contact, verified, onVerified }: OtpSectionProps) {
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const sendMutation = useMutation({
    mutationFn: () => (type === "email" ? fpoRegistrationApi.sendEmailOtp() : fpoRegistrationApi.sendPhoneOtp()),
    onSuccess: () => {
      setOtpSent(true);
      toast.success(`OTP sent to ${contact}`);
    },
    onError: (err: unknown) => {
      const error = err as { message?: string; data?: { message?: string } } | undefined;
      const msg = error?.data?.message ?? error?.message ?? "Failed to send OTP. Please try again.";
      toast.error(msg);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () =>
      type === "email" ? fpoRegistrationApi.confirmEmailOtp(otp) : fpoRegistrationApi.confirmPhoneOtp(otp),
    onSuccess: () => {
      toast.success(`${type === "email" ? "Email" : "Phone"} verified successfully`);
      onVerified();
    },
    onError: (err: unknown) => {
      const e = err as { message?: string; data?: { message?: string } };
      toast.error(e?.data?.message ?? e?.message ?? "Invalid OTP. Please check and try again.");
    },
  });

  const Icon = type === "email" ? Mail : Phone;
  const label = type === "email" ? "Office Email" : "Office Phone";

  if (verified) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
        <div>
          <p className="font-medium text-green-700 text-sm dark:text-green-300">{label} Verified</p>
          <p className="text-green-600 text-xs dark:text-green-400">{contact}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="font-medium text-sm">{label}</p>
      </div>
      <p className="text-muted-foreground text-sm">{contact}</p>

      {!otpSent ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full sm:w-fit"
          onClick={() => sendMutation.mutate()}
          disabled={sendMutation.isPending}
        >
          {sendMutation.isPending ? "Sending…" : `Send OTP to ${type === "email" ? "email" : "phone"}`}
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <label htmlFor={`otp-${type}`} className="text-muted-foreground text-xs">
            Enter 6-digit OTP
          </label>
          <div className="flex items-center gap-2">
            <Input
              id={`otp-${type}`}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-32 text-center font-mono tracking-widest"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => confirmMutation.mutate()}
              disabled={otp.length !== 6 || confirmMutation.isPending}
            >
              {confirmMutation.isPending ? "Verifying…" : "Verify"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
            >
              Resend
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface Step5Props {
  profile: FpoProfile;
  onSuccess: () => void;
  onBack: () => void;
}

export function Step5Verification({ profile, onSuccess, onBack }: Step5Props) {
  const [emailVerified, setEmailVerified] = useState(profile.email_verified);
  const [phoneVerified, setPhoneVerified] = useState(profile.phone_verified);

  const bothVerified = emailVerified && phoneVerified;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-semibold text-lg">Verify Contact Details</h2>
        <p className="mt-0.5 text-muted-foreground text-sm">
          Verify your office email and phone to continue. OTPs are valid for 10 minutes.
        </p>
      </div>

      <OtpSection
        type="email"
        contact={profile.office_email}
        verified={emailVerified}
        onVerified={() => setEmailVerified(true)}
      />

      <OtpSection
        type="phone"
        contact={profile.office_phone}
        verified={phoneVerified}
        onVerified={() => setPhoneVerified(true)}
      />

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button type="button" onClick={onSuccess} disabled={!bothVerified}>
          Continue →
        </Button>
      </div>
    </div>
  );
}
