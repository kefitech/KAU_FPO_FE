"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { Controller, type ControllerFieldState, type ControllerRenderProps, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;
type PasswordValues = { current_password: string; new_password: string; confirm_password: string };
const passwordDefaults: PasswordValues = { current_password: "", new_password: "", confirm_password: "" };

function makePasswordSchema(t: T) {
  return z
    .object({
      current_password: z.string().min(1, { message: t.val_pwd_current_required ?? "Current password is required." }),
      new_password: z
        .string()
        .min(8, { message: t.val_pwd_min_8 ?? "Password must be at least 8 characters." })
        .regex(/[A-Z]/, { message: t.val_pwd_uppercase ?? "Password must contain at least one uppercase letter." })
        .regex(/[a-z]/, { message: t.val_pwd_lowercase ?? "Password must contain at least one lowercase letter." })
        .regex(/[0-9]/, { message: t.val_pwd_number ?? "Password must contain at least one number." })
        .regex(/[^A-Za-z0-9]/, { message: t.val_pwd_special ?? "Password must contain at least one special character." }),
      confirm_password: z.string().min(1, { message: t.val_pwd_confirm_required ?? "Please confirm your new password." }),
    })
    .refine((d) => d.new_password !== d.current_password, {
      message: t.val_pwd_same_as_current ?? "New password cannot be the same as your current password.",
      path: ["new_password"],
    })
    .refine((d) => d.new_password === d.confirm_password, {
      message: t.val_pwd_not_match ?? "Passwords do not match.",
      path: ["confirm_password"],
    });
}

function PasswordInput({
  id,
  field,
  fieldState,
  label,
}: {
  id: string;
  field: ControllerRenderProps<PasswordValues>;
  fieldState: ControllerFieldState;
  label: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <Field className="gap-1">
      <FieldLabel htmlFor={id} className="text-muted-foreground text-xs">
        {label}
      </FieldLabel>
      <div className="relative">
        <Input
          {...field}
          id={id}
          type={show ? "text" : "password"}
          placeholder="••••••••"
          autoComplete="off"
          aria-invalid={fieldState.invalid}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          tabIndex={-1}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  );
}

export default function ExpertSettingsPasswordPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "fpo_settings,common")
      .then((data) => {
        setT({ ...(data.common ?? {}), ...(data.fpo_settings ?? {}) });
      })
      .catch(() => undefined);
  }, [locale]);

  const form = useForm<PasswordValues>({ resolver: zodResolver(makePasswordSchema(t)), defaultValues: passwordDefaults });

  const mutation = useMutation({
    mutationFn: authApi.changeCurrentPassword,
    onSuccess: () => {
      form.reset(passwordDefaults);
      toast.success(t.pwd_toast_success ?? "Password changed successfully.");
    },
    onError: (error: unknown) => {
      const message = (error as { message?: string })?.message ?? (t.pwd_toast_failed ?? "Incorrect current password.");
      toast.error(message);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-semibold text-base">{t.pwd_section_title ?? "Change Password"}</h2>
        <p className="mt-0.5 text-muted-foreground text-sm">{t.pwd_section_desc ?? "Update your account password."}</p>
      </div>

      <form
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        className="flex max-w-sm flex-col gap-4 rounded-lg border bg-muted/30 p-5"
      >
        <Controller
          control={form.control}
          name="current_password"
          render={({ field, fieldState }) => (
            <PasswordInput id="cur-pw" field={field} fieldState={fieldState} label={t.pwd_label_current ?? "Current Password"} />
          )}
        />
        <Controller
          control={form.control}
          name="new_password"
          render={({ field, fieldState }) => (
            <PasswordInput id="new-pw" field={field} fieldState={fieldState} label={t.pwd_label_new ?? "New Password"} />
          )}
        />
        <Controller
          control={form.control}
          name="confirm_password"
          render={({ field, fieldState }) => (
            <PasswordInput id="conf-pw" field={field} fieldState={fieldState} label={t.pwd_label_confirm ?? "Confirm New Password"} />
          )}
        />

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => form.reset(passwordDefaults)}>
            {t.pwd_btn_reset ?? "Reset"}
          </Button>
          <Button type="submit" size="sm" disabled={mutation.isPending}>
            {mutation.isPending ? (t.pwd_btn_saving ?? "Saving...") : (t.pwd_btn_change ?? "Change Password")}
          </Button>
        </div>
      </form>
    </div>
  );
}
