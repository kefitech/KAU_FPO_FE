"use client";
import { useEffect, useMemo } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { cbbosApi } from "@/app/admin/_api/cbbos";
import { organisationsApi } from "@/app/admin/_api/organisations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { CBBO, CBBOLevel, CBBOUpdatePayload, NotificationChannelType } from "@/types/admin";

type T = Record<string, string>;

const NOTIFICATION_CHANNELS: { value: NotificationChannelType; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
];

const createSchema = z
  .object({
    email: z
      .string()
      .email({ message: "Enter a valid email address" })
      .max(50, { message: "Email must be at most 50 characters" }),
    first_name: z.string().min(1, { message: "First name is required" }).max(50, { message: "Max 50 characters" }),
    last_name: z.string().min(1, { message: "Last name is required" }).max(50, { message: "Max 50 characters" }),
    phone: z
      .string()
      .min(10, { message: "Enter a valid phone number" })
      .max(15, { message: "Max 15 digits" })
      .regex(/^\+?[0-9]{10,15}$/, { message: "Only digits allowed (optional leading +)" }),
    notification_channel: z.enum(["email", "sms", "in_app"]),
    level: z.enum(["district", "state"]),
    district_codes: z.array(z.string()),
    organisation: z.number({ error: "Select an organisation" }),
  })
  .refine((data) => data.level === "state" || data.district_codes.length > 0, {
    message: "Select at least one district",
    path: ["district_codes"],
  });

const editSchema = z
  .object({
    email: z
      .string()
      .email({ message: "Enter a valid email address" })
      .max(35, { message: "Email must be at most 35 characters" }),
    first_name: z.string().min(1, { message: "First name is required" }).max(50, { message: "Max 50 characters" }),
    last_name: z.string().min(1, { message: "Last name is required" }).max(50, { message: "Max 50 characters" }),
    phone: z
      .string()
      .min(10, { message: "Enter a valid phone number" })
      .max(15, { message: "Max 15 digits" })
      .regex(/^\+?[0-9]{10,15}$/, { message: "Only digits allowed (optional leading +)" }),
    level: z.enum(["district", "state"]),
    district_codes: z.array(z.string()),
  })
  .refine((data) => data.level === "state" || data.district_codes.length > 0, {
    message: "Select at least one district",
    path: ["district_codes"],
  });

type FormValues = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  notification_channel: NotificationChannelType;
  level: CBBOLevel;
  district_codes: string[];
  organisation?: number;
};

interface CBBOFormProps {
  mode: "create" | "edit";
  cbbo?: CBBO;
  t?: T;
  tCommon?: T;
}

const defaultValues: FormValues = {
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  notification_channel: "email",
  level: "district",
  district_codes: [],
  organisation: undefined,
};

function toFormValues(item: CBBO): FormValues {
  const isState = item.scope === "STATE";
  return {
    email: item.email ?? "",
    first_name: item.first_name ?? "",
    last_name: item.last_name ?? "",
    phone: item.phone ?? "",
    notification_channel: "email",
    level: isState ? "state" : "district",
    district_codes: isState ? [] : (item.scope as string[]),
  };
}

export function CBBOForm({ mode, cbbo, t = {}, tCommon = {} }: CBBOFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit";
  const editingValues = useMemo(() => (cbbo ? toFormValues(cbbo) : null), [cbbo]);
  const schema = isEdit ? editSchema : createSchema;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setFocus,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: editingValues ?? defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    if (editingValues) reset(editingValues);
  }, [reset, editingValues]);

  const level = watch("level");
  const { data: availableDistricts = [] } = useQuery({
    queryKey: ["available-districts"],
    queryFn: () => cbbosApi.getAvailableDistricts(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: organisationsData } = useQuery({
    queryKey: ["organisations-for-cbbo-form"],
    queryFn: () => organisationsApi.getAll({ page: 1, page_size: 200 }),
    staleTime: 5 * 60 * 1000,
  });
  const availableOrganisations = organisationsData?.data ?? [];
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isEdit && cbbo) {
        const basicPayload: CBBOUpdatePayload = {
          first_name: values.first_name,
          last_name: values.last_name,
        };
        if (values.phone) basicPayload.phone = values.phone;
        await cbbosApi.update(cbbo.id, basicPayload);

        if (values.level === "state") {
          // Backend rejects district-level assignment once state-wide exists;
          // for edit-to-state we simply clear existing district rows via "replace" with empty list,
          // then rely on create-time state row only if it doesn't already exist.
          // Simpler: not supported here — switching level after creation isn't handled by /districts/.
          // If needed, this requires a dedicated backend action; skip silently if already state.
          if (cbbo.scope !== "STATE") {
            toast.error(
              "Switching an existing CBBO to state-wide isn't supported yet. Deactivate and recreate instead.",
            );
            return;
          }
        } else {
          await cbbosApi.setDistricts(cbbo.id, "replace", values.district_codes);
        }
      } else {
        await cbbosApi.create({
          email: values.email,
          first_name: values.first_name,
          last_name: values.last_name,
          phone: values.phone,
          notification_channel: values.notification_channel,
          level: values.level,
          district_codes: values.district_codes,
          organisation: values.organisation as number,
        });
      }
    },
    onSuccess: () => {
      toast.success(
        isEdit ? (t.toast_updated ?? "CBBO updated successfully") : (t.toast_created ?? "CBBO created successfully"),
      );
      queryClient.invalidateQueries({ queryKey: ["cbbos"] });
      if (isEdit && cbbo) {
        queryClient.invalidateQueries({ queryKey: ["cbbo", String(cbbo.id)] });
      } else {
        router.push("/admin/cbbos");
      }
    },
    onError: (error: unknown) => {
      const response = (error as { data?: { message?: string; errors?: Record<string, string[]> } })?.data;
      const fieldErrors = response?.errors;
      if (fieldErrors) {
        Object.entries(fieldErrors).forEach(([field, messages]) => {
          if (field in defaultValues) {
            setError(field as keyof FormValues, { type: "server", message: messages[0] });
          }
        });
        const firstField = Object.keys(fieldErrors)[0];
        if (firstField && firstField in defaultValues) {
          setFocus(firstField as keyof FormValues);
        }
      } else {
        toast.error(response?.message ?? (isEdit ? "Failed to update CBBO" : "Failed to create CBBO"));
      }
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.section_basic ?? "Basic Information"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <FieldGroup className="gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="cb-first-name">
                    {t.first_name_label ?? "First Name"} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="first_name"
                    render={({ field }) => (
                      <Input
                        id="cb-first-name"
                        placeholder={t.first_name_placeholder ?? "John"}
                        maxLength={50}
                        {...field}
                      />
                    )}
                  />
                  {errors.first_name && <FieldError errors={[errors.first_name]} />}
                </Field>
                <Field>
                  <FieldLabel htmlFor="cb-last-name">
                    {t.last_name_label ?? "Last Name"} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="last_name"
                    render={({ field }) => (
                      <Input
                        id="cb-last-name"
                        placeholder={t.last_name_placeholder ?? "Doe"}
                        maxLength={50}
                        {...field}
                      />
                    )}
                  />
                  {errors.last_name && <FieldError errors={[errors.last_name]} />}
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="cb-email">
                  {t.email_label ?? "Email"} <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="email"
                  render={({ field }) => (
                    <Input
                      id="cb-email"
                      type="email"
                      placeholder={t.email_placeholder ?? "cbbo@example.com"}
                      disabled={isEdit}
                      maxLength={50}
                      {...field}
                    />
                  )}
                />
                {errors.email && <FieldError errors={[errors.email]} />}
              </Field>
              <Field>
                <FieldLabel htmlFor="cb-phone">
                  {t.phone_label ?? "Phone"} <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="phone"
                  render={({ field }) => (
                    <Input
                      id="cb-phone"
                      type="tel"
                      placeholder={t.phone_placeholder ?? "+91 98765 43210"}
                      maxLength={15}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.replace(/(?!^\+)[^0-9]/g, ""))}
                    />
                  )}
                />
                {errors.phone && <FieldError errors={[errors.phone]} />}
              </Field>
            </FieldGroup>
            {!isEdit && (
              <div className="border-t pt-5">
                <p className="mb-4 font-medium text-muted-foreground text-sm">{t.section_account ?? "Account Setup"}</p>
                <Field>
                  <FieldLabel htmlFor="cb-notification-channel">
                    {t.notification_channel_label ?? "Send Credentials Via"} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="notification_channel"
                    render={({ field }) => (
                      <select
                        id="cb-notification-channel"
                        className="h-9 w-full rounded-md border bg-background px-3 text-foreground text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        {...field}
                      >
                        {NOTIFICATION_CHANNELS.map((ch) => (
                          <option key={ch.value} value={ch.value}>
                            {ch.label}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t.notification_channel_hint ?? "A generated password will be sent to the CBBO via this channel."}
                  </p>
                </Field>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.section_scope ?? "Jurisdiction"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field>
              <FieldLabel>{t.level_label ?? "Access Level"}</FieldLabel>
              <Controller
                control={control}
                name="level"
                render={({ field }) => (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={field.value === "district" ? "default" : "outline"}
                      size="sm"
                      onClick={() => field.onChange("district")}
                      disabled={isEdit && cbbo?.scope === "STATE"}
                    >
                      {t.level_district ?? "District-wise"}
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "state" ? "default" : "outline"}
                      size="sm"
                      onClick={() => field.onChange("state")}
                      disabled={isEdit}
                    >
                      {t.level_state ?? "State-wide"}
                    </Button>
                  </div>
                )}
              />
              {isEdit && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t.level_edit_hint ??
                    "Access level can't be changed after creation — deactivate and recreate the account instead."}
                </p>
              )}
            </Field>

            {level === "district" && (
              <Controller
                control={control}
                name="district_codes"
                render={({ field }) => {
                  const selected: string[] = field.value;
                  return (
                    <FieldGroup className="gap-3">
                      {selected.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {selected.map((code) => (
                            <Badge
                              key={code}
                              variant="secondary"
                              className="cursor-pointer text-[10px]"
                              onClick={() => field.onChange(selected.filter((s) => s !== code))}
                            >
                              {code} ×
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="grid max-h-72 grid-cols-2 gap-0.5 overflow-y-auto rounded-md border bg-background px-2 py-1 sm:grid-cols-3">
                        {availableDistricts.length === 0 && (
                          <span className="col-span-full px-1 py-2 text-muted-foreground text-xs">
                            {t.districts_loading ?? "Loading districts..."}
                          </span>
                        )}
                        {availableDistricts.map((d) => {
                          const checked = selected.includes(d.code);
                          return (
                            <label
                              key={d.code}
                              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 shrink-0 rounded border accent-primary"
                                checked={checked}
                                onChange={() =>
                                  field.onChange(checked ? selected.filter((s) => s !== d.code) : [...selected, d.code])
                                }
                              />
                              <span className="text-sm">{d.name}</span>
                            </label>
                          );
                        })}
                      </div>
                      {errors.district_codes && <FieldError errors={[errors.district_codes]} />}
                    </FieldGroup>
                  );
                }}
              />
            )}

            {!isEdit && (
              <Controller
                control={control}
                name="organisation"
                render={({ field }) => (
                  <FieldGroup className="gap-2">
                    <FieldLabel htmlFor="cbbo-organisation">Organisation *</FieldLabel>
                    <select
                      id="cbbo-organisation"
                      className="h-9 w-full rounded-md border bg-background px-3 text-foreground text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    >
                      <option value="">Select an organisation</option>
                      {availableOrganisations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name} ({org.org_type_display})
                        </option>
                      ))}
                    </select>
                    {errors.organisation && <FieldError errors={[errors.organisation]} />}
                  </FieldGroup>
                )}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/cbbos")}>
            {tCommon.cancel_btn ?? "Cancel"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => reset(editingValues ?? defaultValues)}>
            {tCommon.reset_btn ?? "Reset"}
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : (tCommon.save_btn ?? "Save")}
          </Button>
        </div>
      </div>
    </form>
  );
}
