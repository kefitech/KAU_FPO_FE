"use client";

import { useRef, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { productsApi, type BulkImportResult } from "@/app/fpo/_api/products";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type T = Record<string, string>;

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t?: T;
  tCommon?: T;
}

/**
 * Three-step bulk-import flow in a single dialog:
 *   1. Download the Excel template (3 sheets: Products / Instructions /
 *      Commodity Codes).
 *   2. FPO fills it offline, then picks the file here.
 *   3. On upload, the backend creates one Product + ACTIVE batch per
 *      valid row and returns {success, failed, results, errors}. We show
 *      the counts inline + an error table so bad rows can be fixed and
 *      re-uploaded without resending the valid ones.
 */
export function BulkImportDialog({ open, onOpenChange, t = {}, tCommon = {} }: BulkImportDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const closeDialog = (nextOpen: boolean) => {
    if (!nextOpen) resetState();
    onOpenChange(nextOpen);
  };

  const downloadMutation = useMutation({
    mutationFn: () => productsApi.getBulkTemplate(),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "product_bulk_import_template.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    onError: () => toast.error(t.err_template_download ?? "Failed to download template"),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => productsApi.bulkImport(file),
    onSuccess: (res) => {
      setResult(res);
      if (res.success > 0) {
        toast.success(
          t.toast_bulk_import_success?.replace("{count}", String(res.success)) ??
            `${res.success} product(s) imported`,
        );
        queryClient.invalidateQueries({ queryKey: ["products"] });
      }
      if (res.failed > 0 && res.success === 0) {
        toast.error(t.err_bulk_import_all_failed ?? "No products could be imported");
      }
    },
    onError: () => toast.error(t.err_bulk_import_upload ?? "Upload failed"),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    // A fresh file choice invalidates any previous result the user was
    // staring at — show them a clean slate before they click Upload.
    setResult(null);
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  const canUpload = selectedFile != null && !uploadMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t.bulk_import_title ?? "Bulk Import Products"}</DialogTitle>
          <DialogDescription>
            {t.bulk_import_description ??
              "Upload a filled Excel/CSV to create many products at once. Each row becomes a live product with one active batch."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* Step 1 — Download template */}
          <div className="flex flex-col gap-2 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <p className="font-medium text-sm">{t.step1_title ?? "1. Download the template"}</p>
                <p className="text-muted-foreground text-xs">
                  {t.step1_description ??
                    "Three sheets inside: Products (fill in), Instructions, and the Commodity Codes reference."}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadMutation.mutate()}
                disabled={downloadMutation.isPending}
              >
                <Download className="mr-1.5 h-4 w-4" />
                {downloadMutation.isPending
                  ? (t.downloading ?? "Downloading...")
                  : (t.download_template_btn ?? "Download")}
              </Button>
            </div>
          </div>

          {/* Step 2 — Choose + upload file */}
          <div className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex flex-col gap-0.5">
              <p className="font-medium text-sm">{t.step2_title ?? "2. Upload the filled file"}</p>
              <p className="text-muted-foreground text-xs">
                {t.step2_description ?? "Supports .xlsx and .csv. Invalid rows are skipped and reported."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Input
                  readOnly
                  tabIndex={-1}
                  placeholder={t.file_placeholder ?? "No file chosen"}
                  value={selectedFile?.name ?? ""}
                  onClick={() => fileInputRef.current?.click()}
                  onFocus={(e) => e.target.blur()}
                  className="cursor-pointer select-none caret-transparent pr-8"
                />
                {selectedFile && (
                  <button
                    type="button"
                    aria-label={t.file_clear_btn ?? "Clear file"}
                    onClick={resetState}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                {t.choose_file_btn ?? "Choose File"}
              </Button>
              <Button type="button" onClick={handleUpload} disabled={!canUpload}>
                <Upload className="mr-1.5 h-4 w-4" />
                {uploadMutation.isPending ? (t.uploading ?? "Uploading...") : (t.upload_btn ?? "Upload")}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Step 3 — Results (only shown after a run) */}
          {result && (
            <div className="flex flex-col gap-3 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-sm">{t.step3_title ?? "3. Import summary"}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {result.success} {t.imported ?? "imported"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-red-700">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {result.failed} {t.failed ?? "failed"}
                  </span>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground text-xs">
                    {t.failed_rows_label ?? "Failed rows — fix these in your file and re-upload"}
                  </p>
                  <div className="max-h-60 overflow-y-auto rounded border">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-muted">
                        <tr className="text-left">
                          <th className="px-2 py-1.5 font-medium">{t.col_row ?? "Row"}</th>
                          <th className="px-2 py-1.5 font-medium">{t.col_name ?? "Name"}</th>
                          <th className="px-2 py-1.5 font-medium">{t.col_reason ?? "Reason"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errors.map((err) => (
                          <tr key={err.row} className="border-t">
                            <td className="px-2 py-1.5 align-top">{err.row}</td>
                            <td className="px-2 py-1.5 align-top">{err.name_en || "—"}</td>
                            <td className="px-2 py-1.5 align-top text-destructive">{err.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => closeDialog(false)}>
            {result ? (tCommon.close_btn ?? "Close") : (tCommon.cancel_btn ?? "Cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
