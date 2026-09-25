"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { govtSchemesApi } from "@/app/government/_api/schemes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

type FormErrors = {
  name_en?: string;
  administering_body?: string;
  eligibility?: string;
  benefit_details?: string;
  application_process?: string;
};

export default function NewSchemePage() {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "admin_schemes,government_schemes")
      .then((data) => {
        setT({ ...(data.admin_schemes ?? {}), ...(data.government_schemes ?? {}) });
      })
      .catch(() => undefined);
  }, [locale]);

  const CATEGORIES = [
    { value: "credit", label: t.cat_credit ?? "Credit & Finance" },
    { value: "insurance", label: t.cat_insurance ?? "Insurance" },
    { value: "marketing", label: t.cat_marketing ?? "Marketing & Trade" },
    { value: "infrastructure", label: t.cat_infrastructure ?? "Infrastructure" },
    { value: "capacity_building", label: t.cat_capacity_building ?? "Capacity Building" },
  ];

  const [nameEn, setNameEn] = useState("");
  const [administeringBody, setAdministeringBody] = useState("");
  const [category, setCategory] = useState("infrastructure");
  const [objective, setObjective] = useState("");
  const [eligibility, setEligibility] = useState("");
  const [benefitDetails, setBenefitDetails] = useState("");
  const [applicationProcess, setApplicationProcess] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!nameEn.trim()) next.name_en = t.validation_name_required ?? "Scheme name is required.";
    if (!administeringBody.trim())
      next.administering_body = t.validation_administering_body_required ?? "Administering body is required.";
    if (!eligibility.trim()) next.eligibility = t.validation_eligibility_required ?? "Eligibility is required.";
    if (!benefitDetails.trim())
      next.benefit_details = t.validation_benefit_details_required ?? "Benefit details are required.";
    if (!applicationProcess.trim())
      next.application_process = t.validation_application_process_required ?? "Application process is required.";
    return next;
  };

  const mutation = useMutation({
    mutationFn: () =>
      govtSchemesApi.create({
        name_en: nameEn,
        administering_body: administeringBody,
        category,
        objective,
        eligibility,
        benefit_details: benefitDetails,
        application_process: applicationProcess,
        is_active: true,
      }),
    onSuccess: () => {
      toast.success(t.toast_created ?? "Scheme created");
      router.push("/government/schemes");
    },
    onError: (error: unknown) => {
      const msg = (error as { data?: { message?: string } })?.data?.message;
      toast.error(msg ?? "Failed to save scheme");
    },
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-bold text-2xl">{t.create_title ?? "New Scheme"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.create_subtitle ?? "Add a scheme or subsidy to the catalog"}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const nextErrors = validate();
          setErrors(nextErrors);
          if (Object.keys(nextErrors).length > 0) return;
          mutation.mutate();
        }}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.section_basic ?? "Scheme Details"}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field data-invalid={!!errors.name_en}>
                <FieldLabel htmlFor="name">{t.field_name_en ?? "Name"} *</FieldLabel>
                <Input
                  id="name"
                  value={nameEn}
                  onChange={(e) => {
                    setNameEn(e.target.value);
                    setErrors((p) => ({ ...p, name_en: undefined }));
                  }}
                  placeholder={t.placeholder_name_en ?? "Scheme name"}
                  aria-invalid={!!errors.name_en}
                />
                {errors.name_en && <FieldError errors={[{ message: errors.name_en }]} />}
              </Field>
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field data-invalid={!!errors.administering_body}>
                  <FieldLabel htmlFor="body">{t.field_administered_by ?? "Administering Body"} *</FieldLabel>
                  <Input
                    id="body"
                    value={administeringBody}
                    onChange={(e) => {
                      setAdministeringBody(e.target.value);
                      setErrors((p) => ({ ...p, administering_body: undefined }));
                    }}
                    placeholder={t.placeholder_administered_by ?? ""}
                    aria-invalid={!!errors.administering_body}
                  />
                  {errors.administering_body && <FieldError errors={[{ message: errors.administering_body }]} />}
                </Field>
                <Field>
                  <FieldLabel htmlFor="category">{t.field_category ?? "Category"}</FieldLabel>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </FieldGroup>
              <Field>
                <FieldLabel htmlFor="objective">{t.field_objective ?? "Objective"}</FieldLabel>
                <Textarea id="objective" value={objective} onChange={(e) => setObjective(e.target.value)} rows={2} />
              </Field>
              <Field data-invalid={!!errors.eligibility}>
                <FieldLabel htmlFor="eligibility">{t.field_eligibility ?? "Eligibility"} *</FieldLabel>
                <Textarea
                  id="eligibility"
                  value={eligibility}
                  onChange={(e) => {
                    setEligibility(e.target.value);
                    setErrors((p) => ({ ...p, eligibility: undefined }));
                  }}
                  placeholder={t.placeholder_eligibility ?? ""}
                  rows={2}
                  aria-invalid={!!errors.eligibility}
                />
                {errors.eligibility && <FieldError errors={[{ message: errors.eligibility }]} />}
              </Field>
              <Field data-invalid={!!errors.benefit_details}>
                <FieldLabel htmlFor="benefits">{t.field_benefit_details ?? "Benefit Details"} *</FieldLabel>
                <Textarea
                  id="benefits"
                  value={benefitDetails}
                  onChange={(e) => {
                    setBenefitDetails(e.target.value);
                    setErrors((p) => ({ ...p, benefit_details: undefined }));
                  }}
                  placeholder={t.placeholder_benefit_details ?? ""}
                  rows={2}
                  aria-invalid={!!errors.benefit_details}
                />
                {errors.benefit_details && <FieldError errors={[{ message: errors.benefit_details }]} />}
              </Field>
              <Field data-invalid={!!errors.application_process}>
                <FieldLabel htmlFor="process">{t.field_application_process ?? "Application Process"} *</FieldLabel>
                <Textarea
                  id="process"
                  value={applicationProcess}
                  onChange={(e) => {
                    setApplicationProcess(e.target.value);
                    setErrors((p) => ({ ...p, application_process: undefined }));
                  }}
                  rows={2}
                  aria-invalid={!!errors.application_process}
                />
                {errors.application_process && <FieldError errors={[{ message: errors.application_process }]} />}
              </Field>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/government/schemes")}>
              {t.btn_cancel ?? "Cancel"}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (t.btn_creating ?? "Saving...") : (t.btn_create ?? "Save Scheme")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
