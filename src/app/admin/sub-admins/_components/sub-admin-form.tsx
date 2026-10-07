"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { subAdminsApi } from "@/app/admin/_api/sub-admins";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { KERALA_DISTRICTS } from "@/lib/kerala-districts";
import type { NotificationChannelType, SubAdmin, SubAdminUpdatePayload } from "@/types/admin";

import { TransferDistrictForm } from "./transfer-district-dialog";

type T = Record<string, string>;

const NOTIFICATION_CHANNELS: { value: NotificationChannelType; labelKey: string; label: string }[] = [
  { value: "email", labelKey: "channel_email", label: "Email" },
  { value: "sms", labelKey: "channel_sms", label: "SMS" },
  // { value: "in_app", labelKey: "channel_in_app", label: "In-App" },
];

const DISTRICT_CODES = KERALA_DISTRICTS.map((d) => d.code) as [string, ...string[]];

// Mirrors the backend's validate_person_name: letters, spaces, dots, apostrophes, hyphens.
const NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]*$/;

const nameSchema = (requiredMsg: string, patternMsg: string, maxMsg: string) =>
  z
    .string()
    .trim()
    .min(1, { message: requiredMsg })
    .max(50, { message: maxMsg })
    .regex(NAME_PATTERN, { message: patternMsg });

function makeSchemas(t: T) {
  const maxMsg = t.val_max_50 ?? "Max 50 characters";
  const firstName = nameSchema(
    t.val_first_name_required ?? "First name is required",
    t.val_first_name_pattern ?? "First name can only contain letters, spaces, dots, apostrophes and hyphens",
    maxMsg,
  );
  const lastName = nameSchema(
    t.val_last_name_required ?? "Last name is required",
    t.val_last_name_pattern ?? "Last name can only contain letters, spaces, dots, apostrophes and hyphens",
    maxMsg,
  );
  const phone = z
    .string()
    .regex(/^[6-9]\d{9}$/, { message: t.val_phone_invalid ?? "Enter a valid 10-digit mobile number" });

  return {
    create: z.object({
      email: z
        .string()
        .email({ message: t.val_email_invalid ?? "Enter a valid email address" })
        .max(50, { message: t.val_email_max ?? "Email must be at most 50 characters" }),
      first_name: firstName,
      last_name: lastName,
      phone,
      district: z.enum(DISTRICT_CODES, { message: t.val_district_required ?? "Pick a district" }),
      notification_channel: z.enum(["email", "sms", "in_app"]),
      permissions: z.array(z.string()),
    }),
    edit: z.object({
      // Email is read-only on edit and not part of the update payload, so don't validate it.
      email: z.string(),
      first_name: firstName,
      last_name: lastName,
      phone,
      permissions: z.array(z.string()),
    }),
  };
}

type FormValues = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  district: string;
  notification_channel: NotificationChannelType;
  permissions: string[];
};

interface SubAdminFormProps {
  mode: "create" | "edit";
  subAdmin?: SubAdmin;
  t?: T;
  tCommon?: T;
  /** sub_admins_table keys — the transfer form shares them with the list page's dialog. */
  tTransfer?: T;
}

const defaultValues: FormValues = {
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  district: "",
  notification_channel: "email",
  permissions: [],
};

function toFormValues(item: SubAdmin): FormValues {
  return {
    email: item.email ?? "",
    first_name: item.first_name ?? "",
    last_name: item.last_name ?? "",
    phone: item.phone ?? "",
    district: item.district ?? "",
    notification_channel: "email",
    permissions: item.permissions ?? [],
  };
}

export function SubAdminForm({ mode, subAdmin, t = {}, tCommon = {}, tTransfer = {} }: SubAdminFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit";
  const editingValues = subAdmin ? toFormValues(subAdmin) : null;

  const schemas = makeSchemas(t);
  const schema = isEdit ? schemas.edit : schemas.create;

  const {
    control,
    handleSubmit,
    reset,
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
  const { data: availablePermsData } = useQuery({
    queryKey: ["available-permissions"],
    queryFn: () => subAdminsApi.getAvailablePermissions({ page: 1, page_size: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const availablePerms = availablePermsData?.data ?? [];

  const { data: capStatus } = useQuery({
    queryKey: ["sub-admin-district-cap-status"],
    queryFn: subAdminsApi.getDistrictCapStatus,
    staleTime: 60_000,
    enabled: !isEdit,
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isEdit && subAdmin) {
        const basicPayload: SubAdminUpdatePayload = {
          first_name: values.first_name,
          last_name: values.last_name,
        };
        if (values.phone) basicPayload.phone = values.phone;
        await subAdminsApi.update(subAdmin.id, basicPayload);
        await subAdminsApi.setPermissions(subAdmin.id, "replace", values.permissions);
      } else {
        await subAdminsApi.create({
          email: values.email,
          first_name: values.first_name,
          last_name: values.last_name,
          phone: values.phone,
          district: values.district,
          notification_channel: values.notification_channel,
          permissions: values.permissions,
        });
      }
    },
    onSuccess: () => {
      toast.success(
        isEdit
          ? (t.toast_updated ?? "Sub-admin updated successfully")
          : (t.toast_created ?? "Sub-admin created successfully"),
      );
      queryClient.invalidateQueries({ queryKey: ["sub-admins"] });
      if (isEdit && subAdmin) {
        queryClient.invalidateQueries({ queryKey: ["sub-admin", String(subAdmin.id)] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["sub-admin-district-cap-status"] });
        router.push("/admin/sub-admins");
      }
    },
    onError: (error: unknown) => {
      const response = (error as { data?: { message?: unknown; errors?: Record<string, string[]> } })?.data;

      const fieldErrors = response?.errors;

      if (fieldErrors) {
        // Map API field names to form field names if they ever differ
        Object.entries(fieldErrors).forEach(([field, messages]) => {
          if (field in defaultValues) {
            setError(field as keyof FormValues, {
              type: "server",
              message: messages[0],
            });
          }
        });

        // Focus the first field that has an error
        const firstField = Object.keys(fieldErrors)[0];
        if (firstField && firstField in defaultValues) {
          setFocus(firstField as keyof FormValues);
        }
      } else {
        // Only a string can be rendered in a toast — anything else would crash the page.
        toast.error(
          typeof response?.message === "string"
            ? response.message
            : isEdit
              ? (t.toast_update_failed ?? "Failed to update sub-admin")
              : (t.toast_create_failed ?? "Failed to create sub-admin"),
        );
      }
    },
  });

  return (
    <form
      onSubmit={handleSubmit(
        (v) => mutation.mutate(v),
        (formErrors) => {
          const firstError = Object.keys(formErrors)[0];
          if (firstError) {
            const el = document.getElementById(
              firstError === "first_name"
                ? "sa-first-name"
                : firstError === "last_name"
                  ? "sa-last-name"
                  : firstError === "email"
                    ? "sa-email"
                    : firstError === "phone"
                      ? "sa-phone"
                      : "",
            );
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.focus();
            }
          }
        },
      )}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.section_basic ?? "Basic Information"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <FieldGroup className="gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="sa-first-name">
                    {t.first_name_label ?? "First Name"} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="first_name"
                    render={({ field }) => (
                      <Input
                        id="sa-first-name"
                        placeholder={t.first_name_placeholder ?? "John"}
                        maxLength={50}
                        {...field}
                      />
                    )}
                  />
                  {errors.first_name && <FieldError errors={[errors.first_name]} />}
                </Field>

                <Field>
                  <FieldLabel htmlFor="sa-last-name">
                    {t.last_name_label ?? "Last Name"} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="last_name"
                    render={({ field }) => (
                      <Input
                        id="sa-last-name"
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
                <FieldLabel htmlFor="sa-email">
                  {t.email_label ?? "Email"} <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="email"
                  render={({ field }) => (
                    <Input
                      id="sa-email"
                      type="email"
                      placeholder={t.email_placeholder ?? "admin@example.com"}
                      disabled={isEdit}
                      maxLength={50}
                      {...field}
                    />
                  )}
                />
                {errors.email && <FieldError errors={[errors.email]} />}
              </Field>

              <Field>
                <FieldLabel htmlFor="sa-phone">
                  {t.phone_label ?? "Phone"} <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="phone"
                  render={({ field }) => (
                    <Input
                      id="sa-phone"
                      type="tel"
                      placeholder={t.phone_placeholder ?? "98765 43210"}
                      maxLength={10}
                      {...field}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
                        field.onChange(val);
                      }}
                    />
                  )}
                />
                {errors.phone && <FieldError errors={[errors.phone]} />}
              </Field>

              {!isEdit && (
                <Field>
                  <FieldLabel htmlFor="sa-district">
                    {t.district_label ?? "District"} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="district"
                    render={({ field }) => (
                      <select
                        id="sa-district"
                        className="h-9 w-full rounded-md border bg-background px-3 text-foreground text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        {...field}
                      >
                        <option value="">{t.district_placeholder ?? "Select a district"}</option>
                        {KERALA_DISTRICTS.map((d) => {
                          const cap = capStatus?.[d.code];
                          const isFull = !!cap && cap.count >= cap.cap;
                          return (
                            <option key={d.code} value={d.code} disabled={isFull}>
                              {isFull
                                ? `${d.name} (${t.district_full ?? "limit reached"}: ${cap.count}/${cap.cap})`
                                : d.name}
                            </option>
                          );
                        })}
                      </select>
                    )}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t.district_hint ??
                      "The sub-admin will see every FPO in this district. Transfer them later from the detail page."}
                  </p>
                  {errors.district && <FieldError errors={[errors.district]} />}
                </Field>
              )}
            </FieldGroup>

            {!isEdit && (
              <div className="border-t pt-5">
                <p className="mb-4 font-medium text-muted-foreground text-sm">{t.section_account ?? "Account Setup"}</p>
                <Field>
                  <FieldLabel htmlFor="sa-notification-channel">
                    {t.notification_channel_label ?? "Send Credentials Via"} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="notification_channel"
                    render={({ field }) => (
                      <select
                        id="sa-notification-channel"
                        className="h-9 w-full rounded-md border bg-background px-3 text-foreground text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        {...field}
                      >
                        {NOTIFICATION_CHANNELS.map((ch) => (
                          <option key={ch.value} value={ch.value}>
                            {t[ch.labelKey] ?? ch.label}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t.notification_channel_hint ??
                      "A generated password will be sent to the sub-admin via this channel."}
                  </p>
                </Field>
              </div>
            )}
          </CardContent>
        </Card>

        {isEdit && subAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{tTransfer.transfer_title ?? "Transfer District"}</CardTitle>
              <CardDescription>
                {tTransfer.transfer_description ??
                  "Move this sub-admin to a different district. The change is audit-logged and the destination cap is checked before the move."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransferDistrictForm subAdmin={subAdmin} t={tTransfer} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.section_permissions ?? "Permissions"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              control={control}
              name="permissions"
              render={({ field }) => {
                const selected: string[] = field.value;
                return (
                  <FieldGroup className="gap-3">
                    {selected.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selected.map((p) => (
                          <Badge
                            key={p}
                            variant="secondary"
                            className="cursor-pointer font-mono text-[10px]"
                            onClick={() => field.onChange(selected.filter((s) => s !== p))}
                          >
                            {p} ×
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto rounded-md border bg-background px-2 py-1">
                      {availablePerms.length === 0 && (
                        <span className="px-1 py-2 text-muted-foreground text-xs">
                          {t.permissions_loading ?? "Loading permissions..."}
                        </span>
                      )}
                      {availablePerms.map((perm) => {
                        const checked = selected.includes(perm.codename);
                        return (
                          <label
                            key={perm.codename}
                            className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 hover:bg-muted"
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5 h-4 w-4 shrink-0 rounded border accent-primary"
                              checked={checked}
                              onChange={() =>
                                field.onChange(
                                  checked ? selected.filter((s) => s !== perm.codename) : [...selected, perm.codename],
                                )
                              }
                            />
                            <div className="flex min-w-0 flex-col">
                              <span className="font-mono text-xs">{perm.codename}</span>
                              {perm.description && (
                                <span className="text-[11px] text-muted-foreground">{perm.description}</span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </FieldGroup>
                );
              }}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/sub-admins")}>
            {tCommon.cancel_btn ?? "Cancel"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => reset(editingValues ?? defaultValues)}>
            {tCommon.reset_btn ?? "Reset"}
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (tCommon.saving ?? "Saving...") : (tCommon.save_btn ?? "Save")}
          </Button>
        </div>
      </div>
    </form>
  );
}
