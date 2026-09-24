"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { govtSchemesApi } from "@/app/government/_api/schemes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

type T = Record<string, string>;

export default function EditSchemePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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

  const { data: scheme, isLoading } = useQuery({
    queryKey: ["government", "scheme", id],
    queryFn: () => govtSchemesApi.getById(Number(id)),
  });

  const [nameEn, setNameEn] = useState("");
  const [administeringBody, setAdministeringBody] = useState("");
  const [category, setCategory] = useState("infrastructure");
  const [objective, setObjective] = useState("");
  const [eligibility, setEligibility] = useState("");
  const [benefitDetails, setBenefitDetails] = useState("");
  const [applicationProcess, setApplicationProcess] = useState("");

  useEffect(() => {
    if (scheme) {
      setNameEn(scheme.name_en);
      setAdministeringBody(scheme.administering_body);
      setCategory(scheme.category);
      setObjective(scheme.objective);
      setEligibility(scheme.eligibility);
      setBenefitDetails(scheme.benefit_details);
      setApplicationProcess(scheme.application_process);
    }
  }, [scheme]);

  const mutation = useMutation({
    mutationFn: () =>
      govtSchemesApi.update(Number(id), {
        name_en: nameEn,
        administering_body: administeringBody,
        category,
        objective,
        eligibility,
        benefit_details: benefitDetails,
        application_process: applicationProcess,
      }),
    onSuccess: () => {
      toast.success(t.toast_updated ?? "Scheme updated");
      router.push("/government/schemes");
    },
    onError: (error: unknown) => {
      const msg = (error as { data?: { message?: string } })?.data?.message;
      toast.error(msg ?? "Failed to update scheme");
    },
  });

  if (isLoading || !scheme) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
        {t.loading ?? "Loading..."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-bold text-2xl">{t.edit_title ?? "Edit Scheme"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">{t.edit_subtitle ?? "Update this scheme catalog entry"}</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!nameEn || !administeringBody || !eligibility || !benefitDetails || !applicationProcess) {
            toast.error(t.validation_name_required ?? "Fill in all required fields");
            return;
          }
          mutation.mutate();
        }}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.section_basic ?? "Scheme Details"}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="name">{t.field_name_en ?? "Name"} *</FieldLabel>
                <Input id="name" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
              </Field>
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="body">{t.field_administered_by ?? "Administering Body"} *</FieldLabel>
                  <Input id="body" value={administeringBody} onChange={(e) => setAdministeringBody(e.target.value)} />
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
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </Field>
              </FieldGroup>
              <Field>
                <FieldLabel htmlFor="objective">{t.field_objective ?? "Objective"}</FieldLabel>
                <Textarea id="objective" value={objective} onChange={(e) => setObjective(e.target.value)} rows={2} />
              </Field>
              <Field>
                <FieldLabel htmlFor="eligibility">{t.field_eligibility ?? "Eligibility"} *</FieldLabel>
                <Textarea id="eligibility" value={eligibility} onChange={(e) => setEligibility(e.target.value)} rows={2} />
              </Field>
              <Field>
                <FieldLabel htmlFor="benefits">{t.field_benefit_details ?? "Benefit Details"} *</FieldLabel>
                <Textarea id="benefits" value={benefitDetails} onChange={(e) => setBenefitDetails(e.target.value)} rows={2} />
              </Field>
              <Field>
                <FieldLabel htmlFor="process">{t.field_application_process ?? "Application Process"} *</FieldLabel>
                <Textarea id="process" value={applicationProcess} onChange={(e) => setApplicationProcess(e.target.value)} rows={2} />
              </Field>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/government/schemes")}>
              {t.btn_cancel ?? "Cancel"}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (t.btn_saving ?? "Saving...") : (t.btn_save ?? "Save Changes")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
