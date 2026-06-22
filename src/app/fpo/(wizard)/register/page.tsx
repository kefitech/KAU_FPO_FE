"use client";

import { Suspense, useEffect, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Volume2, VolumeX } from "lucide-react";

import { fpoRegistrationApi } from "@/app/fpo/_api/fpo-registration";
import { Skeleton } from "@/components/ui/skeleton";
import { useVoiceGuidance } from "@/hooks/use-voice-guidance";
import type { FpoProfile } from "@/types/fpo";

import { StepIndicator } from "./_components/step-indicator";
import { Step1BasicInfo } from "./_components/step1-basic-info";
import { Step2Contact } from "./_components/step2-contact";
import { Step3Signatory } from "./_components/step3-signatory";
import { Step4Business } from "./_components/step4-business";
import { Step5Verification } from "./_components/step5-verification";
import { Step6Documents } from "./_components/step6-documents";
import { Step7Submit } from "./_components/step7-submit";

function resolveStep(profile: FpoProfile): number {
  if (profile.current_step <= 1) return 2;
  if (profile.current_step === 2) return 3;
  if (profile.current_step === 3) return 4;
  // current_step >= 4: business details done.
  // OTP verification does not increment current_step — check the flags directly.
  if (!profile.email_verified || !profile.phone_verified) return 5;
  if (!profile.required_docs_uploaded) return 6;
  return 7;
}

function FpoRegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { voiceEnabled, toggleVoice } = useVoiceGuidance();

  // Skip GET /api/fpo/me/ only on the true first visit right after account creation.
  // The register flow sets "fpo_first_visit" in sessionStorage; we consume it once here.
  // On any subsequent load (refresh, back-navigation, direct URL) the flag is absent → always fetch.
  const [skipInitialFetch] = useState(() => {
    if (typeof window === "undefined") return false;
    const isFirstVisit = sessionStorage.getItem("fpo_first_visit") === "1";
    if (isFirstVisit) sessionStorage.removeItem("fpo_first_visit");
    return isFirstVisit;
  });

  const [profile, setProfile] = useState<FpoProfile | null>(null);
  const [displayStep, setDisplayStep] = useState<number | null>(skipInitialFetch ? 1 : null);

  const {
    data: fetchedProfile,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["fpo-me"],
    queryFn: fpoRegistrationApi.getProfile,
    enabled: !skipInitialFetch,
    staleTime: 30_000,
    retry: false,
  });

  // New user — no FPO record yet. Start at step 1.
  useEffect(() => {
    if (isError) setDisplayStep(1);
  }, [isError]);

  useEffect(() => {
    if (!fetchedProfile) return;

    if (!["draft", "info_required"].includes(fetchedProfile.status)) {
      router.replace("/fpo/status");
      return;
    }

    setProfile(fetchedProfile);

    const urlStep = searchParams.get("step");
    const urlStepNum = urlStep ? parseInt(urlStep, 10) : null;

    setDisplayStep((prev) => {
      if (prev !== null) return prev;
      const serverStep = resolveStep(fetchedProfile);
      if (urlStepNum && urlStepNum >= 1 && urlStepNum <= 7) return urlStepNum;
      return serverStep;
    });
  }, [fetchedProfile, searchParams.get, router.replace]);

  async function handleStepSuccess() {
    const result = await refetch();
    if (result.data) {
      setProfile(result.data);
      setDisplayStep(resolveStep(result.data));
    }
  }

  async function handleSaveOnly() {
    const result = await refetch();
    if (result.data) setProfile(result.data);
  }

  function handleBack() {
    setDisplayStep((prev) => (prev && prev > 1 ? prev - 1 : prev));
  }

  if (isLoading || displayStep === null) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-8">
        <Skeleton className="h-10 w-full" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-8">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <StepIndicator current={displayStep} />
        </div>
        <button
          type="button"
          onClick={toggleVoice}
          title={voiceEnabled ? "Mute voice guidance" : "Enable voice guidance"}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        {displayStep === 1 && (
          <Step1BasicInfo
            profile={profile ?? undefined}
            onSave={(savedProfile) => {
              queryClient.setQueryData(["fpo-me"], savedProfile);
              setProfile(savedProfile);
            }}
            onSuccess={(savedProfile) => {
              queryClient.setQueryData(["fpo-me"], savedProfile);
              setProfile(savedProfile);
              setDisplayStep(2);
            }}
          />
        )}

        {displayStep === 2 && profile && (
          <Step2Contact profile={profile} onSave={handleSaveOnly} onSuccess={handleStepSuccess} onBack={handleBack} />
        )}

        {displayStep === 3 && profile && (
          <Step3Signatory profile={profile} onSave={handleSaveOnly} onSuccess={handleStepSuccess} onBack={handleBack} />
        )}

        {displayStep === 4 && profile && (
          <Step4Business profile={profile} onSave={handleSaveOnly} onSuccess={handleStepSuccess} onBack={handleBack} />
        )}

        {displayStep === 5 && profile && (
          <Step5Verification profile={profile} onSuccess={handleStepSuccess} onBack={handleBack} />
        )}

        {displayStep === 6 && <Step6Documents onSuccess={handleStepSuccess} onBack={handleBack} />}

        {displayStep === 7 && profile && <Step7Submit profile={profile} onBack={handleBack} />}
      </div>
    </div>
  );
}

export default function FpoRegisterPage() {
  return (
    <Suspense>
      <FpoRegisterPageInner />
    </Suspense>
  );
}
