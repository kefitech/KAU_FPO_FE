"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  COMMODITY_SECTIONS,
  type MasterCategory,
  type MasterDataEntry,
  masterDataAdminApi,
  masterDataQueryKey,
} from "@/app/admin/_api/master-data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type T = Record<string, string>;

function makeSchema(t: T) {
  return z.object({
    // Required for most tables; crop names/groups derive it from the name when left empty (checked below)
    code: z
      .string()
      .max(50, { message: t.val_code_max ?? "Max 50 characters" })
      .refine((v) => v === "" || /^[a-z0-9_]+$/.test(v), {
        message: t.val_code_invalid ?? "Only lowercase letters, numbers and underscores",
      }),
    name_en: z
      .string()
      .min(1, { message: t.val_name_en_required ?? "English name is required" })
      .max(40, { message: t.val_name_en_max ?? "Max 40 characters" }),
    name_ml: z.string(),
    section: z.string(),
    description: z.string(),
    display_order: z.string().regex(/^\d*$/, { message: t.val_display_order_invalid ?? "Must be a whole number" }),
    is_active: z.boolean(),
  });
}

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

const defaultValues: FormValues = {
  code: "",
  name_en: "",
  name_ml: "",
  section: "agricultural",
  description: "",
  display_order: "",
  is_active: true,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: MasterCategory;
  categoryLabel: string;
  editing: MasterDataEntry | null;
  t: T;
  tCommon: T;
}

export function MasterDataDialog({ open, onOpenChange, category, categoryLabel, editing, t, tCommon }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!editing;
  const isCommodity = category === "commodity";
  const codeOptional = category === "crop_name" || category === "crop_group";

  const {
    handleSubmit,
    reset,
    control,
    register,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(makeSchema(t)), defaultValues });

  useEffect(() => {
    if (!open) return;
    reset(
      editing
        ? {
            code: editing.code,
            name_en: editing.name_en,
            name_ml: editing.name_ml,
            section: editing.metadata?.section ?? "agricultural",
            description: editing.description,
            display_order: String(editing.display_order),
            is_active: editing.is_active,
          }
        : defaultValues,
    );
  }, [open, editing, reset]);

  const mutation = useMutation({
    mutationFn: (v: FormValues) => {
      if (!isEdit && !codeOptional && !v.code) {
        const message = t.val_code_required ?? "Code is required";
        setError("code", { message });
        return Promise.reject({ message });
      }
      const order = v.display_order === "" ? undefined : Number(v.display_order);
      const shared = {
        name_en: v.name_en.trim(),
        description: v.description,
        display_order: order,
        is_active: v.is_active,
        ...(isCommodity ? { section: v.section } : {}),
      };
      return isEdit
        ? masterDataAdminApi.update(category, editing!.id, { ...shared, name_ml: v.name_ml.trim() })
        : masterDataAdminApi.create(category, {
            code: v.code || undefined,
            ...shared,
            name_ml: v.name_ml.trim() || undefined,
          });
    },
    onSuccess: () => {
      toast.success(isEdit ? (t.toast_updated ?? "Updated") : (t.toast_created ?? "Added"));
      queryClient.invalidateQueries({ queryKey: [masterDataQueryKey(category)] });
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      const err = e as { message?: string; data?: { errors?: Record<string, string[]> } };
      const codeError = err?.data?.errors?.code?.[0];
      if (codeError) setError("code", { message: String(codeError) });
      const nameError = err?.data?.errors?.name_en?.[0];
      if (nameError) setError("name_en", { message: String(nameError) });
      toast.error(err?.message ?? t.toast_failed ?? "Failed to save");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[90vh] sm:max-w-lg gap-0 p-0" aria-describedby={undefined}>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col min-h-0">
          {/* Sticky header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>
              {isEdit ? (t.edit_title ?? "Edit") : (t.add_title ?? "Add")} — {categoryLabel}
            </DialogTitle>
          </DialogHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="md-code">
                  {t.code_label ?? "Code"} {!codeOptional && <span className="text-destructive">*</span>}
                </FieldLabel>
                <Controller
                  control={control}
                  name="code"
                  render={({ field }) => (
                    <Input
                      id="md-code"
                      placeholder={
                        codeOptional
                          ? (t.code_placeholder_optional ?? "Optional — generated from the name")
                          : (t.code_placeholder ?? "e.g. black_pepper")
                      }
                      disabled={isEdit}
                      maxLength={50}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
                    />
                  )}
                />
                {isEdit && (
                  <p className="text-muted-foreground text-xs">
                    {t.code_locked_hint ?? "The code cannot be changed — other records refer to it."}
                  </p>
                )}
                {errors.code && <FieldError errors={[errors.code]} />}
              </Field>

              <Field>
                <FieldLabel htmlFor="md-name-en">
                  {t.name_en_label ?? "Name (English)"} <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="name_en"
                  render={({ field }) => (
                    <Input
                      id="md-name-en"
                      maxLength={40}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.replace(/[^a-zA-Z0-9_ ]/g, ""))}
                    />
                  )}
                />
                {errors.name_en && <FieldError errors={[errors.name_en]} />}
              </Field>

              <Field>
                <FieldLabel htmlFor="md-name-ml">{t.name_ml_label ?? "Name (Malayalam)"}</FieldLabel>
                <Input
                  id="md-name-ml"
                  placeholder={t.name_ml_placeholder ?? "Optional — defaults to the English name"}
                  {...register("name_ml")}
                />
              </Field>

              {isCommodity && (
                <Field>
                  <FieldLabel htmlFor="md-section">{t.section_label ?? "Section"}</FieldLabel>
                  <Controller
                    control={control}
                    name="section"
                    render={({ field }) => (
                      <NativeSelect id="md-section" className="w-full" value={field.value} onChange={field.onChange}>
                        {COMMODITY_SECTIONS.map((s) => (
                          <option key={s} value={s}>
                            {t[`section_${s}`] ?? s.replace(/_/g, " ")}
                          </option>
                        ))}
                      </NativeSelect>
                    )}
                  />
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="md-order">{t.order_label ?? "Display order"}</FieldLabel>
                <Input
                  id="md-order"
                  inputMode="numeric"
                  placeholder={t.order_placeholder ?? "Optional — new entries go before “Other”"}
                  {...register("display_order")}
                />
                {errors.display_order && <FieldError errors={[errors.display_order]} />}
              </Field>

              <Field>
                <FieldLabel htmlFor="md-description">{t.description_label ?? "Description"}</FieldLabel>
                <Textarea
                  id="md-description"
                  rows={2}
                  className="max-h-40 overflow-y-auto"
                  {...register("description")}
                />
              </Field>

              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Switch id="md-active" checked={field.value} onCheckedChange={field.onChange} />
                    <FieldLabel htmlFor="md-active">{t.active_label ?? "Active (shown in dropdowns)"}</FieldLabel>
                  </div>
                )}
              />
            </FieldGroup>
          </div>

          {/* Sticky footer */}
          <DialogFooter className="px-6 pb-6 pt-4 border-t shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon.cancel_btn ?? "Cancel"}
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
