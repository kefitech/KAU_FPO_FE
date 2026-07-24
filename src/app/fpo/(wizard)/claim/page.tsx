"use client";

import { Suspense, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { useMutation } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { fpoClaimApi } from "@/app/fpo/_api/claim";
import { Button } from "@/components/ui/button";

function ClaimPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fpoId = Number(searchParams.get("fpo_id") ?? 0);
  const fpoName = searchParams.get("fpo_name") ?? "this FPO";
  const matchedField = searchParams.get("matched_field") ?? "";

  const [reason, setReason] = useState("");
  const reasonTrimmed = reason.trim();
  const reasonValid = reasonTrimmed.length >= 20;

  const submitMutation = useMutation({
    mutationFn: () => fpoClaimApi.submit(fpoId, reasonTrimmed, matchedField),
    onSuccess: () => {
      toast.success("Claim submitted. We'll review it shortly.");
      router.push("/fpo/claim/status");
    },
    onError: (err: unknown) => {
      const e = err as { status?: number; message?: string };
      if (e.status === 409) {
        toast.info(e.message ?? "You already have a pending claim for this FPO.");
        router.push("/fpo/claim/status");
      } else {
        toast.error(e.message ?? "Failed to submit claim. Please try again.");
      }
    },
  });

  if (!fpoId) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-6 py-12 text-center">
        <p className="text-muted-foreground text-sm">Invalid claim link. Please go back and try again.</p>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <ShieldCheck className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="font-bold text-xl">Claim Your Business</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Submit a claim for <span className="font-medium text-foreground">{fpoName}</span>
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block font-medium text-sm" htmlFor="reason">
              Why are you the legitimate owner? <span className="text-destructive">*</span>
            </label>
            <textarea
              id="reason"
              rows={6}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you are the legitimate owner of this FPO. Include your role, how the FPO was registered, and any supporting details…"
              className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-1 flex items-center justify-between">
              <p className="text-muted-foreground text-xs">Minimum 20 characters</p>
              <p
                className={`text-xs tabular-nums ${reasonTrimmed.length < 20 ? "text-muted-foreground" : "text-green-600 dark:text-green-400"}`}
              >
                {reasonTrimmed.length} / 20
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.back()}
              disabled={submitMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!reasonValid || submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit Claim"
              )}
            </Button>
          </div>
        </div>
      </div>

      <p className="text-center text-muted-foreground text-xs">
        KAU Admin will review your claim and notify you within 3–5 business days.
      </p>
    </div>
  );
}

export default function ClaimPage() {
  return (
    <Suspense>
      <ClaimPageInner />
    </Suspense>
  );
}
