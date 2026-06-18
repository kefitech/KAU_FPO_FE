"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { fpoActionsApi } from "@/app/admin/_api/fpo-actions";
import { languageApi } from "@/app/admin/_api/language";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FpoAction } from "@/types/admin";

type T = Record<string, string>;

const schema = z.object({
  code: z
    .string()
    .min(1, { message: "Code is required" })
    .regex(/^[a-z0-9_]+$/, {
      message: "Only lowercase letters, numbers and underscores",
    }),
  translations: z.record(z.string(), z.string()),
  description: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface ActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: FpoAction | null;
  t: T;
  tCommon: T;
}

const defaultValues: FormValues = { code: "", translations: {}, description: "" };

export function ActionDialog({ open, onOpenChange, editing, t, tCommon }: ActionDialogProps) {
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

  // Fetch active languages to render one input per language
  const { data: languagesData } = useQuery({
    queryKey: ["languages-active"],
    queryFn: () => languageApi.getAll({ page: 1, page_size: 100 }),
    staleTime: 5 * 60 * 1000,
  });
  const languages = (languagesData?.data ?? []).filter((l) => l.is_active);

  // Fetch full detail when editing (list only has language codes, not values)
  const { data: detail } = useQuery({
    queryKey: ["fpo-action", editing?.id],
    queryFn: () => fpoActionsApi.getById(editing!.id),
    enabled: open && isEdit && !!editing?.id,
  });

  useEffect(() => {
    if (!open) return;
    if (isEdit && detail) {
      reset({ code: detail.code, translations: detail.translations, description: detail.description });
    } else if (!isEdit) {
      reset(defaultValues);
    }
  }, [open, detail, isEdit, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isEdit
        ? fpoActionsApi.update(editing!.id, { translations: values.translations, description: values.description })
        : fpoActionsApi.create({
            code: values.code,
            translations: values.translations,
            description: values.description,
          }),
    onSuccess: () => {
      toast.success(isEdit ? (t.toast_updated ?? "Action updated") : (t.toast_created ?? "Action created"));
      queryClient.invalidateQueries({ queryKey: ["fpo-actions"] });
      queryClient.invalidateQueries({ queryKey: ["fpo-permissions"] });
      onOpenChange(false);
    },
    onError: () => toast.error(t.toast_failed ?? "Failed to save action"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? (t.edit_title ?? "Edit Action") : (t.add_title ?? "Add Action")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="action-code">
                {t.code_label ?? "Code"} <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="action-code"
                placeholder={t.code_placeholder ?? "e.g. can_view_financials"}
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
                        <FieldLabel htmlFor={`action-trans-${lang.code}`}>
                          {lang.name} ({lang.code.toUpperCase()}) label
                          {isRequired && <span className="text-destructive"> *</span>}
                        </FieldLabel>
                        <Input
                          id={`action-trans-${lang.code}`}
                          placeholder={
                            isRequired
                              ? (t.label_en_placeholder ?? "e.g. View Financial Reports")
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

            <Field>
              <FieldLabel htmlFor="action-description">{t.description_label ?? "Description"}</FieldLabel>
              <Textarea
                id="action-description"
                placeholder={t.description_placeholder ?? "Briefly describe what this action allows"}
                rows={2}
                {...register("description")}
              />
            </Field>
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
                    ? { code: detail.code, translations: detail.translations, description: detail.description }
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
