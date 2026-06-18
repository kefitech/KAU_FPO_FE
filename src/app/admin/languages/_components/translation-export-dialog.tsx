"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { languageApi } from "@/app/admin/_api/language";
import { translationApi } from "@/app/admin/_api/translation";
import { translationCategoryApi } from "@/app/admin/_api/translation-category";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";

type T = Record<string, string>;

interface TranslationExportDialogProps {
  open: boolean;
  onClose: () => void;
  t: T;
  tCommon: T;
}

export function TranslationExportDialog({ open, onClose, t, tCommon }: TranslationExportDialogProps) {
  const [languageCode, setLanguageCode] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [fileFormat, setFileFormat] = useState<"xlsx" | "csv">("xlsx");
  const [isDownloading, setIsDownloading] = useState(false);

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

  const handleExport = async () => {
    if (!languageCode) {
      toast.error(t.toast_select_language ?? "Please select a language");
      return;
    }
    setIsDownloading(true);
    try {
      const result = await translationApi.export({
        language_code: languageCode,
        category_code: categoryCode || undefined,
        file_format: fileFormat,
      });
      if (result.downloaded) {
        toast.success("Export downloaded successfully");
        onClose();
      } else {
        toast.info(result.message);
      }
    } catch {
      toast.error(t.toast_failed ?? "Failed to export translations");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClose = () => {
    setLanguageCode("");
    setCategoryCode("");
    setFileFormat("xlsx");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t.title ?? "Export Translation Template"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-xs">
            {t.description ?? "Downloads only keys that are missing translations for the selected language."}
          </p>

          <Field>
            <FieldLabel htmlFor="exp-language">
              {t.language_label ?? "Language"} <span className="text-destructive">*</span>
            </FieldLabel>
            <select
              id="exp-language"
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-foreground text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select language</option>
              {languages.map((l) => (
                <option key={l.id} value={l.code}>
                  {l.name} ({l.code})
                </option>
              ))}
            </select>
          </Field>

          <Field>
            <FieldLabel htmlFor="exp-category">
              {t.category_label ?? "Category"} <span className="text-muted-foreground text-xs">(optional)</span>
            </FieldLabel>
            <select
              id="exp-category"
              value={categoryCode}
              onChange={(e) => setCategoryCode(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-foreground text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">{t.all_categories ?? "All categories"}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field>
            <FieldLabel htmlFor="exp-format">{t.format_label ?? "File Format"}</FieldLabel>
            <select
              id="exp-format"
              value={fileFormat}
              onChange={(e) => setFileFormat(e.target.value as "xlsx" | "csv")}
              className="h-9 w-full rounded-md border bg-background px-3 text-foreground text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="xlsx">{t.format_xlsx ?? "Excel (.xlsx)"}</option>
              <option value="csv">{t.format_csv ?? "CSV (.csv)"}</option>
            </select>
          </Field>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {tCommon.cancel_btn ?? "Cancel"}
          </Button>
          <Button onClick={handleExport} disabled={isDownloading || !languageCode}>
            <Download className="mr-1.5 h-4 w-4" />
            {isDownloading ? (t.downloading ?? "Downloading...") : (t.export_btn ?? "Export")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
