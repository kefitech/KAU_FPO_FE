"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { channelSettingsApi } from "@/app/admin/_api/notification-channel-settings";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ChannelSetting } from "@/types";

type T = Record<string, string>;

const schema = z.object({
  recipient: z.string().min(1, { message: "Recipient is required" }),
  message: z.string().min(1, { message: "Message is required" }),
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = { recipient: "", message: "" };

interface ChannelSettingsTestDialogProps {
  open: boolean;
  onClose: () => void;
  setting: ChannelSetting | null;
  t: T;
  tCommon: T;
}

const RECIPIENT_PLACEHOLDERS: Record<string, string> = {
  email: "e.g. test@example.com",
  sms: "e.g. +919876543210",
  in_app: "e.g. user_id or username",
};

export function ChannelSettingsTestDialog({ open, onClose, setting, t, tCommon }: ChannelSettingsTestDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (open) reset(defaultValues);
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => channelSettingsApi.test(setting!.id, values.recipient, values.message),
    onSuccess: () => {
      toast.success(t.toast_success ?? "Test notification sent successfully");
      onClose();
    },
    onError: () => toast.error(t.toast_failed ?? "Failed to send test notification"),
  });

  const recipientPlaceholder =
    t[`recipient_placeholder_${setting?.channel}`] ?? RECIPIENT_PLACEHOLDERS[setting?.channel ?? "email"] ?? "";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t.title ?? "Send Test Notification"}</DialogTitle>
        </DialogHeader>

        <p className="-mt-2 text-muted-foreground text-sm">
          {t.description ?? "Send a test notification using this channel's current configuration."}
        </p>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="test-recipient">
                {t.recipient_label ?? "Recipient"} <span className="text-destructive">*</span>
              </FieldLabel>
              <Input id="test-recipient" placeholder={recipientPlaceholder} {...register("recipient")} />
              {errors.recipient && <FieldError errors={[errors.recipient]} />}
            </Field>

            <Field>
              <FieldLabel htmlFor="test-message">
                {t.message_label ?? "Message"} <span className="text-destructive">*</span>
              </FieldLabel>
              <Textarea
                id="test-message"
                placeholder={t.message_placeholder ?? "Enter test message..."}
                rows={3}
                {...register("message")}
              />
              {errors.message && <FieldError errors={[errors.message]} />}
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {tCommon.cancel_btn ?? "Cancel"}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (t.sending_btn ?? "Sending...") : (t.send_btn ?? "Send Test")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
