"use client";

import { useRef, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { languageApi } from "@/app/admin/_api/language";
import { translationApi } from "@/app/admin/_api/translation";
import { translationCategoryApi } from "@/app/admin/_api/translation-category";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";

type T = Record<string, string>;

interface TranslationImportDialogProps {
  open: boolean;
  onClose: () => void;
  t: T;
  tCommon: T;
}

export function TranslationImportDialog({ open, onClose, t, tCommon }: TranslationImportDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [languageCode, setLanguageCode] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const { data: languagesData } = useQuery({
    queryKey: ["languages-list"],
    queryFn: () => languageApi.getAll({ page: 1, page_size: 100 }),
    enabled: open,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories-list"],
    queryFn: () => translationCategoryApi.getAll({ page: 1, page_size: 100 }),
    enabled: open,
  });

  const languages = languagesData?.data ?? [];
  const categories = categoriesData?.data ?? [];

  const handleDownload = async (format: "xlsx" | "csv") => {
    if (!languageCode) {
      toast.error(t.toast_select_language ?? "Please select a language first");
      return;
    }
    setIsDownloading(true);
    try {
      await translationApi.export({
        language_code: languageCode,
        category_code: categoryCode || undefined,
        file_format: format,
      });
      toast.success("Template downloaded");
    } catch {
      toast.error("Failed to download template");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFile = (f: File) => {
    const valid = f.name.endsWith(".xlsx") || f.name.endsWith(".csv");
    if (!valid) {
      toast.error(t.toast_invalid_format ?? "Only .xlsx or .csv files are allowed");
      return;
    }
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!languageCode) {
      toast.error(t.toast_select_language ?? "Please select a language");
      return;
    }
    if (!file) {
      toast.error(t.toast_select_file ?? "Please select a file to upload");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("language_code", languageCode);
    if (categoryCode) formData.append("category_code", categoryCode);
    if (overwrite) formData.append("overwrite", "true");

    setIsUploading(true);
    try {
      await translationApi.importFile(formData);
      toast.success("Translations imported successfully");
      queryClient.invalidateQueries({ queryKey: ["translations"] });
      handleClose();
    } catch {
      toast.error(t.toast_failed ?? "Failed to import translations");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setLanguageCode("");
    setCategoryCode("");
    setFile(null);
    setOverwrite(false);
    onClose();
  };

  const selectedLanguageName = languages.find((l) => l.code === languageCode)?.name;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t.title ?? "Import Translations"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Step 1 */}
          <div className="flex flex-col gap-3">
            <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
              Step 1 — Select Language & Category
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="imp-language">
                  {t.language_label ?? "Language"} <span className="text-destructive">*</span>
                </FieldLabel>
                <select
                  id="imp-language"
                  value={languageCode}
                  onChange={(e) => setLanguageCode(e.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-3 text-foreground text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select</option>
                  {languages.map((l) => (
                    <option key={l.id} value={l.code}>
                      {l.name} ({l.code})
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="imp-category">{t.category_label ?? "Category"}</FieldLabel>
                <select
                  id="imp-category"
                  value={categoryCode}
                  onChange={(e) => setCategoryCode(e.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-3 text-foreground text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col gap-3">
            <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
              Step 2 — Download Template
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={!languageCode || isDownloading}
                onClick={() => handleDownload("xlsx")}
              >
                <Download className="mr-1.5 h-4 w-4" />
                Excel (.xlsx)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={!languageCode || isDownloading}
                onClick={() => handleDownload("csv")}
              >
                <Download className="mr-1.5 h-4 w-4" />
                CSV (.csv)
              </Button>
            </div>
            {!languageCode && <p className="text-muted-foreground text-xs">Select a language to enable download</p>}
            {languageCode && (
              <p className="text-muted-foreground text-xs">
                Downloads missing keys for <span className="font-medium text-foreground">{selectedLanguageName}</span>
              </p>
            )}
          </div>

          {/* Step 3 */}
          <div className="flex flex-col gap-3">
            <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
              Step 3 — Upload Filled File
            </p>

            <button
              type="button"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : file
                    ? "border-green-400 bg-green-50 dark:bg-green-950/20"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-accent/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              {file ? (
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-700 text-sm dark:text-green-400">{file.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-medium text-sm">Drop file here or click to browse</p>
                    <p className="text-muted-foreground text-xs">.xlsx or .csv</p>
                  </div>
                </>
              )}
            </button>

            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <span className="text-sm">Overwrite existing translations</span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {tCommon.cancel_btn ?? "Cancel"}
          </Button>
          <Button onClick={handleUpload} disabled={isUploading || !languageCode || !file}>
            <Upload className="mr-1.5 h-4 w-4" />
            {isUploading ? "Uploading..." : (t.import_btn ?? "Import")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
