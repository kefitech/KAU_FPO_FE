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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { NotificationChannelType, SubAdmin, SubAdminUpdatePayload } from "@/types/admin";

type T = Record<string, string>;

const NOTIFICATION_CHANNELS: { value: NotificationChannelType; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "in_app", label: "In-App" },
];

const createSchema = z.object({
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
  permissions: z.array(z.string()),
});

const editSchema = z.object({
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
  permissions: z.array(z.string()),
});

type FormValues = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  notification_channel: NotificationChannelType;
  permissions: string[];
};

interface SubAdminFormProps {
  mode: "create" | "edit";
  subAdmin?: SubAdmin;
  t?: T;
  tCommon?: T;
}

const defaultValues: FormValues = {
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  notification_channel: "email",
  permissions: [],
};

function toFormValues(item: SubAdmin): FormValues {
  return {
    email: item.email ?? "",
    first_name: item.first_name ?? "",
    last_name: item.last_name ?? "",
    phone: item.phone ?? "",
    notification_channel: "email",
    permissions: item.permissions ?? [],
  };
}

export function SubAdminForm({ mode, subAdmin, t = {}, tCommon = {} }: SubAdminFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit";
  const editingValues = subAdmin ? toFormValues(subAdmin) : null;

  const schema = isEdit ? editSchema : createSchema;

  const {
    control,
    handleSubmit,
    reset,
    setFocus,
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
        router.push("/admin/sub-admins");
      }
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? (isEdit ? "Failed to update sub-admin" : "Failed to create sub-admin"));
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
                      placeholder={t.phone_placeholder ?? "+91 98765 43210"}
                      maxLength={15}
                      {...field}
                      onChange={(e) => {
                        const val = e.target.value.replace(/(?!^\+)[^0-9]/g, "");
                        field.onChange(val);
                      }}
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
                            {ch.label}
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
            {mutation.isPending ? "Saving..." : (tCommon.save_btn ?? "Save")}
          </Button>
        </div>
      </div>
    </form>
  );
}
