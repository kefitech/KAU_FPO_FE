"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { notificationTemplateCodeApi } from "@/app/admin/_api/notification-template-code";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  channel: z.enum(["email", "sms", "in_app", "push"] as const, {
    message: "Please select a channel",
  }),
  variables: z.string(),
  description: z.string(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface TemplateCodeDialogProps {
  open: boolean;
  onClose: () => void;
  editing?: NotificationTemplateCode | null;
  t: T;
  tCommon: T;
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

export function TemplateCodeDialog({ open, onClose, editing, t, tCommon }: TemplateCodeDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!editing;
  const editingValues = editing ? toFormValues(editing) : null;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (open) reset(editingValues ?? defaultValues);
  }, [open, reset, editingValues]);

  const channels = [
    { value: "email", label: t.channel_email ?? "Email" },
    { value: "sms", label: t.channel_sms ?? "SMS" },
    { value: "in_app", label: t.channel_in_app ?? "In-App Notification" },
    { value: "push", label: t.channel_push ?? "Push Notification" },
  ];

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
        ? notificationTemplateCodeApi.update(editing!.id, payload)
        : notificationTemplateCodeApi.create(payload);
    },
    onSuccess: () => {
      toast.success(`Template code ${isEdit ? "updated" : "created"} successfully`);
      queryClient.invalidateQueries({ queryKey: ["notification-template-codes"] });
      onClose();
    },
    onError: () => toast.error(t.toast_create_failed ?? `Failed to ${isEdit ? "update" : "create"} template code`),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? (t.edit_title ?? "Edit Template Code") : (t.add_title ?? "Add Template Code")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="tc-name">
                  {t.name_label ?? "Name"} <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="tc-name"
                  placeholder={t.name_placeholder ?? "e.g. FPO Application Approved"}
                  {...register("name")}
                />
                {errors.name && <FieldError errors={[errors.name]} />}
              </Field>
              <Field>
                <FieldLabel htmlFor="tc-code">
                  {t.code_label ?? "Code"} <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="tc-code"
                  placeholder={t.code_placeholder ?? "e.g. fpo_approved"}
                  {...register("code")}
                  disabled={isEdit}
                />
                {errors.code && <FieldError errors={[errors.code]} />}
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="tc-channel">
                {t.channel_label ?? "Channel"} <span className="text-destructive">*</span>
              </FieldLabel>
              <select
                id="tc-channel"
                {...register("channel")}
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

            <Field>
              <FieldLabel htmlFor="tc-variables">{t.variables_label ?? "Variables"}</FieldLabel>
              <Input
                id="tc-variables"
                placeholder={t.variables_placeholder ?? "e.g. user_name, fpo_name, application_id"}
                {...register("variables")}
              />
              <p className="text-muted-foreground text-xs">
                {t.variables_helper ?? "Comma-separated placeholder names"}
              </p>
            </Field>

            <Field>
              <FieldLabel htmlFor="tc-description">{t.description_label ?? "Description"}</FieldLabel>
              <Textarea
                id="tc-description"
                placeholder={t.description_placeholder ?? "When is this notification sent?"}
                rows={2}
                {...register("description")}
              />
            </Field>

            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <FieldLabel className="mb-0">{t.active_label ?? "Active"}</FieldLabel>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </div>
              )}
            />
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {tCommon.cancel_btn ?? "Cancel"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => reset(editingValues ?? defaultValues)}>
              {tCommon.reset_btn ?? "Reset"}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : (tCommon.save_btn ?? "Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
