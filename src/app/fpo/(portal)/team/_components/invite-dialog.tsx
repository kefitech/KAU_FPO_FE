"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { file, z } from "zod";

import { fpoTeamApi } from "@/app/fpo/_api/team";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const schema = z.object({
  first_name: z.string().min(1, { message: "First name is required" }),
  last_name: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Enter a valid email address" }),
  phone: z.string().refine((v) => v === "" || /^\d{10}$/.test(v), {
    message: "Enter a valid 10-digit phone number",
  }),
});

type FormValues = z.infer<typeof schema>;
type T = Record<string, string>;

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
  const queryClient = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi.getPublic(locale, "fpo_team,common")
      .then((data) => setT(data.fpo_team ?? {}))
      .catch(() => undefined);
  }, [locale]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: "", last_name: "", email: "", phone: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      fpoTeamApi.invite({
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        phone: values.phone || undefined,
      }),
    onSuccess: () => {
      toast.success(t.invite_toast_sent ?? "Invitation sent successfully");
      queryClient.invalidateQueries({ queryKey: ["fpo-team"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const error = err as {
        message?: string;
        status?: number;
        data?: {
          errors?: Record<string, string[]>;
          message?: string;
        };
      };

      if (error.data?.errors && Object.keys(error.data.errors).length > 0) {
        Object.entries(error.data.errors).forEach(([field, messages]) => {
          setError(field as keyof FormValues, {
            type: "server",
            message: messages[0],
          });
        });
      } else {
        toast.error(error.data?.message ?? error.message ?? (t.invite_toast_failed ?? "Failed to send invitation"));
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.invite_dialog_title ?? "Invite Team Member"}</DialogTitle>
          <DialogDescription className="sr-only">
            Fill in the details of the person you want to invite to join your team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4 pt-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="first_name">
                {t.invite_field_first_name ?? "First Name"} <span className="text-destructive">*</span>
              </FieldLabel>
              <Input id="first_name" placeholder={t.invite_placeholder_first_name ?? "Rajan"} {...register("first_name")} />
              {errors.first_name && <FieldError errors={[errors.first_name]} />}
            </Field>

            <Field>
              <FieldLabel htmlFor="last_name">
                {t.invite_field_last_name ?? "Last Name"} <span className="text-destructive">*</span>
              </FieldLabel>
              <Input id="last_name" placeholder={t.invite_placeholder_last_name ?? "Kumar"} {...register("last_name")} />
              {errors.last_name && <FieldError errors={[errors.last_name]} />}
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="email">
              {t.invite_field_email ?? "Email"} <span className="text-destructive">*</span>
            </FieldLabel>
            <Input id="email" type="email" placeholder={t.invite_placeholder_email ?? "rajan@example.com"} {...register("email")} />
            {errors.email && <FieldError errors={[{ message: errors.email.message ?? "" }]} />}
          </Field>

          <Field>
            <FieldLabel htmlFor="phone">{t.invite_field_phone ?? "Phone"}</FieldLabel>
            <Input id="phone" placeholder={t.invite_placeholder_phone ?? "10-digit mobile (optional)"} maxLength={10} {...register("phone")} />
            {errors.phone && <FieldError errors={[errors.phone]} />}
          </Field>

          <p className="text-muted-foreground text-xs">
            An email with a temporary password will be sent to the invited member.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.invite_btn_cancel ?? "Cancel"}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (t.invite_btn_sending ?? "Sending…") : (t.invite_btn_send ?? "Send Invite")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
