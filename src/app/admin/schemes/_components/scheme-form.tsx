"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { adminSchemesApi } from "@/app/admin/_api/schemes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import type { AdminScheme } from "@/types/admin";

const SCHEME_CATEGORIES = [
  { value: "credit", label: "Credit & Finance" },
  { value: "insurance", label: "Insurance" },
  { value: "marketing", label: "Marketing & Trade" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "capacity_building", label: "Capacity Building" },
];

const schema = z.object({
  name_en: z.string().min(1, { message: "English name is required" }).max(300),
  name_ml: z.string().optional(),
  administering_body: z.string().min(1, { message: "Administering body is required" }),
  category: z.string().min(1, { message: "Category is required" }),
  objective: z.string().optional(),
  eligibility: z.string().min(1, { message: "Eligibility is required" }),
  benefit_details: z.string().min(1, { message: "Benefit details are required" }),
  application_process: z.string().min(1, { message: "Application process is required" }),
  official_link: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^https?:\/\/.+/.test(v), { message: "Must be a valid URL" }),
  order: z.number().min(0, { message: "Order must be 0 or greater" }).optional(),
  is_active: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface SchemeFormProps {
  mode: "create" | "edit";
  scheme?: AdminScheme;
}

const defaultValues: FormValues = {
  name_en: "",
  name_ml: "",
  administering_body: "",
  category: "",
  objective: "",
  eligibility: "",
  benefit_details: "",
  application_process: "",
  official_link: "",
  order: 0,
  is_active: true,
};

function schemeToForm(s: AdminScheme): FormValues {
  return {
    name_en: s.name_en ?? "",
    name_ml: s.name_ml ?? "",
    administering_body: s.administering_body ?? "",
    category: s.category ?? "",
    objective: s.objective ?? "",
    eligibility: s.eligibility ?? "",
    benefit_details: s.benefit_details ?? "",
    application_process: s.application_process ?? "",
    official_link: s.official_link ?? "",
    order: s.order ?? 0,
    is_active: s.is_active ?? true,
  };
}

export function SchemeForm({ mode, scheme }: SchemeFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit";

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: scheme ? schemeToForm(scheme) : defaultValues,
  });

  useEffect(() => {
    if (scheme) reset(schemeToForm(scheme));
  }, [scheme?.id, scheme, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        ...values,
        name_ml: values.name_ml || undefined,
        objective: values.objective || undefined,
        official_link: values.official_link || undefined,
      };
      return isEdit ? adminSchemesApi.update(scheme!.id, payload) : adminSchemesApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Scheme updated successfully" : "Scheme created successfully");
      queryClient.invalidateQueries({ queryKey: ["schemes"] });
      router.push("/admin/schemes");
    },
    onError: (error: unknown) => {
      const msg = (error as { message?: string })?.message;
      toast.error(msg ?? (isEdit ? "Failed to update scheme" : "Failed to create scheme"));
    },
  });

  return (
    <div className="mx-auto w-full max-w-3xl flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scheme Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form id="scheme-form" onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-5">
            <FieldGroup>
              {/* Name EN */}
              <Field>
                <FieldLabel htmlFor="name_en">
                  Name (English) <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="name_en"
                  render={({ field }) => (
                    <Input id="name_en" placeholder="e.g. NABARD FPO Credit Scheme" maxLength={300} {...field} />
                  )}
                />
                {errors.name_en && <FieldError errors={[errors.name_en]} />}
              </Field>

              {/* Name ML */}
              <Field>
                <FieldLabel htmlFor="name_ml">Name (Malayalam)</FieldLabel>
                <Controller
                  control={control}
                  name="name_ml"
                  render={({ field }) => <Input id="name_ml" placeholder="മലയാളം പേര്" maxLength={300} {...field} />}
                />
              </Field>

              {/* Administering Body */}
              <Field>
                <FieldLabel htmlFor="administering_body">
                  Administering Body <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="administering_body"
                  render={({ field }) => (
                    <Input id="administering_body" placeholder="e.g. SFAC, NABARD, NCDC" {...field} />
                  )}
                />
                {errors.administering_body && <FieldError errors={[errors.administering_body]} />}
              </Field>

              {/* Category */}
              <Field>
                <FieldLabel htmlFor="category">
                  Category <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <SearchableSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={SCHEME_CATEGORIES}
                      placeholder="Select category…"
                    />
                  )}
                />
                {errors.category && <FieldError errors={[errors.category]} />}
              </Field>
            </FieldGroup>

            <div className="border-t pt-4">
              <FieldGroup>
                {/* Objective */}
                <Field>
                  <FieldLabel htmlFor="objective">Objective</FieldLabel>
                  <Controller
                    control={control}
                    name="objective"
                    render={({ field }) => (
                      <Textarea
                        id="objective"
                        placeholder="Brief objective of the scheme"
                        rows={3}
                        className="resize-none"
                        {...field}
                      />
                    )}
                  />
                </Field>

                {/* Eligibility */}
                <Field>
                  <FieldLabel htmlFor="eligibility">
                    Eligibility <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="eligibility"
                    render={({ field }) => (
                      <Textarea
                        id="eligibility"
                        placeholder="Who is eligible for this scheme?"
                        rows={4}
                        className="resize-none"
                        {...field}
                      />
                    )}
                  />
                  {errors.eligibility && <FieldError errors={[errors.eligibility]} />}
                </Field>

                {/* Benefit Details */}
                <Field>
                  <FieldLabel htmlFor="benefit_details">
                    Benefit Details <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="benefit_details"
                    render={({ field }) => (
                      <Textarea
                        id="benefit_details"
                        placeholder="What benefits does this scheme provide?"
                        rows={4}
                        className="resize-none"
                        {...field}
                      />
                    )}
                  />
                  {errors.benefit_details && <FieldError errors={[errors.benefit_details]} />}
                </Field>

                {/* Application Process */}
                <Field>
                  <FieldLabel htmlFor="application_process">
                    Application Process <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="application_process"
                    render={({ field }) => (
                      <Textarea
                        id="application_process"
                        placeholder="How to apply for this scheme?"
                        rows={4}
                        className="resize-none"
                        {...field}
                      />
                    )}
                  />
                  {errors.application_process && <FieldError errors={[errors.application_process]} />}
                </Field>
              </FieldGroup>
            </div>

            <div className="border-t pt-4">
              <FieldGroup>
                {/* Official Link */}
                <Field>
                  <FieldLabel htmlFor="official_link">Official Link</FieldLabel>
                  <Controller
                    control={control}
                    name="official_link"
                    render={({ field }) => (
                      <Input id="official_link" placeholder="https://example.gov.in" type="url" {...field} />
                    )}
                  />
                  {errors.official_link && <FieldError errors={[errors.official_link]} />}
                </Field>

                {/* Order */}
                {/* <Field>
                  <FieldLabel htmlFor="order">Display Order</FieldLabel>
                  <Controller
                    control={control}
                    name="order"
                    render={({ field }) => (
                      <Input id="order" type="number" min={0} placeholder="0" className="w-32" {...field} 
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                    )}
                  />
                </Field> */}

                {/* Is Active */}
                <div className="flex items-center gap-2 pt-1">
                  <Controller
                    control={control}
                    name="is_active"
                    render={({ field }) => (
                      <Checkbox id="is_active" checked={!!field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                  <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
                    Active (visible to FPOs)
                  </label>
                </div>
              </FieldGroup>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/schemes")}>
          Cancel
        </Button>
        <Button type="button" variant="ghost" onClick={() => reset(scheme ? schemeToForm(scheme) : defaultValues)}>
          Reset
        </Button>
        <Button type="submit" form="scheme-form" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
