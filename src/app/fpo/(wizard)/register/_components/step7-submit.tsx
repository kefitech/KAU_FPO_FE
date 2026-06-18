"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { fpoRegistrationApi } from "@/app/fpo/_api/fpo-registration";
import { Button } from "@/components/ui/button";
import type { FpoProfile } from "@/types/fpo";

interface Step7Props {
  profile: FpoProfile;
  onBack: () => void;
}

export function Step7Submit({ profile, onBack }: Step7Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const canSubmit = profile.submission_errors.length === 0;
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);

  const submitMutation = useMutation({
    mutationFn: () => fpoRegistrationApi.submit(),
    onSuccess: () => {
      toast.success("Application submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["fpo-me"] });
      queryClient.invalidateQueries({ queryKey: ["fpo-status"] });
      router.replace("/fpo/status");
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string | string[] } | undefined;
      if (Array.isArray(apiErr?.message)) {
        setSubmitErrors(apiErr.message);
      } else {
        toast.error(typeof apiErr?.message === "string" ? apiErr.message : "Submission failed. Please check all requirements and try again.");
      }
    },
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-semibold text-lg">Review & Submit</h2>
        <p className="mt-0.5 text-muted-foreground text-sm">
          Review the checklist below before submitting your application.
        </p>
      </div>

      {/* Checklist */}
      <div className="flex flex-col gap-2.5 rounded-lg border p-4">
        <p className="mb-1 font-medium text-sm">Submission Checklist</p>

        {canSubmit ? (
          <div className="flex items-center gap-2.5 py-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
            <p className="font-medium text-green-700 text-sm dark:text-green-300">
              All requirements met. Ready to submit!
            </p>
          </div>
        ) : (
          profile.submission_errors.map((err, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-muted-foreground text-sm">{err}</p>
            </div>
          ))
        )}
      </div>

      {/* Server-side submit errors */}
      {submitErrors.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <p className="font-medium text-destructive text-sm">Submission failed</p>
          {submitErrors.map((err, i) => (
            <div key={i} className="flex items-start gap-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-muted-foreground text-sm">{err}</p>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <p className="font-medium text-sm">Application Summary</p>
        <div className="grid gap-1.5 text-sm">
          <SummaryRow label="FPO Name" value={profile.name} />
          <SummaryRow label="Registration No." value={profile.registration_number} />
          <SummaryRow label="District" value={profile.district_display} />
          <SummaryRow label="Total Members" value={profile.total_members?.toString() ?? "—"} />
          <SummaryRow label="Primary Commodities" value={profile.primary_commodities.join(", ") || "—"} />
          <SummaryRow label="Bank" value={profile.bank_name || "—"} />
          <SummaryRow label="IFSC" value={profile.ifsc_code || "—"} />
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        By submitting, you confirm that all information provided is accurate. The application will be reviewed by the
        KAU team.
      </p>

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button
          type="button"
          onClick={() => submitMutation.mutate()}
          disabled={!canSubmit || submitMutation.isPending}
          className="min-w-32"
        >
          {submitMutation.isPending ? "Submitting…" : "Submit Application"}
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
