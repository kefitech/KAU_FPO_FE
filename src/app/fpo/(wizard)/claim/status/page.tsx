"use client";

import { useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

import { fpoClaimApi } from "@/app/fpo/_api/claim";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { FpoClaim } from "@/types/fpo";

const STATUS_CONFIG: Record<FpoClaim["status"], { icon: React.ElementType; color: string; title: string; message: (claim: FpoClaim) => string }> = {
  pending: {
    icon: Clock,
    color: "text-yellow-600 dark:text-yellow-400",
    title: "Under Review",
    message: () => "Your claim is under review by KAU Admin.",
  },
  approved: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    title: "Claim Approved",
    message: () => "Claim approved. You now have full access to this FPO.",
  },
  rejected: {
    icon: XCircle,
    color: "text-destructive",
    title: "Claim Rejected",
    message: (c) => `Claim rejected.${c.review_notes ? ` Reason: ${c.review_notes}` : ""}`,
  },
};

function ClaimCard({ claim }: { claim: FpoClaim }) {
  const router = useRouter();
  const cfg = STATUS_CONFIG[claim.status];
  const Icon = cfg.icon;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${cfg.color}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-sm">{claim.fpo_name}</p>
            <span className={`shrink-0 text-xs font-medium ${cfg.color}`}>{cfg.title}</span>
          </div>
          <p className="mt-1 text-muted-foreground text-sm">{cfg.message(claim)}</p>
          <p className="mt-2 text-muted-foreground text-xs">
            Submitted {new Date(claim.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          {claim.status === "approved" && (
            <Button
              size="sm"
              className="mt-3"
              onClick={() => router.push("/fpo/dashboard")}
            >
              Go to Dashboard →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClaimStatusPage() {
  const router = useRouter();

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ["fpo-claims"],
    queryFn: fpoClaimApi.list,
    staleTime: 30_000,
    refetchInterval: (query) => {
      const hasPending = query.state.data?.some((c) => c.status === "pending");
      return hasPending ? 60_000 : false;
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="font-bold text-xl">Claim Status</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">Track your ownership claim requests</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : claims.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-10 text-center">
          <Loader2 className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">No claims found.</p>
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {claims.map((claim) => (
            <ClaimCard key={claim.id} claim={claim} />
          ))}
        </div>
      )}

      {claims.some((c) => c.status === "pending") && (
        <p className="text-center text-muted-foreground text-xs">
          This page refreshes automatically every minute.
        </p>
      )}
    </div>
  );
}
