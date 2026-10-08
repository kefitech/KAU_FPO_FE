"use client";

import { useRef, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, FileUp, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { subAdminsApi } from "@/app/admin/_api/sub-admins";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BulkInviteResult } from "@/types/admin";

type T = Record<string, string>;

export function BulkInviteDialog({
  open,
  onOpenChange,
  t = {},
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t?: T;
}) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BulkInviteResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const templateMutation = useMutation({
    mutationFn: () => subAdminsApi.bulkInviteTemplate(),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sub_admin_bulk_invite_template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: () => toast.error(t.template_download_failed ?? "Failed to download template."),
  });

  const uploadMutation = useMutation({
    mutationFn: (f: File) => subAdminsApi.bulkInvite(f),
    onSuccess: (data) => {
      setResult(data);
      // The file has been processed — clear it so the invite can't be resent by
      // accident, and so re-picking the same (corrected) file fires onChange.
      clearFile();
      queryClient.invalidateQueries({ queryKey: ["sub-admins"] });
      queryClient.invalidateQueries({ queryKey: ["sub-admin-district-cap-status"] });
      toast.success(
        (t.bulk_upload_summary ?? "{success} invited, {failed} failed.")
          .replace("{success}", String(data.success))
          .replace("{failed}", String(data.failed)),
      );
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? t.bulk_upload_failed ?? "Bulk upload failed.");
    },
  });

  function clearFile() {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function reset() {
    clearFile();
    setResult(null);
  }

  function handleClose(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.bulk_invite_title ?? "Bulk Invite Sub-Admins"}</DialogTitle>
          <DialogDescription>
            {t.bulk_invite_description ??
              "Download the Excel template, fill in one row per sub-admin, and upload. Each row is processed independently."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-4 py-2">
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => templateMutation.mutate()}
              disabled={templateMutation.isPending}
              className="w-full sm:w-auto"
            >
              {templateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {t.download_template ?? "Download Template"}
            </Button>
          </div>

          <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-4 text-sm">
            <label htmlFor="sub-admin-bulk-invite-file" className="font-medium">
              {t.upload_label ?? "Choose filled template (.xlsx or .csv)"}
            </label>
            <div className="flex items-center gap-2">
              <input
                id="sub-admin-bulk-invite-file"
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                onChange={(e) => {
                  setResult(null);
                  setFile(e.target.files?.[0] ?? null);
                }}
                className="min-w-0 flex-1 text-xs file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:font-medium file:text-primary-foreground file:text-xs hover:file:bg-primary/90"
              />
              {file && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={clearFile}
                  disabled={uploadMutation.isPending}
                  aria-label={t.remove_file ?? "Remove file"}
                  title={t.remove_file ?? "Remove file"}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <X />
                </Button>
              )}
            </div>
          </div>

          {result && (
            <div className="rounded-md border">
              <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2 text-sm">
                <span className="font-medium">
                  {t.result_success ?? "Success"}: <span className="text-green-600">{result.success}</span>
                </span>
                <span className="font-medium">
                  {t.result_failed ?? "Failed"}:{" "}
                  <span className={result.failed > 0 ? "text-red-600" : ""}>{result.failed}</span>
                </span>
              </div>

              {result.errors.length > 0 && (
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full table-fixed text-xs">
                    <thead className="bg-muted/50 text-left text-muted-foreground uppercase">
                      <tr>
                        <th className="w-12 px-2 py-1.5 font-medium">{t.col_row ?? "Row"}</th>
                        <th className="w-[35%] px-2 py-1.5 font-medium">{t.col_email ?? "Email"}</th>
                        <th className="w-20 px-2 py-1.5 font-medium">{t.col_district ?? "District"}</th>
                        <th className="px-2 py-1.5 font-medium">{t.col_reason ?? "Reason"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {result.errors.map((e, idx) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: error list is static per render
                        <tr key={idx}>
                          <td className="px-2 py-1.5 font-mono">{e.row}</td>
                          <td className="break-all px-2 py-1.5">{e.email || "—"}</td>
                          <td className="px-2 py-1.5 font-mono">{e.district || "—"}</td>
                          <td className="break-words px-2 py-1.5 text-red-600">
                            {e.reasons?.length ? (
                              <ul className="list-disc space-y-0.5 pl-4">
                                {e.reasons.map((r) => (
                                  <li key={r}>{r}</li>
                                ))}
                              </ul>
                            ) : (
                              e.reason
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {t.close ?? "Close"}
          </Button>
          {/* Hidden once a result is shown; picking a new file brings it back. */}
          {!result && (
            <Button disabled={!file || uploadMutation.isPending} onClick={() => file && uploadMutation.mutate(file)}>
              {uploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!uploadMutation.isPending && <FileUp className="mr-2 h-4 w-4" />}
              {t.upload_btn ?? "Upload & Invite"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
