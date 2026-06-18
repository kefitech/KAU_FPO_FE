"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { languageApi } from "@/app/admin/_api/language";
import { translationApi } from "@/app/admin/_api/translation";
import { translationCategoryApi } from "@/app/admin/_api/translation-category";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Translation } from "@/types";

type T = Record<string, string>;

const schema = z.object({
  category: z.string().min(1, { message: "Category is required" }),
  language: z.string().min(1, { message: "Language is required" }),
  key: z.string().min(1, { message: "Key is required" }),
  value: z.string().min(1, { message: "Value is required" }),
  context: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface TranslationFormProps {
  mode: "create" | "edit";
  translation?: Translation;
  t?: T;
  tCommon?: T;
}

const defaultValues: FormValues = { category: "", language: "", key: "", value: "", context: "" };

function toFormValues(tr: Translation): FormValues {
  return {
    category: String(tr.category ?? ""),
    language: String(tr.language ?? ""),
    key: tr.key ?? "",
    value: tr.value ?? "",
    context: tr.context ?? "",
  };
}

export function TranslationForm({ mode, translation, t = {}, tCommon = {} }: TranslationFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit";

  const { data: languagesData } = useQuery({
    queryKey: ["languages-list"],
    queryFn: () => languageApi.getAll({ page: 1, page_size: 100 }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories-list"],
    queryFn: () => translationCategoryApi.getAll({ page: 1, page_size: 100 }),
  });

  const languages = languagesData?.data ?? [];
  const categories = categoriesData?.data ?? [];

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: translation ? toFormValues(translation) : defaultValues,
  });

  useEffect(() => {
    if (translation) reset(toFormValues(translation));
  }, [translation?.id, translation, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        category: parseInt(values.category, 10),
        language: parseInt(values.language, 10),
        key: values.key,
        value: values.value,
        context: values.context || undefined,
      };
      return isEdit ? translationApi.update(translation!.id, payload) : translationApi.create(payload);
    },
    onSuccess: () => {
      toast.success(
        isEdit
          ? (t.toast_updated ?? "Translation updated successfully")
          : (t.toast_created ?? "Translation added successfully"),
      );
      queryClient.invalidateQueries({ queryKey: ["translations"] });
      if (!isEdit) router.push("/admin/languages?tab=translations");
    },
    onError: () => toast.error(isEdit ? "Failed to update translation" : "Failed to add translation"),
  });

  const selectClass =
    "h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="mx-auto w-full max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.section_details ?? "Translation Details"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-6">
            <FieldGroup>
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={control}
                  name="language"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="tr-language">
                        {t.language_label ?? "Language"} <span className="text-destructive">*</span>
                      </FieldLabel>
                      <select id="tr-language" {...field} className={selectClass}>
                        <option value="">Select language</option>
                        {languages.map((l) => (
                          <option key={l.id} value={String(l.id)}>
                            {l.name} ({l.code})
                          </option>
                        ))}
                      </select>
                      {errors.language && <FieldError errors={[errors.language]} />}
                    </Field>
                  )}
                />
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="tr-category">
                        {t.category_label ?? "Category"} <span className="text-destructive">*</span>
                      </FieldLabel>
                      <select id="tr-category" {...field} className={selectClass}>
                        <option value="">Select category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={String(c.id)}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {errors.category && <FieldError errors={[errors.category]} />}
                    </Field>
                  )}
                />
              </div>

              <Controller
                control={control}
                name="key"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="tr-key">
                      {t.key_label ?? "Key"} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input id="tr-key" placeholder={t.key_placeholder ?? "e.g. login_success"} {...field} />
                    {errors.key && <FieldError errors={[errors.key]} />}
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="value"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="tr-value">
                      {t.value_label ?? "Value"} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Textarea
                      id="tr-value"
                      placeholder={t.value_placeholder ?? "Translated text"}
                      rows={4}
                      {...field}
                    />
                    {errors.value && <FieldError errors={[errors.value]} />}
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="context"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="tr-context">{t.context_label ?? "Context (optional)"}</FieldLabel>
                    <Input
                      id="tr-context"
                      placeholder={t.context_placeholder ?? "e.g. Login page success message"}
                      {...field}
                    />
                  </Field>
                )}
              />
            </FieldGroup>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.push("/admin/languages?tab=translations")}>
                {tCommon.cancel_btn ?? "Cancel"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => reset(translation ? toFormValues(translation) : defaultValues)}
              >
                {tCommon.reset_btn ?? "Reset"}
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : (tCommon.save_btn ?? "Save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
