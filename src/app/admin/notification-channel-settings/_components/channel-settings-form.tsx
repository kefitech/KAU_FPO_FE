"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { channelSettingsApi } from "@/app/admin/_api/notification-channel-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/get-error-message";
import type { ChannelSetting, EmailConfig, WhatsAppConfig } from "@/types";

type T = Record<string, string>;

const schema = z.object({
  channel: z.enum(["email", "sms", "in_app", "whatsapp"] as const, { message: "Please select a channel" }),
  is_active: z.boolean(),
  email_host: z.string().optional(),
  email_port: z.number().optional(),
  email_username: z.string().optional(),
  email_password: z.string().optional(),
  email_from_email: z.string().optional(),
  email_from_name: z.string().optional(),
  email_use_tls: z.boolean().optional(),
  sms_url: z.string().optional(),
  sms_application: z.string().optional(),
  sms_token: z.string().optional(),
  wa_phone_number_id: z.string().optional(),
  wa_access_token: z.string().optional(),
  wa_api_version: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ChannelSettingsFormProps {
  mode: "create" | "edit";
  channelSetting?: ChannelSetting;
  t?: T;
  tCommon?: T;
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
  sms_url: "",
  sms_application: "",
  sms_token: "",
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
      base.email_password = "";
      base.email_from_email = c.from_email ?? "";
      base.email_from_name = c.from_name ?? "";
      base.email_use_tls = c.use_tls ?? true;
    } else if (item.channel === "sms") {
      const c = config as Record<string, string>;
      base.sms_url = c.url ?? "";
      base.sms_application = c.application ?? "";
      base.sms_token = "";
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
    const config: Record<string, unknown> = {
      url: values.sms_url,
      application: values.sms_application,
    };
    if (values.sms_token) config.token = values.sms_token;
    return config;
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

export function ChannelSettingsForm({ mode, channelSetting, t = {}, tCommon = {} }: ChannelSettingsFormProps) {
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
    defaultValues: channelSetting ? parseEditingValues(channelSetting) : defaultValues,
  });

  useEffect(() => {
    if (channelSetting) reset(parseEditingValues(channelSetting));
  }, [channelSetting?.id, reset, channelSetting]);

  const channel = useWatch({ control, name: "channel" });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        channel: values.channel,
        is_active: values.is_active,
        config: buildConfig(values),
      };
      return isEdit ? channelSettingsApi.update(channelSetting!.id, payload) : channelSettingsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Channel setting updated successfully" : "Channel setting created successfully");
      queryClient.invalidateQueries({ queryKey: ["channel-settings"] });
      if (!isEdit) router.push("/admin/notifications?tab=channels");
    },
    onError: (error) => {
      const fallback = isEdit ? "Failed to update channel setting" : "Failed to create channel setting";
      toast.error(getErrorMessage(error, fallback));
    },
  });

  return (
    <div className="mx-auto w-full max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.section_details ?? "Channel Settings"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-6">
            <FieldGroup>
              <Controller
                control={control}
                name="channel"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="cs-channel">
                      {t.channel_label ?? "Channel"} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <select
                      id="cs-channel"
                      value={field.value}
                      onChange={field.onChange}
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
                )}
              />

              {channel === "email" && (
                <>
                  <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    {t.section_config ?? "Configuration"}
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      control={control}
                      name="email_host"
                      render={({ field }) => (
                        <Field>
                          <FieldLabel htmlFor="cs-host">
                            {t.host_label ?? "SMTP Host"} <span className="text-destructive">*</span>
                          </FieldLabel>
                          <Input id="cs-host" placeholder={t.host_placeholder ?? "e.g. smtp.gmail.com"} {...field} />
                        </Field>
                      )}
                    />
                    <Controller
                      control={control}
                      name="email_port"
                      render={({ field }) => (
                        <Field>
                          <FieldLabel htmlFor="cs-port">
                            {t.port_label ?? "Port"} <span className="text-destructive">*</span>
                          </FieldLabel>
                          <Input
                            id="cs-port"
                            type="number"
                            placeholder={t.port_placeholder ?? "587"}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </Field>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      control={control}
                      name="email_username"
                      render={({ field }) => (
                        <Field>
                          <FieldLabel htmlFor="cs-username">
                            {t.username_label ?? "Username"} <span className="text-destructive">*</span>
                          </FieldLabel>
                          <Input
                            id="cs-username"
                            placeholder={t.username_placeholder ?? "e.g. noreply@kau.in"}
                            {...field}
                          />
                        </Field>
                      )}
                    />
                    <Controller
                      control={control}
                      name="email_password"
                      render={({ field }) => (
                        <Field>
                          <FieldLabel htmlFor="cs-password">
                            {t.password_label ?? "Password"} <span className="text-destructive">*</span>
                          </FieldLabel>
                          <Input
                            id="cs-password"
                            type="password"
                            placeholder={isEdit ? (t.password_placeholder ?? "Enter new password to update") : ""}
                            {...field}
                          />
                        </Field>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      control={control}
                      name="email_from_email"
                      render={({ field }) => (
                        <Field>
                          <FieldLabel htmlFor="cs-from-email">
                            {t.from_email_label ?? "From Email"} <span className="text-destructive">*</span>
                          </FieldLabel>
                          <Input
                            id="cs-from-email"
                            placeholder={t.from_email_placeholder ?? "e.g. noreply@kau.in"}
                            {...field}
                          />
                        </Field>
                      )}
                    />
                    <Controller
                      control={control}
                      name="email_from_name"
                      render={({ field }) => (
                        <Field>
                          <FieldLabel htmlFor="cs-from-name">
                            {t.from_name_label ?? "From Name"} <span className="text-destructive">*</span>
                          </FieldLabel>
                          <Input
                            id="cs-from-name"
                            placeholder={t.from_name_placeholder ?? "e.g. KAU-FPO Platform"}
                            {...field}
                          />
                        </Field>
                      )}
                    />
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

                  <Controller
                    control={control}
                    name="sms_url"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor="cs-sms-url">
                          Service URL <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                          id="cs-sms-url"
                          placeholder="e.g. http://finance.kau.in/services/Utility.asmx"
                          {...field}
                        />
                        <p className="text-xs text-muted-foreground">KAU SOAP gateway endpoint.</p>
                      </Field>
                    )}
                  />

                  <Controller
                    control={control}
                    name="sms_application"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor="cs-sms-application">
                          Application <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                          id="cs-sms-application"
                          placeholder="e.g. KAUINF"
                          {...field}
                        />
                        <p className="text-xs text-muted-foreground">Application identifier (DLT sender ID).</p>
                      </Field>
                    )}
                  />

                  <Controller
                    control={control}
                    name="sms_token"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor="cs-sms-token">
                          Token <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                          id="cs-sms-token"
                          type="password"
                          placeholder={isEdit ? "Enter new token to update" : ""}
                          {...field}
                        />
                        <p className="text-xs text-muted-foreground">Auth token provided by KAU gateway.</p>
                      </Field>
                    )}
                  />
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

                  <Controller
                    control={control}
                    name="wa_phone_number_id"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor="cs-wa-phone-id">
                          Phone Number ID <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                          id="cs-wa-phone-id"
                          placeholder="e.g. 123456789012345"
                          {...field}
                        />
                        <p className="text-xs text-muted-foreground">From Meta WhatsApp Business Manager → Phone Numbers.</p>
                      </Field>
                    )}
                  />

                  <Controller
                    control={control}
                    name="wa_access_token"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor="cs-wa-token">
                          Access Token <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                          id="cs-wa-token"
                          type="password"
                          placeholder={isEdit ? "Enter new access token to update" : ""}
                          {...field}
                        />
                        <p className="text-xs text-muted-foreground">Permanent token from Meta Business Manager → System Users.</p>
                      </Field>
                    )}
                  />

                  <Controller
                    control={control}
                    name="wa_api_version"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor="cs-wa-version">API Version</FieldLabel>
                        <Input
                          id="cs-wa-version"
                          placeholder="e.g. v20.0"
                          {...field}
                        />
                        <p className="text-xs text-muted-foreground">Meta Graph API version (defaults to v20.0).</p>
                      </Field>
                    )}
                  />
                </>
              )}
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
              <Button type="button" variant="outline" onClick={() => router.push("/admin/notifications?tab=channels")}>
                {tCommon.cancel_btn ?? "Cancel"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => reset(channelSetting ? parseEditingValues(channelSetting) : defaultValues)}
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
