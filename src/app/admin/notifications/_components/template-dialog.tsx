"use client";

import { useEffect } from "react";

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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

interface TemplateDialogProps {
  open: boolean;
  onClose: () => void;
  editing?: NotificationTemplate | null;
  t: T;
  tCommon: T;
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

export function TemplateDialog({ open, onClose, editing, t, tCommon }: TemplateDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!editing;
  const editingValues = editing ? toFormValues(editing) : null;

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (open) reset(editingValues ?? defaultValues);
  }, [open, reset, editingValues]);

  const { data: codesData } = useQuery({
    queryKey: ["notification-template-codes-list"],
    queryFn: () => notificationTemplateCodeApi.getAll({ page: 1, page_size: 100 }),
    enabled: open,
  });

  const { data: languagesData } = useQuery({
    queryKey: ["languages-list"],
    queryFn: () => languageApi.getAll({ page: 1, page_size: 100 }),
    enabled: open,
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
      return isEdit ? notificationTemplateApi.update(editing!.id, payload) : notificationTemplateApi.create(payload);
    },
    onSuccess: () => {
      toast.success(`Template ${isEdit ? "updated" : "created"} successfully`);
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
      queryClient.invalidateQueries({ queryKey: ["notification-template-codes"] });
      onClose();
    },
    onError: () => toast.error(t.toast_create_failed ?? `Failed to ${isEdit ? "update" : "create"} template`),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? (t.edit_title ?? "Edit Template") : (t.add_title ?? "Add Template")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="t-code">
                {t.code_label ?? "Template Code"} <span className="text-destructive">*</span>
              </FieldLabel>
              <select
                id="t-code"
                {...register("template_code")}
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

            <Field>
              <FieldLabel htmlFor="t-lang">
                {t.language_label ?? "Language"} <span className="text-destructive">*</span>
              </FieldLabel>
              <select
                id="t-lang"
                {...register("language")}
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

            <Field>
              <FieldLabel htmlFor="t-subject">{t.subject_label ?? "Subject"}</FieldLabel>
              <Input
                id="t-subject"
                placeholder={t.subject_placeholder ?? "e.g. Your FPO application has been approved"}
                {...register("subject")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="t-body">
                {t.body_label ?? "Body"} <span className="text-destructive">*</span>
              </FieldLabel>
              <Textarea
                id="t-body"
                placeholder={
                  t.body_placeholder ?? "Write the notification body here. Use {variable_name} for placeholders."
                }
                rows={5}
                {...register("body")}
              />
              {errors.body && <FieldError errors={[errors.body]} />}
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
