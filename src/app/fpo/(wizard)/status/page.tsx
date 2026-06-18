"use client";

import { useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, CheckCircle2, Clock, FileText, RefreshCw, XCircle } from "lucide-react";

import { fpoRegistrationApi } from "@/app/fpo/_api/fpo-registration";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { FpoStatus } from "@/types/fpo";

const STATUS_CONFIG: Record<FpoStatus, { label: string; color: string; icon: React.ElementType; description: string }> =
  {
    draft: {
      label: "Draft",
      color: "bg-muted text-muted-foreground",
      icon: FileText,
      description: "Your application is still being filled out.",
    },
    submitted: {
      label: "Submitted",
      color: "bg-blue-100 text-blue-700",
      icon: Clock,
      description: "Your application has been submitted and is awaiting review.",
    },
    under_review: {
      label: "Under Review",
      color: "bg-amber-100 text-amber-700",
      icon: AlertCircle,
      description: "Our team is reviewing your application.",
    },
    approved: {
      label: "Approved",
      color: "bg-green-100 text-green-700",
      icon: CheckCircle2,
      description: "Congratulations! Your FPO has been approved.",
    },
    rejected: {
      label: "Rejected",
      color: "bg-red-100 text-red-700",
      icon: XCircle,
      description: "Your application was not approved. See notes below.",
    },
    info_required: {
      label: "Info Required",
      color: "bg-orange-100 text-orange-700",
      icon: AlertCircle,
      description: "Additional information is required to proceed.",
    },
  };

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function FpoStatusPage() {
  const router = useRouter();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["fpo-status"],
    queryFn: fpoRegistrationApi.getStatus,
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) return null;

  const config = STATUS_CONFIG[data.status];
  const Icon = config.icon;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">Application Status</h1>
          {data.application_id && (
            <p className="mt-0.5 text-muted-foreground text-sm">
              Application ID: <span className="font-mono">{data.application_id}</span>
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Status card */}
      <div className="flex items-start gap-4 rounded-xl border bg-card p-6">
        <div className={`rounded-full p-2.5 ${config.color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-lg">{config.label}</p>
            <Badge variant="outline" className={config.color}>
              {data.status_display}
            </Badge>
          </div>
          <p className="mt-1 text-muted-foreground text-sm">{config.description}</p>
          {data.current_tier && (
            <p className="mt-1 text-muted-foreground text-xs">
              Tier: <span className="font-medium">{data.current_tier}</span>
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {data.status === "info_required" && (
        <Button className="gap-2 self-start" onClick={() => router.push("/fpo/register")}>
          Update Application
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
      {data.status === "approved" && (
        <Button
          className="gap-2 self-start bg-green-600 hover:bg-green-700"
          onClick={() => router.push("/fpo/dashboard")}
        >
          Go to Dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}

      {/* Timeline */}
      {data.timeline.length > 0 && (
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-6">
          <p className="font-semibold text-sm">Activity Timeline</p>
          <ol className="relative ml-2 flex flex-col gap-0 border-muted border-l">
            {data.timeline.map((entry, _i) => (
              <li key={entry.id} className="mb-6 ml-4 last:mb-0">
                <span className="absolute -left-[7px] flex h-3.5 w-3.5 items-center justify-center rounded-full border bg-background" />
                <div className="flex flex-col gap-0.5">
                  <p className="font-medium text-sm">
                    {entry.from_status ? `${entry.from_status} → ${entry.to_status}` : entry.to_status}
                  </p>
                  {entry.notes && <p className="text-muted-foreground text-xs">{entry.notes}</p>}
                  <p className="text-muted-foreground text-xs">
                    {formatDate(entry.created_at)}
                    {entry.changed_by_name && ` · by ${entry.changed_by_name}`}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
