"use client";

import { useRef } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { fpoRegistrationApi } from "@/app/fpo/_api/fpo-registration";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { type FpoDocument, type FpoDocumentType, OPTIONAL_DOC_CONFIG, REQUIRED_DOC_CONFIG } from "@/types/fpo";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocRowProps {
  label: string;
  docType: FpoDocumentType;
  maxSizeMB: number;
  uploaded?: FpoDocument;
  onUpload: (type: FpoDocumentType, file: File) => void;
  onDelete: (docId: string) => void;
  isUploading: boolean;
  isDeleting: boolean;
}

function DocRow({ label, docType, maxSizeMB, uploaded, onUpload, onDelete, isUploading, isDeleting }: DocRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`File too large. Maximum size is ${maxSizeMB} MB.`);
      e.target.value = "";
      return;
    }

    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (docType === "member_list") allowed.push("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    if (!allowed.includes(file.type)) {
      toast.error(`Invalid file type. Allowed: PDF, JPG, PNG${docType === "member_list" ? ", XLSX" : ""}`);
      e.target.value = "";
      return;
    }

    onUpload(docType, file);
    e.target.value = "";
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b py-3 last:border-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate font-medium text-sm">{label}</p>
          {uploaded && <p className="text-muted-foreground text-xs">{formatBytes(uploaded.file_size)}</p>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {uploaded ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => {
                console.log("uploaded object:", uploaded);
                onDelete(uploaded.id);
              }}
              disabled={isDeleting}
              aria-label="Remove document"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.xlsx"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="h-7 text-xs"
            >
              <Upload className="mr-1.5 h-3 w-3" />
              {isUploading ? "Uploading…" : "Upload"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

interface Step6Props {
  onSuccess: () => void;
  onBack: () => void;
}

export function Step6Documents({ onSuccess, onBack }: Step6Props) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["fpo-documents"],
    queryFn: fpoRegistrationApi.getDocuments,
  });

  const documents = data?.documents;

  const uploadMutation = useMutation({
    mutationFn: ({ type, file }: { type: FpoDocumentType; file: File }) =>
      fpoRegistrationApi.uploadDocument(type, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fpo-documents"] });
      queryClient.invalidateQueries({ queryKey: ["fpo-me"] });
    },
    onError: () => toast.error("Upload failed. Please try again."),
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => fpoRegistrationApi.deleteDocument(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fpo-documents"] });
      queryClient.invalidateQueries({ queryKey: ["fpo-me"] });
    },
    onError: () => toast.error("Failed to remove document."),
  });

  function getUploaded(type: FpoDocumentType): FpoDocument | undefined {
    return documents?.find((d) => d.document_type === type);
  }

  const requiredUploaded = REQUIRED_DOC_CONFIG.filter((c) => getUploaded(c.type)).length;
  const allRequiredDone = data?.ready_to_submit ?? false;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-semibold text-lg">Upload Documents</h2>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {allRequiredDone
            ? "All required documents uploaded."
            : `${requiredUploaded} of ${REQUIRED_DOC_CONFIG.length} required documents uploaded.`}
        </p>
      </div>

      {/* Required */}
      <div className="rounded-lg border p-4">
        <p className="mb-1 font-medium text-sm">Required Documents</p>
        <p className="mb-3 text-muted-foreground text-xs">All 3 must be uploaded before submission</p>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          REQUIRED_DOC_CONFIG.map((cfg) => (
            <DocRow
              key={cfg.type}
              label={cfg.label}
              docType={cfg.type}
              maxSizeMB={cfg.maxSizeMB}
              uploaded={getUploaded(cfg.type)}
              onUpload={(type, file) => uploadMutation.mutate({ type, file })}
              onDelete={(id) => deleteMutation.mutate(id)}
              isUploading={uploadMutation.isPending}
              isDeleting={deleteMutation.isPending}
            />
          ))
        )}
      </div>

      {/* Optional */}
      <div className="rounded-lg border p-4">
        <p className="mb-1 font-medium text-sm">Optional Documents</p>
        <p className="mb-3 text-muted-foreground text-xs">Upload if available — helps with faster review</p>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          OPTIONAL_DOC_CONFIG.map((cfg) => (
            <DocRow
              key={cfg.type}
              label={cfg.label}
              docType={cfg.type}
              maxSizeMB={cfg.maxSizeMB}
              uploaded={getUploaded(cfg.type)}
              onUpload={(type, file) => uploadMutation.mutate({ type, file })}
              onDelete={(id) => deleteMutation.mutate(id)}
              isUploading={uploadMutation.isPending}
              isDeleting={deleteMutation.isPending}
            />
          ))
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button
          type="button"
          onClick={() => {
            if (!allRequiredDone) {
              toast.error(`Please upload all ${REQUIRED_DOC_CONFIG.length} required documents before continuing.`);
              return;
            }
            onSuccess();
          }}
        >
          Continue to Review →
        </Button>
      </div>
    </div>
  );
}
