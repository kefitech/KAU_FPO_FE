"use client";

import { useEffect, useMemo } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { externalApisApi } from "@/app/admin/_api/external-apis";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ExternalApi } from "@/types/admin";

type T = Record<string, string>;

interface ConfigField {
  key: string;
  label: string;
  labelKey: string;
}

interface ServiceOption {
  value: string;
  label: string;
  // URL the backend falls back to when API URL is left blank, which makes it optional.
  // Keep in sync with DEFAULT_URL_SERVICES in the backend's external_apis.py.
  defaultUrl?: string;
  // Services whose backend integration reads config by exact key names get labelled
  // inputs instead of the free-form key/value list. Keep in sync with
  // REQUIRED_CONFIG_KEYS in the backend's apps/accounts/api/admin/external_apis.py.
  fields?: ConfigField[];
}

const API_KEY_FIELD: ConfigField = { key: "api_key", label: "API Key", labelKey: "config_api_key_label" };

const SERVICE_OPTIONS: ServiceOption[] = [
  { value: "pan_verification", label: "PAN Verification" },
  { value: "aadhaar_verification", label: "Aadhaar Verification" },
  { value: "gstin_verification", label: "GSTIN Verification" },
  { value: "bank_account_verification", label: "Bank Account Verification" },
  {
    value: "weather_api",
    label: "Weather API",
    defaultUrl: "https://api.openweathermap.org/data/2.5/weather",
    fields: [API_KEY_FIELD],
  },
  {
    value: "youtube_api",
    label: "YouTube Data API",
    defaultUrl: "https://www.googleapis.com/youtube/v3",
    fields: [API_KEY_FIELD],
  },
];

const fixedFieldsFor = (service: string) => SERVICE_OPTIONS.find((o) => o.value === service)?.fields;

export const defaultUrlFor = (service: string) => SERVICE_OPTIONS.find((o) => o.value === service)?.defaultUrl;

const configRowsFor = (service: string) =>
  fixedFieldsFor(service)?.map((f) => ({ key: f.key, value: "" })) ?? [{ key: "", value: "" }];

const baseSchema = z.object({
  service: z.string().min(1, { message: "Service is required" }),
  api_url: z.string(),
  config: z.array(z.object({ key: z.string().min(1, { message: "Key required" }), value: z.string() })),
});

type FormValues = z.infer<typeof baseSchema>;

// API URL is required only for services without a backend default. A fixed field is
// required unless the entry being edited already has it saved; leaving a saved one
// blank keeps the stored (masked) value
const buildSchema = (savedKeys: string[]) =>
  baseSchema.superRefine((values, ctx) => {
    if (!values.api_url.trim() && !defaultUrlFor(values.service)) {
      ctx.addIssue({ code: "custom", path: ["api_url"], message: "API URL is required" });
    }
    const fixed = fixedFieldsFor(values.service) ?? [];
    values.config.forEach((row, index) => {
      const field = fixed.find((f) => f.key === row.key);
      if (field && !savedKeys.includes(field.key) && !row.value.trim()) {
        ctx.addIssue({ code: "custom", path: ["config", index, "value"], message: `${field.label} is required` });
      }
    });
  });

const defaultValues: FormValues = {
  service: SERVICE_OPTIONS[0].value,
  api_url: "",
  config: configRowsFor(SERVICE_OPTIONS[0].value),
};

function toFormValues(item: ExternalApi): FormValues {
  return {
    service: item.service,
    api_url: item.api_url ?? "",
    config: configRowsFor(item.service),
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
  const savedKeys = useMemo(
    () =>
      Object.entries(editing?.config ?? {})
        .filter(([, value]) => value)
        .map(([key]) => key),
    [editing],
  );
  const schema = useMemo(() => buildSchema(savedKeys), [savedKeys]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: "config" });
  const service = useWatch({ control, name: "service" });
  const fixedFields = fixedFieldsFor(service);
  const defaultUrl = defaultUrlFor(service);

  useEffect(() => {
    if (open) reset(editingValues ?? defaultValues);
  }, [open, reset, editingValues]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Blank fixed fields are dropped so an edit keeps the saved (masked) value
      const isFixed = !!fixedFieldsFor(values.service);
      const configObj = Object.fromEntries(
        values.config
          .filter((p) => p.key.trim() && (!isFixed || p.value.trim()))
          .map((p) => [p.key.trim(), isFixed ? p.value.trim() : p.value]),
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
      // The API client rejects with { message, status, data }, message being the backend's
      const msg = (error as { message?: unknown })?.message;
      toast.error(typeof msg === "string" && msg ? msg : isEdit ? "Failed to update" : "Failed to create");
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
                    onChange={(e) => {
                      field.onChange(e);
                      replace(configRowsFor(e.target.value));
                    }}
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
                {t.api_url_label ?? "API URL"} {!defaultUrl && <span className="text-destructive">*</span>}
              </FieldLabel>
              <Controller
                control={control}
                name="api_url"
                render={({ field }) => (
                  <Input
                    id="ea-api-url"
                    type="url"
                    placeholder={defaultUrl ?? t.api_url_placeholder ?? "https://api.example.com/verify"}
                    {...field}
                  />
                )}
              />
              {defaultUrl && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t.api_url_default_hint ?? "Optional. Leave blank to use the default:"}{" "}
                  <span className="break-all font-mono">{defaultUrl}</span>
                </p>
              )}
              {errors.api_url && <FieldError errors={[errors.api_url]} />}
            </Field>

            {fixedFields ? (
              fields.map((row, index) => {
                const configField = fixedFields.find((f) => f.key === row.key);
                if (!configField) return null;
                const saved = savedKeys.includes(configField.key);
                return (
                  <Field key={row.id}>
                    <FieldLabel htmlFor={`ea-config-${configField.key}`}>
                      {t[configField.labelKey] ?? configField.label}{" "}
                      {!saved && <span className="text-destructive">*</span>}
                    </FieldLabel>
                    <Controller
                      control={control}
                      name={`config.${index}.value`}
                      render={({ field: f }) => (
                        <Input
                          id={`ea-config-${configField.key}`}
                          autoComplete="off"
                          placeholder={saved ? (t.config_saved_placeholder ?? "Saved — leave blank to keep it") : ""}
                          {...f}
                        />
                      )}
                    />
                    {errors.config?.[index]?.value && <FieldError errors={[errors.config[index].value]} />}
                  </Field>
                );
              })
            ) : (
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
                          render={({ field: f }) => (
                            <Input placeholder={t.config_value_placeholder ?? "Value"} {...f} />
                          )}
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
            )}
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
