"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { notificationTemplateCodeApi } from "@/app/admin/_api/notification-template-code";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { NotificationTemplateCode } from "@/types";

type T = Record<string, string>;

const schema = z.object({
  code: z
    .string()
    .min(1, { message: "Code is required" })
    .regex(/^[a-z0-9_]+$/, {
      message: "Only lowercase letters, numbers and underscores",
    }),
  name: z.string().min(1, { message: "Name is required" }),
  channel: z.enum(["email", "sms", "in_app", "push", "whatsapp"] as const, {
    message: "Please select a channel",
  }),
  variables: z.string(),
  description: z.string(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface TemplateCodeFormProps {
  mode: "create" | "edit";
  templateCode?: NotificationTemplateCode;
  t?: T;
  tCommon?: T;
}

const defaultValues: FormValues = {
  code: "",
  name: "",
  channel: "email",
  variables: "",
  description: "",
  is_active: true,
};

function toFormValues(item: NotificationTemplateCode): FormValues {
  return {
    code: item.code,
    name: item.name,
    channel: item.channel,
    variables: item.variables.join(", "),
    description: item.description,
    is_active: item.is_active,
  };
}

export function TemplateCodeForm({ mode, templateCode, t = {}, tCommon = {} }: TemplateCodeFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit";

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: templateCode ? toFormValues(templateCode) : defaultValues,
  });

  useEffect(() => {
    if (templateCode) reset(toFormValues(templateCode));
  }, [templateCode?.id, templateCode, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        code: values.code,
        name: values.name,
        channel: values.channel,
        variables: values.variables
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        description: values.description,
        is_active: values.is_active,
      };
      return isEdit
        ? notificationTemplateCodeApi.update(templateCode!.id, payload)
        : notificationTemplateCodeApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Template code updated successfully" : "Template code created successfully");
      queryClient.invalidateQueries({ queryKey: ["notification-template-codes"] });
      if (!isEdit) router.push("/admin/notifications?tab=codes");
    },
    onError: () => toast.error(isEdit ? "Failed to update template code" : "Failed to create template code"),
  });

  const channels = [
    { value: "email", label: t.channel_email ?? "Email" },
    { value: "sms", label: t.channel_sms ?? "SMS" },
    { value: "in_app", label: t.channel_in_app ?? "In-App Notification" },
    { value: "whatsapp", label: t.channel_whatsapp ?? "WhatsApp" },
    // { value: "push", label: t.channel_push ?? "Push Notification" },
  ];

  return (
    <div className="mx-auto w-full max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.section_details ?? "Template Code Details"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-6">
            <FieldGroup>
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="tc-name">
                        {t.name_label ?? "Name"} <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        id="tc-name"
                        placeholder={t.name_placeholder ?? "e.g. FPO Application Approved"}
                        {...field}
                      />
                      {errors.name && <FieldError errors={[errors.name]} />}
                    </Field>
                  )}
                />
                <Controller
                  control={control}
                  name="code"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="tc-code">
                        {t.code_label ?? "Code"} <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        id="tc-code"
                        placeholder={t.code_placeholder ?? "e.g. fpo_approved"}
                        disabled={isEdit}
                        {...field}
                      />
                      {errors.code && <FieldError errors={[errors.code]} />}
                    </Field>
                  )}
                />
              </div>

              <Controller
                control={control}
                name="channel"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="tc-channel">
                      {t.channel_label ?? "Channel"} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <select
                      id="tc-channel"
                      value={field.value}
                      onChange={field.onChange}
                      className="h-9 w-full rounded-md border bg-background px-3 text-foreground text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {channels.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    {errors.channel && <FieldError errors={[errors.channel]} />}
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="variables"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="tc-variables">{t.variables_label ?? "Variables"}</FieldLabel>
                    <Input
                      id="tc-variables"
                      placeholder={t.variables_placeholder ?? "e.g. user_name, fpo_name, application_id"}
                      {...field}
                    />
                    <p className="text-muted-foreground text-xs">
                      {t.variables_helper ?? "Comma-separated placeholder names"}
                    </p>
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="description"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="tc-description">{t.description_label ?? "Description"}</FieldLabel>
                    <Textarea
                      id="tc-description"
                      placeholder={t.description_placeholder ?? "When is this notification sent?"}
                      rows={2}
                      {...field}
                    />
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
              <Button type="button" variant="outline" onClick={() => router.push("/admin/notifications?tab=codes")}>
                {tCommon.cancel_btn ?? "Cancel"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => reset(templateCode ? toFormValues(templateCode) : defaultValues)}
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
