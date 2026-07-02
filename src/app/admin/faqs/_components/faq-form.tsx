"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { type FaqPayload, adminFaqsApi } from "@/app/admin/_api/faqs";
import { languageApi } from "@/app/admin/_api/language";

const FAQ_CATEGORIES = ["fpo_general", "schemes", "platform_usage"] as const;

const settingsSchema = z.object({
  category: z.enum(FAQ_CATEGORIES),
  order: z.number().min(0).optional(),
  is_active: z.boolean(),
});
type SettingsValues = z.infer<typeof settingsSchema>;

type T = Record<string, string>;

interface Props {
  mode: "create" | "edit";
  id?: number;
  t?: T;
  tCommon?: T;
}

export function FaqForm({ mode, id, t = {}, tCommon = {} }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: languages = [], isLoading: langsLoading } = useQuery({
    queryKey: ["active-languages"],
    queryFn: languageApi.getActive,
    staleTime: 5 * 60 * 1000,
  });

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ["faq", id],
    queryFn: () => adminFaqsApi.getById(id!),
    enabled: mode === "edit" && !!id,
  });

  const sortedLangs = [...languages].sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));
  const defaultLang = sortedLangs[0];

  const [activeLang, setActiveLang] = useState<string>("");
  const [questionValues, setQuestionValues] = useState<Record<string, string>>({});
  const [answerValues, setAnswerValues] = useState<Record<string, string>>({});
  const [questionError, setQuestionError] = useState("");
  const [answerError, setAnswerError] = useState("");
  const [formReady, setFormReady] = useState(mode === "create");

  useEffect(() => {
    if (sortedLangs.length && !activeLang) {
      setActiveLang(sortedLangs[0].code);
    }
  }, [sortedLangs, activeLang]);

  const { control, handleSubmit, reset } = useForm<SettingsValues, unknown, SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { category: "fpo_general", order: 0, is_active: true },
  });

  useEffect(() => {
    if (existing) {
      setQuestionValues(typeof existing.question === "object" ? existing.question : {});
      setAnswerValues(typeof existing.answer === "object" ? existing.answer : {});
      reset({
        category: existing.category,
        order: existing.order ?? 0,
        is_active: existing.is_active,
      });
      setFormReady(true);
    }
  }, [existing, reset]);

  const mutation = useMutation({
    mutationFn: (settings: SettingsValues) => {
      const question: Record<string, string> = {};
      const answer: Record<string, string> = {};
      for (const lang of languages) {
        const q = questionValues[lang.code];
        const a = answerValues[lang.code];
        if (typeof q === "string" && q.trim()) question[lang.code] = q.trim();
        if (typeof a === "string" && a.trim()) answer[lang.code] = a.trim();
      }
      const payload: FaqPayload = { question, answer, ...settings };
      return mode === "create"
        ? adminFaqsApi.create(payload)
        : adminFaqsApi.update(id!, payload);
    },
    onSuccess: () => {
      toast.success(mode === "create" ? (t.toast_created ?? "FAQ created") : (t.toast_updated ?? "FAQ updated"));
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      router.push("/admin/faqs");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || (t.toast_save_failed ?? "Failed to save FAQ"));
    },
  });

  const onSubmit = (settings: SettingsValues) => {
    let hasError = false;
    const defCode = defaultLang?.code ?? "";
    const defName = defaultLang?.name ?? "default language";
    if (!questionValues[defCode] || !questionValues[defCode].trim()) {
      setQuestionError((t.validation_question_required ?? "Question in {lang} is required").replace("{lang}", defName));
      setActiveLang(defCode || activeLang);
      hasError = true;
    } else {
      setQuestionError("");
    }
    if (!answerValues[defCode] || !answerValues[defCode].trim()) {
      setAnswerError((t.validation_answer_required ?? "Answer in {lang} is required").replace("{lang}", defName));
      setActiveLang(defCode || activeLang);
      hasError = true;
    } else {
      setAnswerError("");
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
    <form onSubmit={handleSubmit(onSubmit, (errs) => console.error("Form validation errors:", errs))} className="mx-auto max-w-3xl space-y-4">
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
                const isFilled = !!(questionValues[lang.code]?.trim() && answerValues[lang.code]?.trim());
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

        {/* Question */}
        <div>
          <Label>
            {t.field_question ?? "Question"}
            {activeLang === defaultLang?.code && <span className="ml-0.5 text-destructive">*</span>}
          </Label>
          <Textarea
            className="mt-1.5 resize-y"
            rows={3}
            value={questionValues[activeLang] ?? ""}
            onChange={(e) => {
              setQuestionValues((prev) => ({ ...prev, [activeLang]: e.target.value }));
              if (activeLang === defaultLang?.code) setQuestionError("");
            }}
          />
          {activeLang === defaultLang?.code && questionError && (
            <p className="mt-1 text-destructive text-xs">{questionError}</p>
          )}
        </div>

        {/* Answer — rich text */}
        <div>
          <Label>
            {t.field_answer ?? "Answer"}
            {activeLang === defaultLang?.code && <span className="ml-0.5 text-destructive">*</span>}
          </Label>
          <div className="mt-1.5">
            <RichTextEditor
              content={answerValues[activeLang] ?? ""}
              onChange={(html) => {
                setAnswerValues((prev) => ({ ...prev, [activeLang]: html }));
                if (activeLang === defaultLang?.code) setAnswerError("");
              }}
              placeholder={t.placeholder_answer ?? "Write the FAQ answer…"}
            />
          </div>
          {activeLang === defaultLang?.code && answerError && (
            <p className="mt-1 text-destructive text-xs">{answerError}</p>
          )}
        </div>

        {activeLang && activeLang !== defaultLang?.code && (
          <p className="text-muted-foreground text-xs">
            {(t.optional_fallback ?? "Optional — leave blank to use the {lang} version as fallback.").replace("{lang}", defaultLang?.name ?? "default")}
          </p>
        )}
      </div>

      {/* Settings */}
      <div className="rounded-lg border p-5 space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{t.settings_heading ?? "Settings"}</h3>
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
                    <SelectItem value="fpo_general">{t.cat_fpo_general ?? "FPO General"}</SelectItem>
                    <SelectItem value="schemes">{t.cat_schemes ?? "Schemes & Support"}</SelectItem>
                    <SelectItem value="platform_usage">{t.cat_platform_usage ?? "Platform Usage"}</SelectItem>
                  </SelectContent>
                </Select>
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
                  onChange={(e) => { const n = e.target.valueAsNumber; field.onChange(Number.isNaN(n) ? 0 : n); }}
                  className="mt-1.5"
                />
              )}
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label>{t.field_is_active ?? "Active"}</Label>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/faqs")}>
          {tCommon.cancel ?? "Cancel"}
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? (t.btn_saving ?? "Saving…") : mode === "create" ? (t.btn_create ?? "Create") : (t.btn_save ?? "Save Changes")}
        </Button>
      </div>
    </form>
  );
}
