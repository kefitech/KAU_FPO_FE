"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { channelSettingsApi } from "@/app/admin/_api/notification-channel-settings";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { ChannelSetting, EmailConfig, SmsConfig, WhatsAppConfig } from "@/types";

type T = Record<string, string>;

const schema = z.object({
  channel: z.enum(["email", "sms", "in_app", "whatsapp"] as const, { message: "Please select a channel" }),
  is_active: z.boolean(),
  // email fields
  email_host: z.string().optional(),
  email_port: z.number().optional(),
  email_username: z.string().optional(),
  email_password: z.string().optional(),
  email_from_email: z.string().optional(),
  email_from_name: z.string().optional(),
  email_use_tls: z.boolean().optional(),
  // sms fields
  sms_api_key: z.string().optional(),
  sms_sender_id: z.string().optional(),
  sms_base_url: z.string().optional(),
  sms_otp_template_id: z.string().optional(),
  // whatsapp fields
  wa_phone_number_id: z.string().optional(),
  wa_access_token: z.string().optional(),
  wa_api_version: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ChannelSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  editing?: ChannelSetting | null;
  t: T;
  tCommon: T;
}

const defaultValues: FormValues = {
  channel: "email",
  is_active: true,
  email_host: "",
  email_port: 587,
  email_username: "",
  email_password: "",
  email_from_email: "",
  email_from_name: "",
  email_use_tls: true,
  sms_api_key: "",
  sms_sender_id: "",
  sms_base_url: "",
  sms_otp_template_id: "",
  wa_phone_number_id: "",
  wa_access_token: "",
  wa_api_version: "v20.0",
};

function parseEditingValues(item: ChannelSetting): FormValues {
  const base: FormValues = { ...defaultValues, channel: item.channel, is_active: item.is_active };

  try {
    const config = typeof item.config === "string" ? JSON.parse(item.config) : item.config;
    if (item.channel === "email") {
      const c = config as Partial<EmailConfig>;
      base.email_host = c.host ?? "";
      base.email_port = c.port ?? 587;
      base.email_username = c.username ?? "";
      // password intentionally not pre-filled — API returns ••••••••
      base.email_password = "";
      base.email_from_email = c.from_email ?? "";
      base.email_from_name = c.from_name ?? "";
      base.email_use_tls = c.use_tls ?? true;
    } else if (item.channel === "sms") {
      const c = config as Partial<SmsConfig>;
      // api_key intentionally not pre-filled
      base.sms_api_key = "";
      base.sms_sender_id = c.sender_id ?? "";
      base.sms_base_url = c.base_url ?? "";
      base.sms_otp_template_id = c.otp_template_id ?? "";
    } else if (item.channel === "whatsapp") {
      const c = config as Partial<WhatsAppConfig>;
      base.wa_phone_number_id = c.phone_number_id ?? "";
      base.wa_access_token = "";
      base.wa_api_version = c.api_version ?? "v20.0";
    }
  } catch {
    // config parse failed — leave defaults
  }

  return base;
}

function buildConfig(values: FormValues): Record<string, unknown> {
  if (values.channel === "email") {
    const config: Partial<EmailConfig> = {
      host: values.email_host,
      port: values.email_port,
      username: values.email_username,
      from_email: values.email_from_email,
      from_name: values.email_from_name,
      use_tls: values.email_use_tls,
    };
    if (values.email_password) config.password = values.email_password;
    return config as Record<string, unknown>;
  }
  if (values.channel === "sms") {
    const config: Partial<SmsConfig> = {
      sender_id: values.sms_sender_id,
      base_url: values.sms_base_url,
      otp_template_id: values.sms_otp_template_id,
    };
    if (values.sms_api_key) config.api_key = values.sms_api_key;
    return config as Record<string, unknown>;
  }
  if (values.channel === "whatsapp") {
    const config: Partial<WhatsAppConfig> = {
      phone_number_id: values.wa_phone_number_id,
      api_version: values.wa_api_version,
    };
    if (values.wa_access_token) config.access_token = values.wa_access_token;
    return config as Record<string, unknown>;
  }
  return {};
}

export function ChannelSettingsDialog({ open, onClose, editing, t, tCommon }: ChannelSettingsDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!editing;
  const editingValues = editing ? parseEditingValues(editing) : null;

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

  const channel = useWatch({ control, name: "channel" });

  useEffect(() => {
    if (open) reset(editingValues ?? defaultValues);
  }, [open, reset, editingValues]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        channel: values.channel,
        is_active: values.is_active,
        config: buildConfig(values),
      };
      return isEdit ? channelSettingsApi.update(editing!.id, payload) : channelSettingsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(
        isEdit
          ? (t.toast_update_success ?? "Channel setting updated successfully")
          : (t.toast_create_success ?? "Channel setting created successfully"),
      );
      queryClient.invalidateQueries({ queryKey: ["channel-settings"] });
      onClose();
    },
    onError: () =>
      toast.error(
        isEdit
          ? (t.toast_update_failed ?? "Failed to update channel setting")
          : (t.toast_create_failed ?? "Failed to create channel setting"),
      ),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? (t.edit_title ?? "Edit Channel Setting") : (t.add_title ?? "Add Channel Setting")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="cs-channel">
                {t.channel_label ?? "Channel"} <span className="text-destructive">*</span>
              </FieldLabel>
              <select
                id="cs-channel"
                {...register("channel")}
                disabled={isEdit}
                className="h-9 w-full rounded-md border bg-background px-3 text-foreground text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
              >
                <option value="email">{t.channel_email ?? "Email"}</option>
                <option value="sms">{t.channel_sms ?? "SMS"}</option>
                <option value="in_app">{t.channel_in_app ?? "In-App"}</option>
                <option value="whatsapp">{t.channel_whatsapp ?? "WhatsApp"}</option>
              </select>
              {errors.channel && <FieldError errors={[errors.channel]} />}
            </Field>

            {channel === "email" && (
              <>
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  {t.section_config ?? "Configuration"}
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="cs-host">
                      {t.host_label ?? "SMTP Host"} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="cs-host"
                      placeholder={t.host_placeholder ?? "e.g. smtp.gmail.com"}
                      {...register("email_host")}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="cs-port">
                      {t.port_label ?? "Port"} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="cs-port"
                      type="number"
                      placeholder={t.port_placeholder ?? "587"}
                      {...register("email_port", { valueAsNumber: true })}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="cs-username">
                      {t.username_label ?? "Username"} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="cs-username"
                      placeholder={t.username_placeholder ?? "e.g. noreply@kau.in"}
                      {...register("email_username")}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="cs-password">
                      {t.password_label ?? "Password"} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="cs-password"
                      type="password"
                      placeholder={isEdit ? (t.password_placeholder ?? "Enter new password to update") : ""}
                      {...register("email_password")}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="cs-from-email">
                      {t.from_email_label ?? "From Email"} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="cs-from-email"
                      placeholder={t.from_email_placeholder ?? "e.g. noreply@kau.in"}
                      {...register("email_from_email")}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="cs-from-name">
                      {t.from_name_label ?? "From Name"} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="cs-from-name"
                      placeholder={t.from_name_placeholder ?? "e.g. KAU-FPO Platform"}
                      {...register("email_from_name")}
                    />
                  </Field>
                </div>

                <Controller
                  control={control}
                  name="email_use_tls"
                  render={({ field }) => (
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FieldLabel className="mb-0">{t.use_tls_label ?? "Use TLS"}</FieldLabel>
                        <p className="text-muted-foreground text-xs">STARTTLS on port 587</p>
                      </div>
                      <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />
              </>
            )}

            {channel === "sms" && (
              <>
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  {t.section_config ?? "Configuration"}
                </p>

                <Field>
                  <FieldLabel htmlFor="cs-api-key">
                    {t.api_key_label ?? "API Key"} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="cs-api-key"
                    type="password"
                    placeholder={isEdit ? (t.api_key_placeholder ?? "Enter new API key to update") : ""}
                    {...register("sms_api_key")}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="cs-sender-id">
                      {t.sender_id_label ?? "Sender ID"} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="cs-sender-id"
                      placeholder={t.sender_id_placeholder ?? "e.g. KAUFPO"}
                      maxLength={6}
                      {...register("sms_sender_id")}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="cs-base-url">
                      {t.base_url_label ?? "Base URL"} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="cs-base-url"
                      placeholder={t.base_url_placeholder ?? "https://api.msg91.com/api/v5/"}
                      {...register("sms_base_url")}
                    />
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="cs-otp-template-id">
                    {t.otp_template_id_label ?? "OTP Template ID"} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="cs-otp-template-id"
                    placeholder={t.otp_template_id_placeholder ?? "e.g. 6a01b545134776d8b5098002"}
                    {...register("sms_otp_template_id")}
                  />
                </Field>
              </>
            )}

            {channel === "in_app" && (
              <p className="rounded-lg border border-dashed p-4 text-muted-foreground text-sm">
                {t.in_app_note ?? "In-app notifications write directly to the database. No configuration required."}
              </p>
            )}

            {channel === "whatsapp" && (
              <>
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  {t.section_config ?? "Configuration"}
                </p>

                <Field>
                  <FieldLabel htmlFor="cs-wa-phone-id">
                    Phone Number ID <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="cs-wa-phone-id"
                    placeholder="e.g. 123456789012345"
                    {...register("wa_phone_number_id")}
                  />
                  <p className="text-xs text-muted-foreground">From Meta WhatsApp Business Manager → Phone Numbers.</p>
                </Field>

                <Field>
                  <FieldLabel htmlFor="cs-wa-token">
                    Access Token <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="cs-wa-token"
                    type="password"
                    placeholder={isEdit ? "Enter new access token to update" : ""}
                    {...register("wa_access_token")}
                  />
                  <p className="text-xs text-muted-foreground">Permanent token from Meta Business Manager → System Users.</p>
                </Field>

                <Field>
                  <FieldLabel htmlFor="cs-wa-version">API Version</FieldLabel>
                  <Input
                    id="cs-wa-version"
                    placeholder="e.g. v20.0"
                    {...register("wa_api_version")}
                  />
                  <p className="text-xs text-muted-foreground">Meta Graph API version (defaults to v20.0).</p>
                </Field>
              </>
            )}

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
