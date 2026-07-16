"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { adminExpertsApi } from "@/app/admin/_api/experts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { AdminExpert } from "@/types/admin";
import { DISTRICT_OPTIONS } from "@/types/fpo";

type T = Record<string, string>;

const EXPERT_CATEGORIES = [
  { value: "scientist", label: "Scientist / Researcher" },
  { value: "trainer", label: "Trainer / Extension Worker" },
  { value: "banker", label: "Banker / Financial Advisor" },
  { value: "facilitator", label: "Facilitator / NGO" },
];

const DISTRICT_SELECT_OPTIONS = DISTRICT_OPTIONS.map((d) => ({ value: d.value, label: d.label }));

const schema = z.object({
  name_en: z.string().min(1, { message: "English name is required" }).max(200),
  name_ml: z.string().optional(),
  designation: z.string().min(1, { message: "Designation is required" }).max(200),
  organisation: z.string().min(1, { message: "Organisation is required" }).max(200),
  primary_expertise: z.string().min(1, { message: "Primary expertise is required" }).max(200),
  secondary_expertise: z.string().optional(),
  category: z.string().min(1, { message: "Category is required" }),
  district: z.string().optional(),
  email: z.string().email({ message: "Valid email is required" }),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number").optional().or(z.literal("")),
  is_active: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ExpertFormProps {
  mode: "create" | "edit";
  expert?: AdminExpert;
  t?: T;
  tCommon?: T;
}

const defaultValues: FormValues = {
  name_en: "",
  name_ml: "",
  designation: "",
  organisation: "",
  primary_expertise: "",
  secondary_expertise: "",
  category: "",
  district: "",
  email: "",
  phone: "",
  is_active: true,
};

function expertToForm(e: AdminExpert): FormValues {
  return {
    name_en: e.name_en ?? "",
    name_ml: e.name_ml ?? "",
    designation: e.designation ?? "",
    organisation: e.organisation ?? "",
    primary_expertise: e.primary_expertise ?? "",
    secondary_expertise: e.secondary_expertise ?? "",
    category: e.category ?? "",
    district: e.district ?? "",
    email: e.email ?? "",
    phone: e.phone ?? "",
    is_active: e.is_active ?? true,
  };
}

export function ExpertForm({ mode, expert, t = {}, tCommon = {} }: ExpertFormProps) {
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
    defaultValues: expert ? expertToForm(expert) : defaultValues,
  });

  useEffect(() => {
    if (expert) reset(expertToForm(expert));
  }, [expert?.id, expert, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        ...values,
        name_ml: values.name_ml || undefined,
        secondary_expertise: values.secondary_expertise || undefined,
        district: values.district || undefined,
        phone: values.phone || undefined,
      };
      return isEdit ? adminExpertsApi.update(expert!.id, payload) : adminExpertsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? (t.toast_updated ?? "Expert updated successfully") : (t.toast_created ?? "Expert created successfully"));
      queryClient.invalidateQueries({ queryKey: ["experts"] });
      router.push("/admin/experts");
    },
    onError: (error: unknown) => {
      const msg = (error as { message?: string })?.message;
      toast.error(msg ?? (isEdit ? (t.toast_update_failed ?? "Failed to update expert") : (t.toast_create_failed ?? "Failed to create expert")));
    },
  });

  return (
    <div className="mx-auto w-full max-w-3xl flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.card_title ?? "Expert Details"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form id="expert-form" onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-5">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name_en">
                  {t.field_name_en ?? "Name (English)"} <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="name_en"
                  render={({ field }) => (
                    <Input id="name_en" placeholder="e.g. Dr. K. P. Sudheer" maxLength={200} {...field} />
                  )}
                />
                {errors.name_en && <FieldError errors={[errors.name_en]} />}
              </Field>

              <Field>
                <FieldLabel htmlFor="name_ml">{t.field_name_ml ?? "Name (Malayalam)"}</FieldLabel>
                <Controller
                  control={control}
                  name="name_ml"
                  render={({ field }) => (
                    <Input id="name_ml" placeholder="മലയാളം പേര്" maxLength={200} {...field} />
                  )}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="designation">
                    {t.field_designation ?? "Designation"} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="designation"
                    render={({ field }) => (
                      <Input id="designation" placeholder="e.g. Professor & Head" maxLength={200} {...field} />
                    )}
                  />
                  {errors.designation && <FieldError errors={[errors.designation]} />}
                </Field>

                <Field>
                  <FieldLabel htmlFor="organisation">
                    {t.field_organisation ?? "Organisation"} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="organisation"
                    render={({ field }) => (
                      <Input id="organisation" placeholder="e.g. KAU Vellanikkara" maxLength={200} {...field} />
                    )}
                  />
                  {errors.organisation && <FieldError errors={[errors.organisation]} />}
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="category">
                  {t.field_category ?? "Category"} <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <SearchableSelect
                      key={field.value}  // Add this line
                      value={field.value}
                      onChange={field.onChange}
                      options={EXPERT_CATEGORIES}
                      placeholder={t.placeholder_category ?? "Select category…"}
                    />
                  )}
                />
                {errors.category && <FieldError errors={[errors.category]} />}
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="primary_expertise">
                    {t.field_primary_expertise ?? "Primary Expertise"} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="primary_expertise"
                    render={({ field }) => (
                      <Input id="primary_expertise" placeholder="e.g. Agricultural Engineering" maxLength={200} {...field} />
                    )}
                  />
                  {errors.primary_expertise && <FieldError errors={[errors.primary_expertise]} />}
                </Field>

                <Field>
                  <FieldLabel htmlFor="secondary_expertise">{t.field_secondary_expertise ?? "Secondary Expertise"}</FieldLabel>
                  <Controller
                    control={control}
                    name="secondary_expertise"
                    render={({ field }) => (
                      <Input id="secondary_expertise" placeholder="e.g. Agri-Startups" maxLength={200} {...field} />
                    )}
                  />
                </Field>
              </div>
            </FieldGroup>

            <div className="border-t pt-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="district">{t.field_district ?? "District"}</FieldLabel>
                  <Controller
                    control={control}
                    name="district"
                    render={({ field }) => (
                      <SearchableSelect
                        key={field.value}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        options={DISTRICT_SELECT_OPTIONS}
                        placeholder={t.placeholder_district ?? "Select district…"}
                      />
                    )}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="email">
                      {t.field_email ?? "Email"} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Controller
                      control={control}
                      name="email"
                      render={({ field }) => (
                        <Input id="email" type="email" placeholder="eg: expert@kau.in" {...field} />
                      )}
                    />
                    {errors.email && <FieldError errors={[errors.email]} />}
                  </Field>

                 <Field>
                    <FieldLabel htmlFor="phone">{t.field_phone ?? "Phone"}</FieldLabel>
                    <Controller
                      control={control}
                      name="phone"
                      render={({ field }) => (
                        <Input 
                          id="phone" 
                          type="tel"
                          maxLength={10}
                          placeholder="eg: 9876543210"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                            field.onChange(value);
                          }}
                        />
                      )}
                    />
                    {errors.phone && <FieldError errors={[errors.phone]} />}
                  </Field>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Controller
                    control={control}
                    name="is_active"
                    render={({ field }) => (
                      <Checkbox
                        id="is_active"
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
                    {t.field_is_active ?? "Active (visible in Expert Directory)"}
                  </label>
                </div>
              </FieldGroup>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/experts")}>
          {tCommon.cancel ?? "Cancel"}
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          onClick={() => {
            const resetData = expert ? expertToForm(expert) : defaultValues;
            reset(resetData, { keepValues: false });
          }}
        >
          {tCommon.reset ?? "Reset"}
        </Button>
        <Button type="submit" form="expert-form" disabled={mutation.isPending}>
          {mutation.isPending ? (t.btn_saving ?? "Saving…") : (t.btn_save ?? "Save")}
        </Button>
      </div>
    </div>
  );
}
