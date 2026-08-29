"use client";

import { useWatch } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useDprSectionForm } from "@/hooks/use-dpr-section-form";

import { FieldError } from "./field-error";
import { SectionShell } from "./section-shell";

/**
 * §2.3.8 Baseline — conditional Yes/No branch.
 * Backend nullable + blank on every field; server validator enforces the branch.
 */
const Schema = z.object({
  currently_engaged: z.union([z.boolean(), z.null()]),

  // If Yes
  existing_products: z.string(),
  existing_installed_capacity: z.string(),
  current_annual_production: z.string(),
  current_annual_turnover: z.union([z.string(), z.number()]).nullable(),
  existing_infrastructure: z.string(),
  existing_machinery: z.string(),
  num_employees: z.union([z.string(), z.number()]).nullable(),
  existing_market_coverage: z.string(),
  major_challenges: z.string(),
  current_capacity_utilization_pct: z.union([z.string(), z.number()]).nullable(),
  existing_certifications: z.string(),

  // If No
  reason_for_proposing: z.string(),
  previous_experience: z.string(),
  technical_guidance_available: z.string(),
  proposed_implementation_approach: z.string(),
  similar_projects_visited: z.string(),
});
type Data = z.infer<typeof Schema>;

/** Coerce Decimal-as-string and empty inputs to null before PATCH. */
function serializePayload(v: Data): Record<string, unknown> {
  const num = (x: string | number | null): string | null => {
    if (x === null || x === "") return null;
    const n = typeof x === "number" ? x : Number(x);
    return Number.isFinite(n) ? String(n) : null;
  };
  const int = (x: string | number | null): number | null => {
    if (x === null || x === "") return null;
    const n = typeof x === "number" ? x : Number(x);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  };
  return {
    ...v,
    current_annual_turnover: num(v.current_annual_turnover),
    num_employees: int(v.num_employees),
    current_capacity_utilization_pct: num(v.current_capacity_utilization_pct),
  };
}

export function BaselineSection({ uuid }: { uuid: string }) {
  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, fieldErrors, fieldWarnings, save, discard } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "baseline",
    schema: Schema,
    defaultValues: {
      currently_engaged: null,
      existing_products: "",
      existing_installed_capacity: "",
      current_annual_production: "",
      current_annual_turnover: null,
      existing_infrastructure: "",
      existing_machinery: "",
      num_employees: null,
      existing_market_coverage: "",
      major_challenges: "",
      current_capacity_utilization_pct: null,
      existing_certifications: "",
      reason_for_proposing: "",
      previous_experience: "",
      technical_guidance_available: "",
      proposed_implementation_approach: "",
      similar_projects_visited: "",
    },
    serializePayload,
  });

  // useWatch (not form.watch) — reactive subscription that reliably re-renders
  // after form.reset() from server data. See use-dpr-section-form.ts notes.
  const engaged = useWatch({ control: form.control, name: "currently_engaged" });
  // RadioGroup uses string values; map to boolean
  const radioValue =
    engaged === true ? "yes" : engaged === false ? "no" : "";

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="baseline"
      loading={isLoading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
    >
      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-3">
            <Label>Is the FPO currently engaged in the proposed business activity?</Label>
            <RadioGroup
              value={radioValue}
              onValueChange={(v) => {
                const bool = v === "yes" ? true : v === "no" ? false : null;
                form.setValue("currently_engaged", bool, { shouldDirty: true });
                // Save immediately — the branch just changed, so the set of
                // required fields changed too. Readiness must recompute now,
                // not after the 5s autosave debounce.
                save();
              }}
              className="flex gap-6"
            >
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value="yes" />
                Yes — existing enterprise
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value="no" />
                No — new venture
              </label>
            </RadioGroup>
          </div>

          {engaged === true && (
            <div className="space-y-5 border-l-2 border-primary/30 pl-4">
              <FieldRow>
                <Field label="Existing product(s) / service(s) *" name="existing_products" errors={fieldErrors} warnings={fieldWarnings}>
                  <Textarea rows={2} {...form.register("existing_products")} />
                </Field>
                <Field label="Existing installed capacity *" name="existing_installed_capacity" errors={fieldErrors} warnings={fieldWarnings}>
                  <Input {...form.register("existing_installed_capacity")} />
                </Field>
              </FieldRow>
              <FieldRow>
                <Field label="Current annual production / business volume" name="current_annual_production" errors={fieldErrors} warnings={fieldWarnings}>
                  <Input {...form.register("current_annual_production")} />
                </Field>
                <Field label="Current annual turnover (₹)" name="current_annual_turnover" errors={fieldErrors} warnings={fieldWarnings}>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register("current_annual_turnover")}
                  />
                </Field>
              </FieldRow>
              <FieldRow>
                <Field label="Number of employees" name="num_employees" errors={fieldErrors} warnings={fieldWarnings}>
                  <Input type="number" min="0" {...form.register("num_employees")} />
                </Field>
                <Field label="Current capacity utilization (%)" name="current_capacity_utilization_pct" errors={fieldErrors} warnings={fieldWarnings}>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    {...form.register("current_capacity_utilization_pct")}
                  />
                </Field>
              </FieldRow>
              <Field label="Existing infrastructure available" name="existing_infrastructure" errors={fieldErrors} warnings={fieldWarnings}>
                <Textarea rows={2} {...form.register("existing_infrastructure")} />
              </Field>
              <Field label="Existing machinery available" name="existing_machinery" errors={fieldErrors} warnings={fieldWarnings}>
                <Textarea rows={2} {...form.register("existing_machinery")} />
              </Field>
              <Field label="Existing market coverage" name="existing_market_coverage" errors={fieldErrors} warnings={fieldWarnings}>
                <Textarea rows={2} {...form.register("existing_market_coverage")} />
              </Field>
              <Field label="Major challenges faced" name="major_challenges" errors={fieldErrors} warnings={fieldWarnings}>
                <Textarea rows={2} {...form.register("major_challenges")} />
              </Field>
              <Field label="Existing certifications (if any)" name="existing_certifications" errors={fieldErrors} warnings={fieldWarnings}>
                <Textarea rows={2} {...form.register("existing_certifications")} />
              </Field>
            </div>
          )}

          {engaged === false && (
            <div className="space-y-5 border-l-2 border-primary/30 pl-4">
              <Field label="Why is the FPO proposing this activity? *" name="reason_for_proposing" errors={fieldErrors} warnings={fieldWarnings}>
                <Textarea rows={3} {...form.register("reason_for_proposing")} />
              </Field>
              <Field label="Previous experience of the FPO or members" name="previous_experience" errors={fieldErrors} warnings={fieldWarnings}>
                <Textarea rows={2} {...form.register("previous_experience")} />
              </Field>
              <Field label="Technical guidance / support available" name="technical_guidance_available" errors={fieldErrors} warnings={fieldWarnings}>
                <Textarea rows={2} {...form.register("technical_guidance_available")} />
              </Field>
              <Field label="Proposed implementation approach" name="proposed_implementation_approach" errors={fieldErrors} warnings={fieldWarnings}>
                <Textarea rows={3} {...form.register("proposed_implementation_approach")} />
              </Field>
              <Field label="Similar projects visited (if any)" name="similar_projects_visited" errors={fieldErrors} warnings={fieldWarnings}>
                <Textarea rows={2} {...form.register("similar_projects_visited")} />
              </Field>
            </div>
          )}
        </CardContent>
      </Card>
    </SectionShell>
  );
}

// ── Local layout helpers (kept inline; will graduate to a shared file if used again) ──

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({
  label,
  name,
  errors,
  warnings,
  children,
}: {
  label: string;
  name?: string;
  errors?: Map<string, string>;
  warnings?: Map<string, string>;
  children: React.ReactNode;
}) {
  const hasErr = name && errors?.has(name);
  return (
    <div className="space-y-1.5">
      <Label className={hasErr ? "text-destructive" : undefined}>{label}</Label>
      {children}
      {name && errors && <FieldError name={name} errors={errors} warnings={warnings} />}
    </div>
  );
}
