"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { governmentApi } from "@/app/admin/_api/government";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { GovernmentOfficial, GovtJurisdictionType, GovernmentUpdatePayload, NotificationChannelType } from "@/types/admin";

type T = Record<string, string>;

const NOTIFICATION_CHANNELS: { value: NotificationChannelType; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
];

const createSchema = z.object({
  email: z.string().email({ message: "Enter a valid email address" }).max(50, { message: "Email must be at most 50 characters" }),
  first_name: z.string().min(1, { message: "First name is required" }).max(50, { message: "Max 50 characters" }),
  last_name: z.string().min(1, { message: "Last name is required" }).max(50, { message: "Max 50 characters" }),
  phone: z
    .string()
    .min(10, { message: "Enter a valid phone number" })
    .max(15, { message: "Max 15 digits" })
    .regex(/^\+?[0-9]{10,15}$/, { message: "Only digits allowed (optional leading +)" }),
  notification_channel: z.enum(["email", "sms", "in_app"]),
  designation: z.string().min(1, { message: "Designation is required" }).max(200),
  department: z.string().min(1, { message: "Department is required" }).max(200),
  jurisdiction_type: z.enum(["district", "block", "state"]),
  assigned_district: z.string().nullable(),
  assigned_block: z.string().nullable(),
}).refine((data) => data.jurisdiction_type !== "district" || !!data.assigned_district, {
  message: "Select a district",
  path: ["assigned_district"],
}).refine((data) => data.jurisdiction_type !== "block" || !!data.assigned_block, {
  message: "Select a block",
  path: ["assigned_block"],
});

const editSchema = z.object({
  email: z.string().email({ message: "Enter a valid email address" }).max(50),
  first_name: z.string().min(1, { message: "First name is required" }).max(50),
  last_name: z.string().min(1, { message: "Last name is required" }).max(50),
  phone: z
    .string()
    .min(10, { message: "Enter a valid phone number" })
    .max(15, { message: "Max 15 digits" })
    .regex(/^\+?[0-9]{10,15}$/, { message: "Only digits allowed (optional leading +)" }),
  designation: z.string().min(1, { message: "Designation is required" }).max(200),
  department: z.string().min(1, { message: "Department is required" }).max(200),
  jurisdiction_type: z.enum(["district", "block", "state"]),
  assigned_district: z.string().nullable(),
  assigned_block: z.string().nullable(),
}).refine((data) => data.jurisdiction_type !== "district" || !!data.assigned_district, {
  message: "Select a district",
  path: ["assigned_district"],
}).refine((data) => data.jurisdiction_type !== "block" || !!data.assigned_block, {
  message: "Select a block",
  path: ["assigned_block"],
});

type FormValues = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  notification_channel: NotificationChannelType;
  designation: string;
  department: string;
  jurisdiction_type: GovtJurisdictionType;
  assigned_district: string | null;
  assigned_block: string | null;
};

interface GovernmentFormProps {
  mode: "create" | "edit";
  official?: GovernmentOfficial;
  t?: T;
  tCommon?: T;
}

const defaultValues: FormValues = {
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  notification_channel: "email",
  designation: "",
  department: "",
  jurisdiction_type: "district",
  assigned_district: null,
  assigned_block: null,
};

function toFormValues(item: GovernmentOfficial): FormValues {
  return {
    email: item.email ?? "",
    first_name: item.first_name ?? "",
    last_name: item.last_name ?? "",
    phone: item.phone ?? "",
    notification_channel: "email",
    designation: item.designation ?? "",
    department: item.department ?? "",
    jurisdiction_type: item.jurisdiction_type,
    assigned_district: item.assigned_district,
    assigned_block: item.assigned_block,
  };
}

export function GovernmentForm({ mode, official, t = {}, tCommon = {} }: GovernmentFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit";
  const editingValues = useMemo(() => (official ? toFormValues(official) : null), [official]);
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

  const jurisdictionType = watch("jurisdiction_type");

  const { data: availableDistricts = [] } = useQuery({
    queryKey: ["available-districts"],
    queryFn: () => governmentApi.getAvailableDistricts(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: availableBlocks = [] } = useQuery({
    queryKey: ["available-blocks"],
    queryFn: () => governmentApi.getAvailableBlocks(),
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isEdit && official) {
        const basicPayload: GovernmentUpdatePayload = {
          first_name: values.first_name,
          last_name: values.last_name,
          designation: values.designation,
          department: values.department,
        };
        if (values.phone) basicPayload.phone = values.phone;
        await governmentApi.update(official.id, basicPayload);
        await governmentApi.setJurisdiction(official.id, values.jurisdiction_type, values.assigned_district, values.assigned_block);
      } else {
        await governmentApi.create({
          email: values.email,
          first_name: values.first_name,
          last_name: values.last_name,
          phone: values.phone,
          notification_channel: values.notification_channel,
          designation: values.designation,
          department: values.department,
          jurisdiction_type: values.jurisdiction_type,
          assigned_district: values.jurisdiction_type === "district" ? values.assigned_district : null,
          assigned_block: values.jurisdiction_type === "block" ? values.assigned_block : null,
        });
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? (t.toast_updated ?? "Official updated successfully") : (t.toast_created ?? "Official created successfully"));
      queryClient.invalidateQueries({ queryKey: ["government"] });
      if (isEdit && official) {
        queryClient.invalidateQueries({ queryKey: ["government-official", String(official.id)] });
      } else {
        router.push("/admin/government");
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
        toast.error(response?.message ?? (isEdit ? "Failed to update official" : "Failed to create official"));
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
                  <FieldLabel htmlFor="gv-first-name">
                    {t.first_name_label ?? "First Name"} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="first_name"
                    render={({ field }) => <Input id="gv-first-name" placeholder={t.first_name_placeholder ?? "Jane"} maxLength={50} {...field} />}
                  />
                  {errors.first_name && <FieldError errors={[errors.first_name]} />}
                </Field>
                <Field>
                  <FieldLabel htmlFor="gv-last-name">
                    {t.last_name_label ?? "Last Name"} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="last_name"
                    render={({ field }) => <Input id="gv-last-name" placeholder={t.last_name_placeholder ?? "Doe"} maxLength={50} {...field} />}
                  />
                  {errors.last_name && <FieldError errors={[errors.last_name]} />}
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="gv-email">
                  {t.email_label ?? "Email"} <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="email"
                  render={({ field }) => (
                    <Input id="gv-email" type="email" placeholder={t.email_placeholder ?? "official@example.com"} disabled={isEdit} maxLength={50} {...field} />
                  )}
                />
                {errors.email && <FieldError errors={[errors.email]} />}
              </Field>
              <Field>
                <FieldLabel htmlFor="gv-phone">
                  {t.phone_label ?? "Phone"} <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="phone"
                  render={({ field }) => (
                    <Input
                      id="gv-phone"
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
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="gv-designation">
                    {t.designation_label ?? "Designation"} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="designation"
                    render={({ field }) => <Input id="gv-designation" placeholder={t.designation_placeholder ?? "District Collector"} maxLength={200} {...field} />}
                  />
                  {errors.designation && <FieldError errors={[errors.designation]} />}
                </Field>
                <Field>
                  <FieldLabel htmlFor="gv-department">
                    {t.department_label ?? "Department"} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="department"
                    render={({ field }) => <Input id="gv-department" placeholder={t.department_placeholder ?? "Agriculture"} maxLength={200} {...field} />}
                  />
                  {errors.department && <FieldError errors={[errors.department]} />}
                </Field>
              </div>
            </FieldGroup>
            {!isEdit && (
              <div className="border-t pt-5">
                <p className="mb-4 font-medium text-muted-foreground text-sm">{t.section_account ?? "Account Setup"}</p>
                <Field>
                  <FieldLabel htmlFor="gv-notification-channel">
                    {t.notification_channel_label ?? "Send Credentials Via"} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="notification_channel"
                    render={({ field }) => (
                      <select
                        id="gv-notification-channel"
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
                    {t.notification_channel_hint ?? "A generated password will be sent to the official via this channel."}
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
                name="jurisdiction_type"
                render={({ field }) => (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={field.value === "district" ? "default" : "outline"}
                      size="sm"
                      onClick={() => field.onChange("district")}
                    >
                      {t.level_district ?? "District"}
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "state" ? "default" : "outline"}
                      size="sm"
                      onClick={() => field.onChange("state")}
                    >
                      {t.level_state ?? "State-wide"}
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "block" ? "default" : "outline"}
                      size="sm"
                      onClick={() => field.onChange("block")}
                    >
                      {t.level_block ?? "Block"}
                    </Button>
                  </div>
                )}
              />
            </Field>

            {jurisdictionType === "district" && (
              <Controller
                control={control}
                name="assigned_district"
                render={({ field }) => (
                  <FieldGroup className="gap-2">
                    <FieldLabel htmlFor="gv-district">{t.district_label ?? "District"}</FieldLabel>
                    <select
                      id="gv-district"
                      className="h-9 w-full rounded-md border bg-background px-3 text-foreground text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    >
                      <option value="">{t.district_placeholder ?? "Select a district"}</option>
                      {availableDistricts.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    {errors.assigned_district && <FieldError errors={[errors.assigned_district]} />}
                  </FieldGroup>
                )}
              />
            )}

            {jurisdictionType === "block" && (
              <Controller
                control={control}
                name="assigned_block"
                render={({ field }) => (
                  <FieldGroup className="gap-2">
                    <FieldLabel htmlFor="gv-block">{t.block_label ?? "Block/Taluk"}</FieldLabel>
                    <select
                      id="gv-block"
                      className="h-9 w-full rounded-md border bg-background px-3 text-foreground text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    >
                      <option value="">{t.block_placeholder ?? "Select a block"}</option>
                      {availableBlocks.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    {errors.assigned_block && <FieldError errors={[errors.assigned_block]} />}
                  </FieldGroup>
                )}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/government")}>
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
