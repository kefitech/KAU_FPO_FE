"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { fpoMemberRolesApi } from "@/app/admin/_api/fpo-member-roles";
import { languageApi } from "@/app/admin/_api/language";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { FpoMemberRole } from "@/types/admin";

type T = Record<string, string>;

const schema = z.object({
  code: z
    .string()
    .min(1, { message: "Code is required" })
    .regex(/^[a-z0-9_]+$/, {
      message: "Only lowercase letters, numbers and underscores",
    }),
  translations: z.record(z.string(), z.string()),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: FpoMemberRole | null;
  t: T;
  tCommon: T;
}

const defaultValues: FormValues = { code: "", translations: {}, is_active: true };

export function RoleDialog({ open, onOpenChange, editing, t, tCommon }: RoleDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!editing;

  const {
    handleSubmit,
    reset,
    control,
    register,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const { data: languagesData } = useQuery({
    queryKey: ["languages-active"],
    queryFn: () => languageApi.getAll({ page: 1, page_size: 100 }),
    staleTime: 5 * 60 * 1000,
  });
  const languages = (languagesData?.data ?? []).filter((l) => l.is_active);

  const { data: detail } = useQuery({
    queryKey: ["fpo-member-role", editing?.id],
    queryFn: () => fpoMemberRolesApi.getById(editing!.id),
    enabled: open && isEdit && !!editing?.id,
  });

  useEffect(() => {
    if (!open) return;
    if (isEdit && detail) {
      reset({ code: detail.code, translations: detail.translations, is_active: detail.is_active });
    } else if (!isEdit) {
      reset(defaultValues);
    }
  }, [open, detail, isEdit, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isEdit
        ? fpoMemberRolesApi.update(editing!.id, { translations: values.translations, is_active: values.is_active })
        : fpoMemberRolesApi.create({
            code: values.code,
            translations: values.translations,
            is_active: values.is_active,
          }),
    onSuccess: () => {
      toast.success(isEdit ? (t.toast_updated ?? "Role updated") : (t.toast_created ?? "Role created"));
      queryClient.invalidateQueries({ queryKey: ["fpo-member-roles"] });
      queryClient.invalidateQueries({ queryKey: ["fpo-permissions"] });
      onOpenChange(false);
    },
    onError: () => toast.error(t.toast_failed ?? "Failed to save role"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? (t.edit_title ?? "Edit Member Role") : (t.add_title ?? "Add Member Role")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="role-code">
                {t.code_label ?? "Code"} <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="role-code"
                placeholder={t.code_placeholder ?? "e.g. secretary"}
                {...register("code")}
                disabled={isEdit}
              />
              {errors.code && <FieldError errors={[errors.code]} />}
            </Field>

            {/* One input per active language — EN required, others optional */}
            <Controller
              control={control}
              name="translations"
              render={({ field }) => (
                <div className="flex flex-col gap-3">
                  {languages.map((lang) => {
                    const isRequired = lang.code === "en";
                    return (
                      <Field key={lang.code}>
                        <FieldLabel htmlFor={`role-trans-${lang.code}`}>
                          {lang.name} ({lang.code.toUpperCase()}) label
                          {isRequired && <span className="text-destructive"> *</span>}
                        </FieldLabel>
                        <Input
                          id={`role-trans-${lang.code}`}
                          placeholder={
                            isRequired
                              ? (t.label_en_placeholder ?? "e.g. Secretary")
                              : (t.label_other_placeholder ?? "Translation (optional)")
                          }
                          value={field.value[lang.code] ?? ""}
                          onChange={(e) => field.onChange({ ...field.value, [lang.code]: e.target.value })}
                        />
                      </Field>
                    );
                  })}
                </div>
              )}
            />

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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon.cancel_btn ?? "Cancel"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                reset(
                  isEdit && detail
                    ? { code: detail.code, translations: detail.translations, is_active: detail.is_active }
                    : defaultValues,
                )
              }
            >
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
