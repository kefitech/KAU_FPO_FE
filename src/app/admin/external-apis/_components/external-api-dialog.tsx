"use client";

import { useEffect, useMemo } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { externalApisApi } from "@/app/admin/_api/external-apis";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ExternalApi } from "@/types/admin";

type T = Record<string, string>;

const SERVICE_OPTIONS = [
  { value: "pan_verification", label: "PAN Verification" },
  { value: "aadhaar_verification", label: "Aadhaar Verification" },
  { value: "gstin_verification", label: "GSTIN Verification" },
  { value: "bank_account_verification", label: "Bank Account Verification" },
];

const schema = z.object({
  service: z.string().min(1, { message: "Service is required" }),
  api_url: z.string().min(1, { message: "API URL is required" }),
  config: z.array(z.object({ key: z.string().min(1, { message: "Key required" }), value: z.string() })),
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  service: SERVICE_OPTIONS[0].value,
  api_url: "",
  config: [{ key: "", value: "" }],
};

function toFormValues(item: ExternalApi): FormValues {
  return {
    service: item.service,
    api_url: item.api_url ?? "",
    config: [{ key: "", value: "" }],
  };
}

interface ExternalApiDialogProps {
  open: boolean;
  onClose: () => void;
  editing?: ExternalApi | null;
  t: T;
  tCommon: T;
}

export function ExternalApiDialog({ open, onClose, editing, t, tCommon }: ExternalApiDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!editing;
  const editingValues = useMemo(() => (editing ? toFormValues(editing) : null), [editing]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "config" });

  useEffect(() => {
    if (open) reset(editingValues ?? defaultValues);
  }, [open, reset, editingValues]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const configObj = Object.fromEntries(
        values.config.filter((p) => p.key.trim()).map((p) => [p.key.trim(), p.value]),
      );
      if (isEdit && editing) {
        await externalApisApi.update(editing.id, { api_url: values.api_url, config: configObj });
      } else {
        await externalApisApi.create({ service: values.service, api_url: values.api_url, config: configObj });
      }
    },
    onSuccess: () => {
      toast.success(
        isEdit
          ? (t.toast_updated ?? "External API updated successfully")
          : (t.toast_created ?? "External API created successfully"),
      );
      queryClient.invalidateQueries({ queryKey: ["external-apis"] });
      onClose();
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? (isEdit ? "Failed to update" : "Failed to create"));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? (t.edit_title ?? "Edit External API") : (t.add_title ?? "Add External API")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="ea-service">
                {t.service_label ?? "Service"} <span className="text-destructive">*</span>
              </FieldLabel>
              <Controller
                control={control}
                name="service"
                render={({ field }) => (
                  <select
                    id="ea-service"
                    disabled={isEdit}
                    className="h-9 w-full rounded-md border bg-background px-3 text-foreground text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                    {...field}
                  >
                    {SERVICE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                    {isEdit && !SERVICE_OPTIONS.find((o) => o.value === field.value) && (
                      <option value={field.value}>{editing?.service_display ?? field.value}</option>
                    )}
                  </select>
                )}
              />
              {isEdit && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t.service_readonly_hint ?? "Service cannot be changed after creation."}
                </p>
              )}
              {errors.service && <FieldError errors={[errors.service]} />}
            </Field>

            <Field>
              <FieldLabel htmlFor="ea-api-url">
                {t.api_url_label ?? "API URL"} <span className="text-destructive">*</span>
              </FieldLabel>
              <Controller
                control={control}
                name="api_url"
                render={({ field }) => (
                  <Input
                    id="ea-api-url"
                    type="url"
                    placeholder={t.api_url_placeholder ?? "https://api.example.com/verify"}
                    {...field}
                  />
                )}
              />
              {errors.api_url && <FieldError errors={[errors.api_url]} />}
            </Field>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <FieldLabel className="mb-0">{t.section_config ?? "Config Fields"}</FieldLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => append({ key: "", value: "" })}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  {t.add_field_btn ?? "Add Field"}
                </Button>
              </div>
              {isEdit && (
                <p className="text-[11px] text-muted-foreground">
                  {t.config_edit_hint ?? "Only keys entered here will be merged. Existing keys are preserved."}
                </p>
              )}
              <div className="flex flex-col gap-2">
                {fields.length === 0 && (
                  <p className="py-2 text-center text-muted-foreground text-xs">
                    {t.config_empty ?? "No config fields. Click 'Add Field' to add one."}
                  </p>
                )}
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-2">
                    <Field className="flex-1">
                      <Controller
                        control={control}
                        name={`config.${index}.key`}
                        render={({ field: f }) => (
                          <Input placeholder={t.config_key_placeholder ?? "Key (e.g. api_key)"} {...f} />
                        )}
                      />
                      {errors.config?.[index]?.key && <FieldError errors={[errors.config[index].key]} />}
                    </Field>
                    <Field className="flex-1">
                      <Controller
                        control={control}
                        name={`config.${index}.value`}
                        render={({ field: f }) => <Input placeholder={t.config_value_placeholder ?? "Value"} {...f} />}
                      />
                    </Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
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
