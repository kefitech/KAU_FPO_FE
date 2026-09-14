"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  adminCropPackageOfPracticesApi,
  type CropPackageOfPracticesPayload,
} from "@/app/admin/_api/crop-package-of-practices";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type T = Record<string, string>;

const varietySchema = z.object({
  name: z.string().min(1, { message: "Variety name is required" }),
  description: z.string().optional(),
});

const sectionSchema = z.object({
  heading: z.string().min(1, { message: "Section heading is required" }),
  body: z.string(),
});

const schema = z.object({
  crop_name: z.string().min(1, { message: "Crop name is required" }).max(150),
  crop_group: z.string().max(100).optional(),
  season: z.string().optional(),
  varieties: z.array(varietySchema),
  spacing: z.string().optional(),
  manuring_fertilizer: z.string().optional(),
  plant_protection: z.string().optional(),
  harvesting: z.string().optional(),
  expected_yield: z.string().max(255).optional(),
  sections: z.array(sectionSchema),
  source_reference: z.string().max(255).optional(),
  source_page_range: z.string().max(50).optional(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  crop_name: "",
  crop_group: "",
  season: "",
  varieties: [],
  spacing: "",
  manuring_fertilizer: "",
  plant_protection: "",
  harvesting: "",
  expected_yield: "",
  sections: [],
  source_reference: "KAU Package of Practices Recommendations: Crops 2024 (16th ed.)",
  source_page_range: "",
  is_active: false,
};

interface Props {
  mode: "create" | "edit";
  id?: number;
  t?: T;
  tCommon?: T;
}

export function CropPackageOfPracticesForm({ mode, id, t = {}, tCommon = {} }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ["crop-package-of-practices", id],
    queryFn: () => adminCropPackageOfPracticesApi.getById(id!),
    enabled: mode === "edit" && !!id,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const varietiesArray = useFieldArray({ control, name: "varieties" });
  const sectionsArray = useFieldArray({ control, name: "sections" });

  useEffect(() => {
    if (existing) {
      reset({
        crop_name: existing.crop_name,
        crop_group: existing.crop_group,
        season: existing.season,
        varieties: existing.varieties ?? [],
        spacing: existing.spacing,
        manuring_fertilizer: existing.manuring_fertilizer,
        plant_protection: existing.plant_protection,
        harvesting: existing.harvesting,
        expected_yield: existing.expected_yield,
        sections: existing.sections ?? [],
        source_reference: existing.source_reference,
        source_page_range: existing.source_page_range,
        is_active: existing.is_active,
      });
    }
  }, [existing, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: CropPackageOfPracticesPayload = { ...values };
      return mode === "create" ? adminCropPackageOfPracticesApi.create(payload) : adminCropPackageOfPracticesApi.update(id!, payload);
    },
    onSuccess: () => {
      toast.success(mode === "create" ? (t.toast_created ?? "Crop entry created") : (t.toast_updated ?? "Crop entry updated"));
      queryClient.invalidateQueries({ queryKey: ["crop-package-of-practices"] });
      router.push("/admin/crop-package-of-practices");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || (t.toast_save_failed ?? "Failed to save crop entry"));
    },
  });

  const isLoading = mode === "edit" && existingLoading;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="mx-auto max-w-3xl space-y-4">
      {/* Basic info */}
      <div className="rounded-lg border p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="crop_name">
              {t.field_crop_name ?? "Crop Name"} <span className="text-destructive">*</span>
            </FieldLabel>
            <Controller
              control={control}
              name="crop_name"
              render={({ field }) => <Input id="crop_name" placeholder="e.g. Coffee" {...field} />}
            />
            <p className="mt-1 text-muted-foreground text-xs">
              {t.field_crop_name_help ?? "Must match the crop name used in Crop Zone Profiles exactly (case-insensitive)."}
            </p>
            {errors.crop_name && <FieldError errors={[errors.crop_name]} />}
          </Field>
          <Field>
            <FieldLabel htmlFor="crop_group">{t.field_crop_group ?? "Crop Group"}</FieldLabel>
            <Controller
              control={control}
              name="crop_group"
              render={({ field }) => <Input id="crop_group" placeholder="e.g. Beverages and Stimulants" {...field} />}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="season">{t.field_season ?? "Season"}</FieldLabel>
          <Controller
            control={control}
            name="season"
            render={({ field }) => <Textarea id="season" rows={2} {...field} />}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="source_reference">{t.field_source_reference ?? "Source Reference"}</FieldLabel>
            <Controller
              control={control}
              name="source_reference"
              render={({ field }) => <Input id="source_reference" {...field} />}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="source_page_range">{t.field_source_page_range ?? "Source Page Range"}</FieldLabel>
            <Controller
              control={control}
              name="source_page_range"
              render={({ field }) => <Input id="source_page_range" placeholder="e.g. 15-57" {...field} />}
            />
          </Field>
        </div>
      </div>

      {/* Varieties */}
      <div className="rounded-lg border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            {t.varieties_heading ?? "Varieties"}
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => varietiesArray.append({ name: "", description: "" })}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t.btn_add_variety ?? "Add Variety"}
          </Button>
        </div>
        {varietiesArray.fields.length === 0 && (
          <p className="text-muted-foreground text-sm">{t.varieties_empty ?? "No varieties added yet."}</p>
        )}
        <div className="space-y-4">
          {varietiesArray.fields.map((field, index) => (
            <div key={field.id} className="rounded-md border p-3 space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Controller
                    control={control}
                    name={`varieties.${index}.name`}
                    render={({ field: f }) => (
                      <Input placeholder={t.placeholder_variety_name ?? "Variety name"} {...f} />
                    )}
                  />
                  <Controller
                    control={control}
                    name={`varieties.${index}.description`}
                    render={({ field: f }) => (
                      <Textarea
                        rows={2}
                        placeholder={t.placeholder_variety_description ?? "Description (optional)"}
                        {...f}
                      />
                    )}
                  />
                  {errors.varieties?.[index]?.name && <FieldError errors={[errors.varieties[index]!.name!]} />}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => varietiesArray.remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fixed cultivation fields */}
      <div className="rounded-lg border p-5 space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          {t.cultivation_heading ?? "Cultivation Details"}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="spacing">{t.field_spacing ?? "Spacing"}</FieldLabel>
            <Controller control={control} name="spacing" render={({ field }) => <Textarea id="spacing" rows={2} {...field} />} />
          </Field>
          <Field>
            <FieldLabel htmlFor="expected_yield">{t.field_expected_yield ?? "Expected Yield"}</FieldLabel>
            <Controller
              control={control}
              name="expected_yield"
              render={({ field }) => <Input id="expected_yield" {...field} />}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="manuring_fertilizer">{t.field_manuring_fertilizer ?? "Manuring & Fertilizer"}</FieldLabel>
          <Controller
            control={control}
            name="manuring_fertilizer"
            render={({ field }) => <Textarea id="manuring_fertilizer" rows={4} {...field} />}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="plant_protection">{t.field_plant_protection ?? "Plant Protection"}</FieldLabel>
          <Controller
            control={control}
            name="plant_protection"
            render={({ field }) => <Textarea id="plant_protection" rows={4} {...field} />}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="harvesting">{t.field_harvesting ?? "Harvesting"}</FieldLabel>
          <Controller
            control={control}
            name="harvesting"
            render={({ field }) => <Textarea id="harvesting" rows={3} {...field} />}
          />
        </Field>
      </div>

      {/* Sections */}
      <div className="rounded-lg border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            {t.sections_heading ?? "Additional Sections"}
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => sectionsArray.append({ heading: "", body: "" })}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t.btn_add_section ?? "Add Section"}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          {t.sections_help ?? "For content that doesn't fit the fixed fields above, e.g. named propagation methods, intercropping, or organic production notes."}
        </p>
        {sectionsArray.fields.length === 0 && (
          <p className="text-muted-foreground text-sm">{t.sections_empty ?? "No additional sections added yet."}</p>
        )}
        <div className="space-y-4">
          {sectionsArray.fields.map((field, index) => (
            <div key={field.id} className="rounded-md border p-3 space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Controller
                    control={control}
                    name={`sections.${index}.heading`}
                    render={({ field: f }) => (
                      <Input placeholder={t.placeholder_section_heading ?? "Section heading"} {...f} />
                    )}
                  />
                  <Controller
                    control={control}
                    name={`sections.${index}.body`}
                    render={({ field: f }) => (
                      <Textarea rows={4} placeholder={t.placeholder_section_body ?? "Section content"} {...f} />
                    )}
                  />
                  {errors.sections?.[index]?.heading && <FieldError errors={[errors.sections[index]!.heading!]} />}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => sectionsArray.remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="rounded-lg border p-5 space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          {t.settings_heading ?? "Settings"}
        </h3>
        <div className="flex items-center gap-3">
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
          />
          <div>
            <FieldLabel>{t.field_is_active ?? "Active"}</FieldLabel>
            <p className="text-muted-foreground text-xs">
              {t.field_is_active_help ?? "Only active entries are visible to FPOs — saved as a draft until switched on."}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/crop-package-of-practices")}>
          {tCommon.cancel ?? "Cancel"}
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? (t.btn_saving ?? "Saving…")
            : mode === "create"
              ? (t.btn_create ?? "Create")
              : (t.btn_save ?? "Save Changes")}
        </Button>
      </div>
    </form>
  );
}
