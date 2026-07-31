"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, FileSearch, FileUp, Loader2, Paperclip, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { fpoClaimApi } from "@/app/fpo/_api/claim";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { FpoClaim } from "@/types/fpo";

function getStatusConfig(
  t: Record<string, string>,
): Record<FpoClaim["status"], { icon: React.ElementType; color: string; title: string; desc: string }> {
  return {
    pending: {
      icon: Clock,
      color: "text-yellow-600 dark:text-yellow-400",
      title: t.status_pending_title ?? "Under Review",
      desc: t.status_pending_desc ?? "Your claim is under review by KAU Admin.",
    },
    approved: {
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      title: t.status_approved_title ?? "Claim Approved",
      desc: t.status_approved_desc ?? "Claim approved. Please complete your FPO registration to access the dashboard.",
    },
    rejected: {
      icon: XCircle,
      color: "text-destructive",
      title: t.status_rejected_title ?? "Claim Rejected",
      desc: "",
    },
    docs_requested: {
      icon: FileSearch,
      color: "text-blue-600 dark:text-blue-400",
      title: t.status_docs_requested_title ?? "Documents Requested",
      desc: t.status_docs_requested_desc ?? "KAU Admin has requested additional supporting documents.",
    },
    docs_submitted: {
      icon: FileUp,
      color: "text-purple-600 dark:text-purple-400",
      title: t.status_docs_submitted_title ?? "Documents Submitted",
      desc: t.status_docs_submitted_desc ?? "Your documents have been submitted. KAU Admin will review them shortly.",
    },
  };
}


function UploadRespondSection({ claim, t }: { claim: FpoClaim; t: Record<string, string> }) {
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
      toast.success(msg || (t.toast_docs_submitted ?? "Documents submitted successfully."));
      queryClient.invalidateQueries({ queryKey: ["fpo-claims"] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? (t.toast_submit_failed ?? "Failed to submit documents."));
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
      toast.success(t.toast_doc_uploaded ?? "Document uploaded.");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? (t.toast_upload_failed ?? "Upload failed. Please try again."));
    } finally {
      setUploading(false);
    }
  }

  async function removeDoc(id: string) {
    try {
      await fpoClaimApi.deleteDocument(claim.id, id);
      setUploadedDocs((prev) => prev.filter((d) => d.id !== id));
    } catch {
      toast.error(t.toast_remove_failed ?? "Failed to remove document.");
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3 border-t pt-4">
      <p className="font-medium text-sm">{t.upload_docs_heading ?? "Upload Supporting Documents"}</p>
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
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t.btn_uploading ?? "Uploading…"}
          </>
        ) : (
          <>
            <Paperclip className="mr-2 h-4 w-4" /> {t.btn_add_document ?? "Add Document"}
          </>
        )}
      </Button>

      <p className="text-muted-foreground text-xs">{t.file_hint ?? "Accepted: PDF, JPG, PNG. Max 5 MB per file."}</p>

      <Button
        disabled={uploadedDocs.length === 0 || respondMutation.isPending}
        onClick={() => respondMutation.mutate()}
      >
        {respondMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t.btn_submitting ?? "Submitting…"}
          </>
        ) : (
          (t.btn_submit_to_admin ?? "Submit Documents to Admin")
        )}
      </Button>
    </div>
  );
}

function ClaimCard({ claim, t }: { claim: FpoClaim; t:Record<string, string> }) {
  const router = useRouter();
  const cfg = getStatusConfig(t)[claim.status];
  const Icon = cfg.icon;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-sm break-words">{claim.fpo_name}</p>
            <span className={`shrink-0 text-xs font-medium ${cfg.color}`}>{cfg.title}</span>
          </div>

          {/* Status description */}
          {claim.status === "rejected" ? (
            <p className="mt-1 text-muted-foreground text-sm break-words">
              {t.claim_rejected_prefix ?? "Claim rejected."}
              {claim.review_notes ? ` ${t.reason_prefix ?? "Reason:"} ${claim.review_notes}` : ""}
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground text-sm">{cfg.desc}</p>
          )}

          {/* Admin message for docs_requested and docs_submitted */}
          {(claim.status === "docs_requested" || claim.status === "docs_submitted") && claim.review_notes && (
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/40 dark:bg-blue-950/20">
              <p className="mb-1 font-medium text-blue-700 dark:text-blue-400 text-xs">{t.admin_message_heading ?? "Message from KAU Admin"}</p>
              <p className="text-sm leading-relaxed">{claim.review_notes}</p>
            </div>
          )}

          <p className="mt-2 text-muted-foreground text-xs">
            {t.submitted_prefix ?? "Submitted"}{" "}
            {new Date(claim.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>

          {claim.status === "approved" && (
            <Button size="sm" className="mt-3" onClick={() => router.push("/fpo/register")}>
              {t.btn_continue_registration ?? "Continue Registration →"}
            </Button>
          )}

          {/* Upload & respond section — only when docs_requested */}
          {claim.status === "docs_requested" && <UploadRespondSection claim={claim} t={t} />}

          {/* Already submitted confirmation */}
          {claim.status === "docs_submitted" && (
            <p className="mt-3 text-purple-600 dark:text-purple-400 text-xs font-medium">
              ✓ {t.docs_submitted_confirmation ?? "You have submitted your documents. Waiting for admin review."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClaimStatusPage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<Record<string, string>>({});


  useEffect(() => {
    if (!locale) return;
    translationsApi.getPublic(locale, "claim_status").then((data) => {
      setT(data.claim_status ?? {});
    });
  }, [locale]);



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
        <h1 className="font-bold text-xl">{t.page_title ?? "Claim Status"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">{t.page_subtitle ?? "Track your ownership claim requests"}</p>
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
          <p className="text-muted-foreground text-sm">{t.no_claims_found ?? "No claims found."}</p>
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            {t.btn_go_back ?? "Go Back"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {claims.map((claim) => (
            <ClaimCard key={claim.id} claim={claim} t={t} />
          ))}
        </div>
      )}

      {claims.some((c) => c.status === "pending" || c.status === "docs_requested" || c.status === "docs_submitted") && (
        <p className="text-center text-muted-foreground text-xs">{t.auto_refresh_notice ?? "This page refreshes automatically every minute."}</p>
      )}
    </div>
  );
}
