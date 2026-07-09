"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { type AnnouncementPayload, adminAnnouncementsApi } from "@/app/admin/_api/announcements";
import { languageApi } from "@/app/admin/_api/language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

const ANNOUNCEMENT_CATEGORIES = ["announcement", "news"] as const;

function isBodyEmpty(html: string | undefined): boolean {
  if (!html) return true;
  const text = html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
  return text.length === 0;
}
const settingsSchema = z.object({
  category: z.enum(ANNOUNCEMENT_CATEGORIES),
  published_date: z.string().optional(),
  is_active: z.boolean(),
  order: z.number().min(0).optional(),
});
type SettingsValues = z.infer<typeof settingsSchema>;

type T = Record<string, string>;

interface Props {
  mode: "create" | "edit";
  id?: number;
  t?: T;
  tCommon?: T;
}

export function AnnouncementForm({ mode, id, t = {}, tCommon = {} }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: languages = [], isLoading: langsLoading } = useQuery({
    queryKey: ["active-languages"],
    queryFn: languageApi.getActive,
    staleTime: 5 * 60 * 1000,
  });

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ["announcement", id],
    queryFn: () => adminAnnouncementsApi.getById(id!),
    enabled: mode === "edit" && !!id,
  });

  const sortedLangs = [...languages].sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));
  const defaultLang = sortedLangs[0];

  const [activeLang, setActiveLang] = useState<string>("");
  const [titleValues, setTitleValues] = useState<Record<string, string>>({});
  const [bodyValues, setBodyValues] = useState<Record<string, string>>({});
  const [titleError, setTitleError] = useState("");
  const [bodyError, setBodyError] = useState("");
  // Prevents the form from rendering until reset() has been called with existing data,
  // so Radix UI's Select initialises with the correct value instead of the defaultValues fallback.
  const [formReady, setFormReady] = useState(mode === "create");

  useEffect(() => {
    if (sortedLangs.length && !activeLang) {
      setActiveLang(sortedLangs[0].code);
    }
  }, [sortedLangs, activeLang]);

  const { control, handleSubmit, reset } = useForm<SettingsValues, unknown, SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { category: "announcement", published_date: "", is_active: true, order: 0 },
  });

  useEffect(() => {
    if (existing) {
      setTitleValues(typeof existing.title === "object" ? existing.title : {});
      setBodyValues(typeof existing.body === "object" ? existing.body : {});
      reset({
        category: existing.category,
        published_date: existing.published_date ?? "",
        is_active: existing.is_active,
        order: existing.order ?? 0,
      });
      setFormReady(true);
    }
  }, [existing, reset]);

  const mutation = useMutation({
    mutationFn: (settings: SettingsValues) => {
      const title: Record<string, string> = {};
      const body: Record<string, string> = {};
      for (const lang of languages) {
        const t = titleValues[lang.code];
        const b = bodyValues[lang.code];
        if (typeof t === "string" && t.trim()) title[lang.code] = t.trim();
        if (typeof b === "string" && !isBodyEmpty(b)) body[lang.code] = b.trim();
      }
      const payload: AnnouncementPayload = {
        title,
        body,
        category: settings.category,
        published_date: settings.published_date || new Date().toLocaleDateString("en-CA"),
        is_active: settings.is_active,
        order: settings.order ?? 0,
      };
      return mode === "create" ? adminAnnouncementsApi.create(payload) : adminAnnouncementsApi.update(id!, payload);
    },
    onSuccess: () => {
      toast.success(
        mode === "create" ? (t.toast_created ?? "Announcement created") : (t.toast_updated ?? "Announcement updated"),
      );
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      router.push("/admin/announcements");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || (t.toast_save_failed ?? "Failed to save announcement"));
    },
  });

  const onSubmit = (settings: SettingsValues) => {
    let hasError = false;
    const defCode = defaultLang?.code ?? "";
    const defName = defaultLang?.name ?? "default language";
    const titleVal = titleValues[defCode];
    const bodyVal = bodyValues[defCode];
    if (!titleVal || !titleVal.trim()) {
      setTitleError((t.validation_title_required ?? "Title in {lang} is required").replace("{lang}", defName));
      setActiveLang(defCode || activeLang);
      hasError = true;
    } else {
      setTitleError("");
    }
    if (isBodyEmpty(bodyVal)) {
      setBodyError((t.validation_body_required ?? "Body in {lang} is required").replace("{lang}", defName));
      setActiveLang(defCode || activeLang);
      hasError = true;
    } else {
      setBodyError("");
    }
    if (!hasError) mutation.mutate(settings);
  };

  const isLoading = langsLoading || (mode === "edit" && existingLoading) || !formReady;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit, (errs) => console.error("Form validation errors:", errs))}
      className="mx-auto max-w-3xl space-y-4"
    >
      {/* Multilingual content card */}
      <div className="rounded-lg border p-5 space-y-4">
        {/* Language selector row */}
        <div className="flex items-center gap-3">
          <Label className="text-sm shrink-0">{t.field_language ?? "Language:"}</Label>
          <Select value={activeLang} onValueChange={setActiveLang}>
            <SelectTrigger className="h-8 w-44 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortedLangs.map((lang) => {
                const isFilled = !!(titleValues[lang.code]?.trim() && !isBodyEmpty(bodyValues[lang.code]));
                return (
                  <SelectItem key={lang.code} value={lang.code}>
                    <span className="flex items-center gap-1.5">
                      {isFilled && <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />}
                      {lang.native_name}
                      {lang.is_default && <span className="text-destructive ml-0.5">*</span>}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {activeLang && activeLang !== defaultLang?.code && (
            <span className="text-muted-foreground text-xs">{t.optional_lang ?? "Optional"}</span>
          )}
        </div>

        {/* Title */}
        <div>
          <Label>
            {t.field_title ?? "Title"}
            {activeLang === defaultLang?.code && <span className="ml-0.5 text-destructive">*</span>}
          </Label>
          <Input
            className="mt-1.5 maxLength={100}"
            value={titleValues[activeLang] ?? ""}
            onChange={(e) => {
              setTitleValues((prev) => ({ ...prev, [activeLang]: e.target.value }));
              if (activeLang === defaultLang?.code) setTitleError("");
            }}
          />
          {activeLang === defaultLang?.code && titleError && (
            <p className="mt-1 text-destructive text-xs">{titleError}</p>
          )}
        </div>

        {/* Body — rich text */}
        <div>
          <Label>
            {t.field_body ?? "Body"}
            {activeLang === defaultLang?.code && <span className="ml-0.5 text-destructive">*</span>}
          </Label>
          <div className="mt-1.5">
            <RichTextEditor
              content={bodyValues[activeLang] ?? ""}
              onChange={(html) => {
                setBodyValues((prev) => ({ ...prev, [activeLang]: html }));
                if (activeLang === defaultLang?.code) setBodyError("");
              }}
              placeholder={t.placeholder_body ?? "Write the announcement body…"}
            />
          </div>
          {activeLang === defaultLang?.code && bodyError && (
            <p className="mt-1 text-destructive text-xs">{bodyError}</p>
          )}
        </div>

        {activeLang && activeLang !== defaultLang?.code && (
          <p className="text-muted-foreground text-xs">
            {(t.optional_fallback ?? "Optional — leave blank to use the {lang} version as fallback.").replace(
              "{lang}",
              defaultLang?.name ?? "default",
            )}
          </p>
        )}
      </div>

      {/* Settings */}
      <div className="rounded-lg border p-5 space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          {t.settings_heading ?? "Settings"}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>{t.field_category ?? "Category"}</Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="announcement">{t.cat_announcement ?? "Announcement"}</SelectItem>
                    <SelectItem value="news">{t.cat_news ?? "News"}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <Label>{t.field_published_date ?? "Published Date"}</Label>
            <Controller
              name="published_date"
              control={control}
              render={({ field }) => (
                <Input
                  type="date"
                  // en-CA locale formats as yyyy-MM-dd, matching what <input type="date"> expects
                  value={field.value || new Date().toLocaleDateString("en-CA")}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="mt-1.5"
                />
              )}
            />
          </div>
          <div>
            <Label>{t.field_order ?? "Order"}</Label>
            <Controller
              name="order"
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  min={0}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const n = e.target.valueAsNumber;
                    field.onChange(Number.isNaN(n) ? 0 : n);
                  }}
                  className="mt-1.5"
                />
              )}
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
            <Label>{t.field_is_active ?? "Active"}</Label>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/announcements")}>
          {tCommon.cancel ?? "Cancel"}
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? (t.btn_saving ?? "Saving…")
            : mode === "create"
              ? (t.btn_create ?? "Create")
              : (t.btn_save ?? "Save Changes")}
        </Button>
      </div>
    </form>
  );
}
