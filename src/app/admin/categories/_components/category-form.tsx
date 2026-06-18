"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { translationCategoryApi } from "@/app/admin/_api/translation-category";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { TranslationCategory } from "@/types";

type T = Record<string, string>;

const schema = z.object({
  code: z.string().min(1, { message: "Code is required (e.g. auth, fpo)" }).max(50),
  name: z.string().min(1, { message: "Name is required" }),
  description: z.string().min(1, { message: "Description is required" }),
  display_order: z.string().min(1, { message: "Display order is required" }),
});

type FormValues = z.infer<typeof schema>;

interface CategoryFormProps {
  mode: "create" | "edit";
  category?: TranslationCategory;
  t?: T;
  tCommon?: T;
}

const defaultValues: FormValues = { code: "", name: "", description: "", display_order: "1" };

function toFormValues(cat: TranslationCategory): FormValues {
  return {
    code: cat.code ?? "",
    name: cat.name ?? "",
    description: cat.description ?? "",
    display_order: String(cat.display_order ?? 1),
  };
}

export function CategoryForm({ mode, category, t = {}, tCommon = {} }: CategoryFormProps) {
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
    defaultValues: category ? toFormValues(category) : defaultValues,
  });

  useEffect(() => {
    if (category) reset(toFormValues(category));
  }, [category?.id, reset, category]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        code: values.code,
        name: values.name,
        description: values.description,
        display_order: parseInt(values.display_order, 10),
      };
      if (isEdit && category) return translationCategoryApi.update(category.id, payload);
      return translationCategoryApi.create(payload);
    },
    onSuccess: () => {
      toast.success(
        isEdit
          ? (t.toast_updated ?? "Category updated successfully")
          : (t.toast_created ?? "Category added successfully"),
      );
      queryClient.invalidateQueries({ queryKey: ["translation-categories"] });
      if (!isEdit) router.push("/admin/languages?tab=categories");
    },
    onError: () => toast.error(isEdit ? "Failed to update category" : "Failed to add category"),
  });

  return (
    <div className="mx-auto w-full max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.section_details ?? "Category Details"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-6">
            <FieldGroup>
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="cat-name">
                        {t.name_label ?? "Name"} <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input id="cat-name" placeholder={t.name_placeholder ?? "e.g. Authentication"} {...field} />
                      {errors.name && <FieldError errors={[errors.name]} />}
                    </Field>
                  )}
                />
                <Controller
                  control={control}
                  name="code"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="cat-code">
                        {t.code_label ?? "Code"} <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input id="cat-code" placeholder={t.code_placeholder ?? "e.g. auth"} {...field} />
                      {errors.code && <FieldError errors={[errors.code]} />}
                    </Field>
                  )}
                />
              </div>

              <Controller
                control={control}
                name="description"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="cat-description">
                      {t.description_label ?? "Description"} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Textarea
                      id="cat-description"
                      placeholder={t.description_placeholder ?? "Describe what translations belong here"}
                      rows={3}
                      {...field}
                    />
                    {errors.description && <FieldError errors={[errors.description]} />}
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="display_order"
                render={({ field }) => (
                  <Field className="max-w-32">
                    <FieldLabel htmlFor="cat-order">{t.display_order_label ?? "Display Order"}</FieldLabel>
                    <Input id="cat-order" type="number" min={1} {...field} />
                    {errors.display_order && <FieldError errors={[errors.display_order]} />}
                  </Field>
                )}
              />
            </FieldGroup>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.push("/admin/languages?tab=categories")}>
                {tCommon.cancel_btn ?? "Cancel"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => reset(category ? toFormValues(category) : defaultValues)}
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
