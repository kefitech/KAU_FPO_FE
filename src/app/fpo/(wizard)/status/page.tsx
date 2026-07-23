"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, CheckCircle2, Clock, FileText, Paperclip, RefreshCw, Send, ShieldOff, XCircle } from "lucide-react";
import { toast } from "sonner";

import { fpoRegistrationApi } from "@/app/fpo/_api/fpo-registration";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
    suspended: {
      label: "Suspended",
      color: "bg-red-100 text-red-700",
      icon: ShieldOff,
      description: "Your FPO account has been suspended. Please contact the administrator.",
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
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["fpo-status"],
    queryFn: fpoRegistrationApi.getStatus,
    refetchInterval: 30_000,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => fpoRegistrationApi.uploadDocument("signatory_id", file),
    onSuccess: (res) => {
      const name = (res as { data?: { document_type_display?: string } })?.data?.document_type_display ?? "Document";
      setUploadedFileName(name);
      toast.success("Document uploaded");
    },
    onError: () => toast.error("Failed to upload document"),
  });

  const responseMutation = useMutation({
    mutationFn: () => fpoRegistrationApi.submitInfoResponse(notes),
    onSuccess: () => {
      toast.success("Response submitted");
      setNotes("");
      setUploadedFileName(null);
      queryClient.invalidateQueries({ queryKey: ["fpo-status"] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Failed to submit response");
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    // reset input so same file can be re-selected if needed
    e.target.value = "";
  }

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

      {/* Info required — show admin's message + response form */}
      {data.status === "info_required" && (() => {
        const adminNote = [...data.timeline].reverse().find((e) => e.notes);
        return (
          <div className="flex flex-col gap-4">
            {/* Admin message */}
            <div className="flex flex-col gap-3 rounded-xl border border-orange-200 bg-orange-50 p-5 dark:border-orange-800 dark:bg-orange-950/30">
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="font-semibold text-sm">Action Required</p>
              </div>
              {adminNote?.notes && (
                <p className="text-sm text-orange-900 dark:text-orange-200 whitespace-pre-line max-h-62 overflow-y-auto">
                  {adminNote.notes}
                </p>
              )}
            </div>

            {/* Response card */}
            <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
              <p className="font-semibold text-sm">Your Response</p>

              {/* Notes textarea */}
              <div className="flex flex-col gap-1.5">
                <label className="text-muted-foreground text-xs">
                  Reply Message <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe the additional information or clarification you are providing…"
                  rows={4}
                  className="max-h-62 overflow-y-auto"
                />
                {notes.length > 0 && notes.length < 10 && (
                  <p className="text-destructive text-xs">Minimum 10 characters required</p>
                )}
              </div>

              {/* File upload */}
              <div className="flex flex-col gap-1.5">
                <label className="text-muted-foreground text-xs">Attach Supporting Document (optional)</label>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    {uploadMutation.isPending ? "Uploading…" : "Attach File"}
                  </Button>
                  {uploadedFileName && (
                    <span className="text-green-600 text-sm flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {uploadedFileName} uploaded
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">PDF, JPG or PNG · max 5 MB</p>
              </div>

              {/* Submit + Update Application */}
              <div className="flex flex-wrap gap-3 pt-1">
                <Button
                  className="gap-2"
                  onClick={() => responseMutation.mutate()}
                  disabled={responseMutation.isPending || notes.trim().length < 10}
                >
                  <Send className="h-4 w-4" />
                  {responseMutation.isPending ? "Submitting…" : "Submit Response"}
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => router.push("/fpo/register")}>
                  Update Application
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
      {data.status === "rejected" && (() => {
        const rejectionEntry = [...data.timeline].reverse().find((e) => e.to_status === "rejected" && e.notes);
        return rejectionEntry ? (
          <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-950/30">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <XCircle className="h-4 w-4 shrink-0" />
              <p className="font-semibold text-sm">Rejection Reason</p>
            </div>
            <p className="text-red-900 text-sm whitespace-pre-line dark:text-red-200">{rejectionEntry.notes}</p>
          </div>
        ) : null;
      })()}

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
          <ol className="relative ml-2 flex max-h-96 flex-col gap-0 border-muted border-l overflow-y-auto">
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
