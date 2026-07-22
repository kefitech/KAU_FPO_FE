"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { languageApi } from "@/app/admin/_api/language";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Language } from "@/types";

type T = Record<string, string>;

const schema = z.object({
  code: z.string().min(2, { message: "Code is required (e.g. ml, en)" }).max(10),
  name: z.string().min(1, { message: "Name is required" }),
  native_name: z.string().min(1, { message: "Native name is required" }),
  locale: z.string().min(1, { message: "Locale is required (e.g. ml_IN)" }),
  display_order: z.string().min(1, { message: "Display order is required" }),
  is_active: z.boolean(),
  is_default: z.boolean(),
  is_rtl: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface LanguageFormProps {
  mode: "create" | "edit";
  language?: Language;
  t?: T;
  tCommon?: T;
}

const defaultValues: FormValues = {
  code: "",
  name: "",
  native_name: "",
  locale: "",
  display_order: "1",
  is_active: true,
  is_default: false,
  is_rtl: false,
};

function toFormValues(lang: Language): FormValues {
  return {
    code: lang.code ?? "",
    name: lang.name ?? "",
    native_name: lang.native_name ?? "",
    locale: lang.locale ?? "",
    display_order: String(lang.display_order ?? 1),
    is_active: lang.is_active ?? true,
    is_default: lang.is_default ?? false,
    is_rtl: lang.is_rtl ?? false,
  };
}

export function LanguageForm({ mode, language, t = {}, tCommon = {} }: LanguageFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit";
  const [localeInfoOpen, setLocaleInfoOpen] = useState<boolean>(false);
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: language ? toFormValues(language) : defaultValues,
  });

  useEffect(() => {
    if (language) reset(toFormValues(language));
  }, [language?.id, reset, language]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        code: values.code,
        name: values.name,
        native_name: values.native_name,
        locale: values.locale,
        display_order: parseInt(values.display_order, 10),
        is_active: values.is_active,
        is_default: values.is_default,
        is_rtl: values.is_rtl,
      };
      return isEdit ? languageApi.update(language!.id, payload) : languageApi.create(payload);
    },
    onSuccess: () => {
      toast.success(
        isEdit
          ? (t.toast_updated ?? "Language updated successfully")
          : (t.toast_created ?? "Language added successfully"),
      );
      queryClient.invalidateQueries({ queryKey: ["languages"] });
      if (!isEdit) router.push("/admin/languages?tab=languages");
    },
    onError: (err: unknown) => {
      // console.log("err:", JSON.stringify(err));
      const apiErr = err as
        | { data?: { message?: string; errors?: Record<string, string[]> }; message?: string }
        | undefined;
      // console.log("serverErrors:", apiErr?.data?.errors);
      const serverErrors = apiErr?.data?.errors;
      if (serverErrors && Object.keys(serverErrors).length > 0) {
        Object.entries(serverErrors).forEach(([field, messages]) => {
          setError(field as keyof FormValues, { type: "server", message: messages[0] });
        });
      } else {
        toast.error(
          apiErr?.data?.message ?? apiErr?.message ?? (isEdit ? "Failed to update language" : "Failed to add language"),
        );
      }
    },
  });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.section_details ?? "Language Details"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-6">
            <FieldGroup>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Controller
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="lang-name">
                        {t.name_label ?? "Name"} <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input id="lang-name" placeholder={t.name_placeholder ?? "e.g. Malayalam"} {...field} />
                      {errors.name && <FieldError errors={[errors.name]} />}
                    </Field>
                  )}
                />
                <Controller
                  control={control}
                  name="code"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="lang-code">
                        {t.code_label ?? "Code"} <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input id="lang-code" placeholder={t.code_placeholder ?? "e.g. ml"} {...field} />
                      {errors.code && <FieldError errors={[errors.code]} />} {/* ✅ already there */}
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Controller
                  control={control}
                  name="native_name"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="lang-native">
                        {t.native_name_label ?? "Native Name"} <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input id="lang-native" placeholder={t.native_name_placeholder ?? "e.g. മലയാളം"} {...field} />
                      {errors.native_name && <FieldError errors={[errors.native_name]} />}
                    </Field>
                  )}
                />
                <Controller
                  control={control}
                  name="locale"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="lang-locale">
                        {t.locale_label ?? "Locale"} <span className="text-destructive">*</span>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip open={localeInfoOpen} onOpenChange={setLocaleInfoOpen}>
                            <TooltipTrigger
                              type="button"
                              tabIndex={-1}
                              className="leading-none"
                              onClick={(e) => {
                                e.preventDefault();
                                setLocaleInfoOpen((prev: boolean) => !prev);
                              }}
                            >
                              <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="w-72 text-xs">
                              <div className="flex flex-col gap-1.5">
                                <p>
                                  Enter a locale in the format language_REGION, using a language code followed by a
                                  country or region code.
                                </p>
                                <p className="text-muted-foreground">Example Format: language_REGION</p>
                                <div className="flex flex-col gap-0.5 text-muted-foreground">
                                  <span>ml_IN — Malayalam (India)</span>
                                  <span>en_US — English (United States)</span>
                                  <span>ta_IN — Tamil (India)</span>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FieldLabel>
                      <Input id="lang-locale" placeholder={t.locale_placeholder ?? "e.g. ml_IN"} {...field} />
                      {errors.locale && <FieldError errors={[errors.locale]} />}
                    </Field>
                  )}
                />
              </div>

              <Controller
                control={control}
                name="display_order"
                render={({ field }) => (
                  <Field className="max-w-48">
                    <FieldLabel htmlFor="lang-order">{t.display_order_label ?? "Display Order"}</FieldLabel>
                    <Input id="lang-order" type="number" min={1} {...field} />
                    {errors.display_order && <FieldError errors={[errors.display_order]} />}
                  </Field>
                )}
              />
            </FieldGroup>

            <div className="border-t pt-5">
              <p className="mb-4 font-medium text-muted-foreground text-sm">{t.section_settings ?? "Settings"}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Controller
                  control={control}
                  name="is_active"
                  render={({ field }) => (
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <FieldLabel className="mb-0 text-sm">{t.active_label ?? "Active"}</FieldLabel>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />
                <Controller
                  control={control}
                  name="is_default"
                  render={({ field }) => (
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <FieldLabel className="mb-0 text-sm">{t.default_label ?? "Default"}</FieldLabel>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />
                <Controller
                  control={control}
                  name="is_rtl"
                  render={({ field }) => (
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <FieldLabel className="mb-0 text-sm">{t.rtl_label ?? "RTL"}</FieldLabel>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.push("/admin/languages?tab=languages")}>
                {tCommon.cancel_btn ?? "Cancel"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => reset(language ? toFormValues(language) : defaultValues)}
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
