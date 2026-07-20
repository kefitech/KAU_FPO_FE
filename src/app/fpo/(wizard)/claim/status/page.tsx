"use client";

import { useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, FileSearch, FileUp, Loader2, Paperclip, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { fpoClaimApi } from "@/app/fpo/_api/claim";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { FpoClaim } from "@/types/fpo";

const STATUS_CONFIG: Record<
  FpoClaim["status"],
  { icon: React.ElementType; color: string; title: string; desc: string }
> = {
  pending: {
    icon: Clock,
    color: "text-yellow-600 dark:text-yellow-400",
    title: "Under Review",
    desc: "Your claim is under review by KAU Admin.",
  },
  approved: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    title: "Claim Approved",
    desc: "Claim approved. Please complete your FPO registration to access the dashboard.",
  },
  rejected: {
    icon: XCircle,
    color: "text-destructive",
    title: "Claim Rejected",
    desc: "",
  },
  docs_requested: {
    icon: FileSearch,
    color: "text-blue-600 dark:text-blue-400",
    title: "Documents Requested",
    desc: "KAU Admin has requested additional supporting documents.",
  },
  docs_submitted: {
    icon: FileUp,
    color: "text-purple-600 dark:text-purple-400",
    title: "Documents Submitted",
    desc: "Your documents have been submitted. KAU Admin will review them shortly.",
  },
};

function UploadRespondSection({ claim }: { claim: FpoClaim }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedDocs, setUploadedDocs] = useState<{ id: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const respondMutation = useMutation({
    mutationFn: () =>
      fpoClaimApi.respond(
        claim.id,
        uploadedDocs.map((d) => d.id),
      ),
    onSuccess: (msg) => {
      toast.success(msg || "Documents submitted successfully.");
      queryClient.invalidateQueries({ queryKey: ["fpo-claims"] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Failed to submit documents.");
    },
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploading(true);
    try {
      const doc = await fpoClaimApi.uploadDocument(claim.id, file);
      setUploadedDocs((prev) => [...prev, { id: doc.id, name: file.name }]);
      toast.success("Document uploaded.");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function removeDoc(id: string) {
    try {
      await fpoClaimApi.deleteDocument(claim.id, id);
      setUploadedDocs((prev) => prev.filter((d) => d.id !== id));
    } catch {
      toast.error("Failed to remove document.");
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3 border-t pt-4">
      <p className="font-medium text-sm">Upload Supporting Documents</p>

      {uploadedDocs.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {uploadedDocs.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm min-w-0"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate min-w-0">{doc.name}</span>
              <button
                type="button"
                onClick={() => removeDoc(doc.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleFileChange}
      />

      <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…
          </>
        ) : (
          <>
            <Paperclip className="mr-2 h-4 w-4" /> Add Document
          </>
        )}
      </Button>

      <p className="text-muted-foreground text-xs">Accepted: PDF, JPG, PNG. Max 5 MB per file.</p>

      <Button
        disabled={uploadedDocs.length === 0 || respondMutation.isPending}
        onClick={() => respondMutation.mutate()}
      >
        {respondMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
          </>
        ) : (
          "Submit Documents to Admin"
        )}
      </Button>
    </div>
  );
}

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

          {/* Status description */}
          {claim.status === "rejected" ? (
            <p className="mt-1 text-muted-foreground text-sm">
              Claim rejected.{claim.review_notes ? ` Reason: ${claim.review_notes}` : ""}
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground text-sm">{cfg.desc}</p>
          )}

          {/* Admin message for docs_requested and docs_submitted */}
          {(claim.status === "docs_requested" || claim.status === "docs_submitted") && claim.review_notes && (
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/40 dark:bg-blue-950/20">
              <p className="mb-1 font-medium text-blue-700 dark:text-blue-400 text-xs">Message from KAU Admin</p>
              <p className="text-sm leading-relaxed">{claim.review_notes}</p>
            </div>
          )}

          <p className="mt-2 text-muted-foreground text-xs">
            Submitted{" "}
            {new Date(claim.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>

          {claim.status === "approved" && (
            <Button size="sm" className="mt-3" onClick={() => router.push("/fpo/register")}>
              Continue Registration →
            </Button>
          )}

          {/* Upload & respond section — only when docs_requested */}
          {claim.status === "docs_requested" && <UploadRespondSection claim={claim} />}

          {/* Already submitted confirmation */}
          {claim.status === "docs_submitted" && (
            <p className="mt-3 text-purple-600 dark:text-purple-400 text-xs font-medium">
              ✓ You have submitted your documents. Waiting for admin review.
            </p>
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
      const hasActive = query.state.data?.some(
        (c) => c.status === "pending" || c.status === "docs_requested" || c.status === "docs_submitted",
      );
      return hasActive ? 60_000 : false;
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

      {claims.some((c) => c.status === "pending" || c.status === "docs_requested" || c.status === "docs_submitted") && (
        <p className="text-center text-muted-foreground text-xs">This page refreshes automatically every minute.</p>
      )}
    </div>
  );
}
