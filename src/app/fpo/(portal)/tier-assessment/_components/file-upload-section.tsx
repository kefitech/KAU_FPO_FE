"use client";

import { useRef, useState } from "react";

import { Loader2, Paperclip, Trash2, UploadCloud } from "lucide-react";

import { tierAssessmentApi } from "@/app/fpo/_api/tier-assessment";
import type { TierUpload } from "@/types/fpo";

const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Only PDF, JPG, or PNG files are accepted.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `File too large. Maximum size is 5 MB (this file is ${(file.size / 1024 / 1024).toFixed(1)} MB).`;
  }
  return null;
}

interface FileUploadSectionProps {
  assessmentId: number;
  questionNo: number;
  uploads: TierUpload[];
  onUploadsChange: () => void;
  readOnly?: boolean;
  uploadLabel?: string;
}

export function FileUploadSection({
  assessmentId,
  questionNo,
  uploads,
  onUploadsChange,
  readOnly,
  uploadLabel,
}: FileUploadSectionProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setError(null);
    setUploading(true);
    try {
      await tierAssessmentApi.upload(assessmentId, questionNo, file);
      onUploadsChange();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; detail?: string } } })?.response?.data
          ?.message ??
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Upload failed. Please try again.";
      setError(msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(uploadId: number) {
    setError(null);
    setDeletingId(uploadId);
    try {
      await tierAssessmentApi.deleteUpload(assessmentId, uploadId);
      onUploadsChange();
    } catch {
      setError("Delete failed. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {/* Uploaded files */}
      {uploads.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {uploads.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <a
                href={u.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate font-medium hover:underline"
              >
                {u.original_filename}
              </a>
              <span className="shrink-0 text-muted-foreground text-xs">
                {new Date(u.uploaded_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleDelete(u.id)}
                  disabled={deletingId === u.id}
                  className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-50"
                >
                  {deletingId === u.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {!readOnly && (
        <>
          <button
            type="button"
            onClick={() => { setError(null); fileRef.current?.click(); }}
            disabled={uploading}
            className="flex w-fit items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-muted-foreground text-xs transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UploadCloud className="h-3.5 w-3.5" />
            )}
            {uploading ? "Uploading…" : (uploadLabel ?? "Attach file")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleFileChange}
          />
          {!error && (
            <p className="text-muted-foreground text-xs">PDF, JPG or PNG · max 5 MB</p>
          )}
        </>
      )}

      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
