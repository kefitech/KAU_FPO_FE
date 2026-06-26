"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { languageApi } from "@/app/admin/_api/language";
import { notificationTemplateApi } from "@/app/admin/_api/notification-template";
import { notificationTemplateCodeApi } from "@/app/admin/_api/notification-template-code";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { NotificationTemplate } from "@/types";

type T = Record<string, string>;

const schema = z.object({
  template_code: z.string().min(1, { message: "Please select a template code" }),
  language: z.string().min(1, { message: "Please select a language" }),
  subject: z.string(),
  body: z.string().min(1, { message: "Body is required" }),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface TemplateFormProps {
  mode: "create" | "edit";
  template?: NotificationTemplate;
  t?: T;
  tCommon?: T;
}

const defaultValues: FormValues = {
  template_code: "",
  language: "",
  subject: "",
  body: "",
  is_active: true,
};

function toFormValues(item: NotificationTemplate): FormValues {
  return {
    template_code: String(item.template_code),
    language: String(item.language),
    subject: item.subject,
    body: item.body,
    is_active: item.is_active,
  };
}

export function TemplateForm({ mode, template, t = {}, tCommon = {} }: TemplateFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit";

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: template ? toFormValues(template) : defaultValues,
  });

  useEffect(() => {
    if (template) reset(toFormValues(template));
  }, [template?.id, template, reset]);

  const { data: codesData } = useQuery({
    queryKey: ["notification-template-codes-list"],
    queryFn: () => notificationTemplateCodeApi.getAll({ page: 1, page_size: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: languagesData } = useQuery({
    queryKey: ["languages-list"],
    queryFn: () => languageApi.getAll({ page: 1, page_size: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const codes = codesData?.data ?? [];
  const languages = languagesData?.data ?? [];

  const selectedCodeId = watch("template_code");
  const selectedCode = codes.find((c) => String(c.id) === selectedCodeId);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        template_code: Number(values.template_code),
        language: Number(values.language),
        subject: values.subject,
        body: values.body,
        is_active: values.is_active,
      };
      return isEdit ? notificationTemplateApi.update(template!.id, payload) : notificationTemplateApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Template updated successfully" : "Template created successfully");
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
      queryClient.invalidateQueries({ queryKey: ["notification-template-codes"] });
      if (!isEdit) router.push("/admin/notifications?tab=templates");
    },
    onError: (error: any) => {
      console.log("raw error:", error);
      const data = error?.data; // 👈 change error?.response?.data → error?.data

      if (data?.code === "validation_error" && data?.errors) {
        Object.entries(data.errors).forEach(([field, messages]) => {
          setError(field as any, {
            type: "server",
            message: (messages as string[])[0],
          });
        });
      } else {
        toast.error(error?.message ?? (isEdit ? "Failed to update template" : "Failed to create template"));
        //           👆 error.message directly, since interceptor hoisted it up
      }
    },
  });

  return (
    <div className="mx-auto w-full max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.section_details ?? "Template Details"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-6">
            <FieldGroup>
              <Controller
                control={control}
                name="template_code"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="t-code">
                      {t.code_label ?? "Template Code"} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <select
                      id="t-code"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isEdit}
                      className="h-9 w-full rounded-md border bg-background px-3 text-foreground text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
                    >
                      <option value="">{t.code_placeholder ?? "Select template code"}</option>
                      {codes.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                    {errors.template_code && <FieldError errors={[errors.template_code]} />}
                  </Field>
                )}
              />

              {selectedCode && (
                <div className="space-y-1 rounded-md border bg-muted/40 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Channel:</span>
                    <span className="font-medium">{selectedCode.channel_display}</span>
                  </div>
                  {selectedCode.variables.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-muted-foreground">Variables:</span>
                      {selectedCode.variables.map((v) => (
                        <Badge key={v} variant="secondary" className="px-1 font-mono text-xs">
                          {`{${v}}`}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Controller
                control={control}
                name="language"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="t-lang">
                      {t.language_label ?? "Language"} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <select
                      id="t-lang"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isEdit}
                      className="h-9 w-full rounded-md border bg-background px-3 text-foreground text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
                    >
                      <option value="">{t.language_placeholder ?? "Select language"}</option>
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
                name="subject"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="t-subject">{t.subject_label ?? "Subject"}</FieldLabel>
                    <Input
                      id="t-subject"
                      placeholder={t.subject_placeholder ?? "e.g. Your FPO application has been approved"}
                      {...field}
                    />
                    {errors.subject && <FieldError errors={[errors.subject]} />} {/* 👈 add this */}
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="body"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="t-body">
                      {t.body_label ?? "Body"} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Textarea
                      id="t-body"
                      placeholder={
                        t.body_placeholder ?? "Write the notification body here. Use {variable_name} for placeholders."
                      }
                      rows={6}
                      {...field}
                    />
                    {errors.body && <FieldError errors={[errors.body]} />}
                  </Field>
                )}
              />
            </FieldGroup>

            <div className="border-t pt-5">
              <p className="mb-4 font-medium text-muted-foreground text-sm">{t.section_settings ?? "Settings"}</p>
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
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.push("/admin/notifications?tab=templates")}>
                {tCommon.cancel_btn ?? "Cancel"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => reset(template ? toFormValues(template) : defaultValues)}
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
