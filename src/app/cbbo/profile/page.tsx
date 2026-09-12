"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

function makeProfileSchema(t: T) {
  return z.object({
    first_name: z.string().min(1, { message: t.val_first_name_required ?? "First name is required." }),
    last_name: z.string().min(1, { message: t.val_last_name_required ?? "Last name is required." }),
    phone: z.string().optional(),
    preferred_language: z.string().optional(),
  });
}
type ProfileValues = { first_name: string; last_name: string; phone?: string; preferred_language?: string };

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-sm">
      {initials}
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium text-sm">{label}</span>
        {description && <span className="text-muted-foreground text-xs">{description}</span>}
      </div>
      <div className="w-full sm:w-64 sm:shrink-0">{children}</div>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return <h2 className="pt-2 pb-1 font-semibold text-base">{title}</h2>;
}

export default function SettingsProfilePage() {
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  const [editing, setEditing] = useState(false);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "fpo_settings,common")
      .then((data) => {
        setT({ ...(data.common ?? {}), ...(data.fpo_settings ?? {}) });
      })
      .catch(() => undefined);
  }, [locale]);

  const LANGUAGES = [
    { value: "en", label: t.lang_english ?? "English" },
    { value: "ml", label: t.lang_malayalam ?? "Malayalam" },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ["auth-me", locale],
    queryFn: authApi.me,
    staleTime: 5 * 60 * 1000,
  });

  const user = data?.user;
  const fullName = user ? `${user.first_name} ${user.last_name ?? ""}`.trim() : "";

  const form = useForm<ProfileValues>({
    resolver: zodResolver(makeProfileSchema(t)),
    defaultValues: { first_name: "", last_name: "", phone: "", preferred_language: "en" },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        first_name: user.first_name ?? "",
        last_name: user.last_name ?? "",
        phone: user.phone ?? "",
        preferred_language: user.preferred_language ?? "en",
      });
    }
  }, [user, form]);

  const mutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
      toast.success(t.toast_updated ?? "Profile updated successfully.");
      setEditing(false);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : (t.toast_failed ?? "Failed to update profile."));
    },
  });

  const onSubmit = (values: ProfileValues) => {
    const payload: Partial<ProfileValues> = {};
    if (values.first_name !== (user?.first_name ?? "")) payload.first_name = values.first_name;
    if (values.last_name !== (user?.last_name ?? "")) payload.last_name = values.last_name;
    if (values.phone !== (user?.phone ?? "")) payload.phone = values.phone;
    if (values.preferred_language !== (user?.preferred_language ?? "en"))
      payload.preferred_language = values.preferred_language;

    if (Object.keys(payload).length === 0) {
      toast.info(t.toast_no_changes ?? "No changes to save.");
      setEditing(false);
      return;
    }
    mutation.mutate(payload);
  };

  const handleCancel = () => {
    form.reset({
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      phone: user?.phone ?? "",
      preferred_language: user?.preferred_language ?? "en",
    });
    setEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <SectionHeading title={t.section_profile ?? "Profile"} />
        {!editing ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            {t.btn_edit ?? "Edit"}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={handleCancel}>
              {t.btn_cancel ?? "Cancel"}
            </Button>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? (t.btn_saving ?? "Saving...") : (t.btn_save ?? "Save")}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col">
        <SettingRow label={t.label_avatar ?? "Avatar"}>
          {fullName ? <UserAvatar name={fullName} /> : <span className="text-muted-foreground text-sm">—</span>}
        </SettingRow>

        <Controller
          control={form.control}
          name="first_name"
          render={({ field, fieldState }) => (
            <SettingRow label={t.label_first_name ?? "First Name"}>
              {editing ? (
                <div className="flex flex-col gap-1">
                  <Input {...field} id="first-name" placeholder={t.label_first_name ?? "First name"} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">{user?.first_name || "—"}</span>
              )}
            </SettingRow>
          )}
        />

        <Controller
          control={form.control}
          name="last_name"
          render={({ field, fieldState }) => (
            <SettingRow label={t.label_last_name ?? "Last Name"}>
              {editing ? (
                <div className="flex flex-col gap-1">
                  <Input {...field} id="last-name" placeholder={t.label_last_name ?? "Last name"} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">{user?.last_name || "—"}</span>
              )}
            </SettingRow>
          )}
        />

        <Controller
          control={form.control}
          name="phone"
          render={({ field, fieldState }) => (
            <SettingRow label={t.label_phone ?? "Phone"} description={t.label_phone_desc ?? "Used for SMS notifications and account recovery."}>
              {editing ? (
                <div className="flex flex-col gap-1">
                  <Input
                    {...field}
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">{user?.phone || "—"}</span>
              )}
            </SettingRow>
          )}
        />

        <Controller
          control={form.control}
          name="preferred_language"
          render={({ field, fieldState }) => (
            <SettingRow label={t.label_language ?? "Preferred Language"} description={t.label_language_desc ?? "Language used for notifications and emails."}>
              {editing ? (
                <select
                  {...field}
                  id="preferred-language"
                  className="h-9 w-full rounded-md border bg-background px-3 text-foreground text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-muted-foreground text-sm">
                  {LANGUAGES.find((l) => l.value === (user?.preferred_language ?? "en"))?.label ?? "English"}
                </span>
              )}
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </SettingRow>
          )}
        />
      </div>

      <SectionHeading title={t.section_account ?? "Account"} />

      <div className="flex flex-col">
        <SettingRow label={t.label_email ?? "Email Address"} description={t.label_email_desc ?? "Your email cannot be changed."}>
          <span className="text-muted-foreground text-sm">{user?.email}</span>
        </SettingRow>

        <SettingRow label={t.label_role ?? "Role"}>
          <span className="inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-xs capitalize">
            {user?.role?.replace(/_/g, " ") || "—"}
          </span>
        </SettingRow>
      </div>
    </form>
  );
}
