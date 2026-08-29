"use client";

import { useQuery } from "@tanstack/react-query";
import { useWatch } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDprSectionForm } from "@/hooks/use-dpr-section-form";
import { dprMasterApi } from "@/lib/api/dpr-master";

import {
  ChoiceSelect,
  MasterSelect,
  ModalField,
  ModalRow,
  NestedListCard,
} from "./nested-list";
import { SectionShell } from "./section-shell";

const MGMT = [
  { value: "by_fpo", label: "Managed by FPO" },
  { value: "professional_ceo", label: "Managed by Professional CEO" },
  { value: "hired_manager", label: "Managed by Hired Manager" },
  { value: "outsourced", label: "Outsourced Management" },
  { value: "joint", label: "Joint Management" },
  { value: "other", label: "Others (Specify)" },
];
const EMPLOYMENT = [
  { value: "permanent", label: "Permanent" },
  { value: "contract", label: "Contract" },
  { value: "daily_wage", label: "Daily Wage" },
  { value: "seasonal", label: "Seasonal" },
  { value: "part_time", label: "Part-time" },
  { value: "outsourced", label: "Outsourced" },
];
const DEPARTMENTS = [
  { value: "administration", label: "Administration" },
  { value: "technical", label: "Technical" },
  { value: "production", label: "Production" },
  { value: "quality_control", label: "Quality Control" },
  { value: "warehouse", label: "Warehouse" },
  { value: "sales_marketing", label: "Sales & Marketing" },
  { value: "accounts_finance", label: "Accounts & Finance" },
  { value: "other", label: "Others (Specify)" },
];
const LABOUR_AVAIL = [
  { value: "easily", label: "Easily Available" },
  { value: "moderately", label: "Moderately Available" },
  { value: "seasonal", label: "Seasonal" },
  { value: "difficult", label: "Difficult to Obtain" },
];
const LABOUR_SOURCE = [
  { value: "local", label: "Local" },
  { value: "nearby_villages", label: "Nearby Villages" },
  { value: "other_districts", label: "Other Districts" },
  { value: "other_states", label: "Other States" },
  { value: "contract_labour", label: "Contract Labour" },
];
const WELFARE = [
  "staff_room", "toilets", "drinking_water", "safety_equipment",
  "rest_area", "dining_area", "uniforms", "health_insurance",
  "provident_fund", "esi", "transportation", "accommodation", "other",
].map((v) => ({ value: v, label: v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) }));
const STATUTORY = [
  { value: "epf", label: "EPF" },
  { value: "esi", label: "ESI" },
  { value: "labour_registration", label: "Labour Registration" },
  { value: "minimum_wages", label: "Minimum Wages" },
  { value: "contract_labour_lic", label: "Contract Labour Licence" },
  { value: "bonus_act", label: "Bonus Act" },
  { value: "gratuity", label: "Gratuity" },
  { value: "shops_establishments", label: "Shops & Establishments" },
  { value: "other", label: "Others (Specify)" },
];

const EmpSchema = z.object({
  id: z.number().optional(),
  order: z.number(),
  designation: z.string(),
  nature_of_work: z.string(),
  number_required: z.union([z.string(), z.number()]).nullable(),
  employment_type: z.string(),
  qualification: z.string(),
  experience_required: z.string(),
  monthly_salary: z.union([z.string(), z.number()]).nullable(),
  annual_salary: z.union([z.string(), z.number()]).nullable(),
  recruitment_stage: z.string(),
});
type Emp = z.infer<typeof EmpSchema>;

const DeptSchema = z.object({
  id: z.number().optional(),
  department: z.string(),
  department_other: z.string(),
  num_persons: z.union([z.string(), z.number()]).nullable(),
  annual_salary: z.union([z.string(), z.number()]).nullable(),
  remarks: z.string(),
});
type Dept = z.infer<typeof DeptSchema>;

const TrainSchema = z.object({
  id: z.number().optional(),
  training_area: z.number(),
  training_area_other: z.string(),
  duration: z.string(),
  training_provider: z.string().optional(),
  estimated_cost: z.union([z.string(), z.number()]).nullable().optional(),
});
type Train = z.infer<typeof TrainSchema>;

const Schema = z.object({
  project_head: z.string(),
  operational_management_model: z.string(),
  operational_management_other: z.string(),
  reporting_authority: z.string(),
  org_structure_description: z.string(),
  decision_making_authority: z.string(),

  has_existing_employees: z.boolean(),
  existing_employees_total: z.union([z.string(), z.number()]).nullable(),
  existing_technical_staff: z.union([z.string(), z.number()]).nullable(),
  existing_administrative_staff: z.union([z.string(), z.number()]).nullable(),
  existing_marketing_staff: z.union([z.string(), z.number()]).nullable(),
  existing_skilled_operators: z.union([z.string(), z.number()]).nullable(),
  existing_qualification_notes: z.string(),
  existing_experience_notes: z.string(),

  labour_availability: z.string(),
  primary_labour_source: z.string(),
  labour_remarks: z.string(),

  welfare_items: z.array(z.string()),
  welfare_other: z.string(),
  statutory_compliance: z.array(z.string()),
  statutory_compliance_other: z.string(),

  has_future_manpower_expansion: z.boolean(),
  expansion_year: z.union([z.string(), z.number()]).nullable(),
  additional_employees_planned: z.union([z.string(), z.number()]).nullable(),
  additional_technical_staff: z.union([z.string(), z.number()]).nullable(),
  additional_administrative_staff: z.union([z.string(), z.number()]).nullable(),
  additional_salary_requirement: z.union([z.string(), z.number()]).nullable(),

  employee_categories: z.array(EmpSchema),
  departments: z.array(DeptSchema),
  training_requirements: z.array(TrainSchema),
});
type Data = z.infer<typeof Schema>;

function toInt(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
function toDec(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? String(n) : null;
}

function serializePayload(v: Data): Record<string, unknown> {
  return {
    ...v,
    existing_employees_total: toInt(v.existing_employees_total),
    existing_technical_staff: toInt(v.existing_technical_staff),
    existing_administrative_staff: toInt(v.existing_administrative_staff),
    existing_marketing_staff: toInt(v.existing_marketing_staff),
    existing_skilled_operators: toInt(v.existing_skilled_operators),
    expansion_year: toInt(v.expansion_year),
    additional_employees_planned: toInt(v.additional_employees_planned),
    additional_technical_staff: toInt(v.additional_technical_staff),
    additional_administrative_staff: toInt(v.additional_administrative_staff),
    additional_salary_requirement: toDec(v.additional_salary_requirement),
    employee_categories: v.employee_categories.map((r, i) => ({
      ...r,
      order: i,
      number_required: toInt(r.number_required),
      monthly_salary: toDec(r.monthly_salary),
      annual_salary: toDec(r.annual_salary),
    })),
    departments: v.departments.map((r) => ({
      ...r,
      num_persons: toInt(r.num_persons),
      annual_salary: toDec(r.annual_salary),
    })),
    training_requirements: v.training_requirements.map((r) => ({
      ...r,
      estimated_cost: toDec(r.estimated_cost),
    })),
  };
}

export function HRSection({ uuid }: { uuid: string }) {
  const trainingAreaQuery = useQuery({
    queryKey: ["dpr-master", "training-areas"],
    queryFn: () => dprMasterApi.list("training-areas"),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, save, discard } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "hr",
    schema: Schema,
    defaultValues: {
      project_head: "", operational_management_model: "", operational_management_other: "",
      reporting_authority: "", org_structure_description: "", decision_making_authority: "",
      has_existing_employees: false,
      existing_employees_total: null, existing_technical_staff: null, existing_administrative_staff: null,
      existing_marketing_staff: null, existing_skilled_operators: null,
      existing_qualification_notes: "", existing_experience_notes: "",
      labour_availability: "", primary_labour_source: "", labour_remarks: "",
      welfare_items: [], welfare_other: "",
      statutory_compliance: [], statutory_compliance_other: "",
      has_future_manpower_expansion: false, expansion_year: null,
      additional_employees_planned: null, additional_technical_staff: null,
      additional_administrative_staff: null, additional_salary_requirement: null,
      employee_categories: [], departments: [], training_requirements: [],
    },
    serializePayload,
  });

  // useWatch — reactive subscriptions (form.watch is stale after form.reset).
  const employeeCategories = useWatch({ control: form.control, name: "employee_categories" }) ?? [];
  const departments = useWatch({ control: form.control, name: "departments" }) ?? [];
  const trainingRequirements = useWatch({ control: form.control, name: "training_requirements" }) ?? [];
  const welfareItems = useWatch({ control: form.control, name: "welfare_items" }) ?? [];
  const statutory = useWatch({ control: form.control, name: "statutory_compliance" }) ?? [];
  const hasExisting = useWatch({ control: form.control, name: "has_existing_employees" });
  const hasExpansion = useWatch({ control: form.control, name: "has_future_manpower_expansion" });
  const operationalMgmt = useWatch({ control: form.control, name: "operational_management_model" });
  const labourAvail = useWatch({ control: form.control, name: "labour_availability" });
  const labourSource = useWatch({ control: form.control, name: "primary_labour_source" });

  const toggleArrayField = (field: "welfare_items" | "statutory_compliance", code: string, checked: boolean) => {
    const cur = form.getValues(field) ?? [];
    form.setValue(field, checked ? [...cur, code] : cur.filter((c) => c !== code), { shouldDirty: true });
  };

  const loading = isLoading || trainingAreaQuery.isLoading;

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="hr"
      loading={loading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
    >
      <div className="space-y-4">
        {/* A. Management */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">A. Project Management Structure</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label className="text-xs">Project head / in-charge</Label><Input {...form.register("project_head")} /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Operational management model *</Label>
              <ChoiceSelect value={operationalMgmt ?? ""} options={MGMT} onChange={(v) => form.setValue("operational_management_model", v, { shouldDirty: true })} />
            </div>
          </div>
          {operationalMgmt === "other" && (
            <div className="space-y-1.5"><Label className="text-xs">Specify (Others)</Label><Input {...form.register("operational_management_other")} /></div>
          )}
          <div className="space-y-1.5"><Label className="text-xs">Reporting authority</Label><Input {...form.register("reporting_authority")} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Organisational structure for the project</Label><Textarea rows={2} {...form.register("org_structure_description")} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Decision-making authority</Label><Input {...form.register("decision_making_authority")} /></div>
        </CardContent></Card>

        {/* B. Employee Categories */}
        <NestedListCard<Emp>
          title="B. Manpower Requirement (per employee category)"
          items={employeeCategories}
          onChange={(next) => form.setValue("employee_categories", next, { shouldDirty: true })}
          emptyRow={{
            order: 0, designation: "", nature_of_work: "", number_required: null,
            employment_type: "", qualification: "", experience_required: "",
            monthly_salary: null, annual_salary: null, recruitment_stage: "",
          }}
          columns={[
            { key: "designation", label: "Designation" },
            { key: "number_required", label: "Count" },
            { key: "employment_type", label: "Type", render: (v) => EMPLOYMENT.find((o) => o.value === v)?.label ?? "—" },
            { key: "annual_salary", label: "Annual salary" },
          ]}
          isValid={(row) => row.designation.trim().length > 0 && row.number_required !== null && row.number_required !== ""}
          addLabel="Add category"
          editLabel="Edit category"
          renderModal={(row, set) => (
            <>
              <ModalRow>
                <ModalField label="Designation *"><Input value={row.designation} onChange={(e) => set("designation", e.target.value)} /></ModalField>
                <ModalField label="Number required *"><Input type="number" min="1" value={row.number_required ?? ""} onChange={(e) => set("number_required", e.target.value || null)} /></ModalField>
              </ModalRow>
              <ModalField label="Nature of work"><Input value={row.nature_of_work} onChange={(e) => set("nature_of_work", e.target.value)} /></ModalField>
              <ModalRow>
                <ModalField label="Employment type"><ChoiceSelect value={row.employment_type} options={EMPLOYMENT} onChange={(v) => set("employment_type", v)} /></ModalField>
                <ModalField label="Qualification"><Input value={row.qualification} onChange={(e) => set("qualification", e.target.value)} /></ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Experience required"><Input value={row.experience_required} onChange={(e) => set("experience_required", e.target.value)} /></ModalField>
                <ModalField label="Recruitment stage"><Input value={row.recruitment_stage} onChange={(e) => set("recruitment_stage", e.target.value)} /></ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Monthly salary (₹)"><Input type="number" step="0.01" value={row.monthly_salary ?? ""} onChange={(e) => set("monthly_salary", e.target.value || null)} /></ModalField>
                <ModalField label="Annual salary (₹)"><Input type="number" step="0.01" value={row.annual_salary ?? ""} onChange={(e) => set("annual_salary", e.target.value || null)} /></ModalField>
              </ModalRow>
            </>
          )}
        />

        {/* C. Departments */}
        <NestedListCard<Dept>
          title="C. Department-wise Staffing"
          items={departments}
          onChange={(next) => form.setValue("departments", next, { shouldDirty: true })}
          emptyRow={{ department: "", department_other: "", num_persons: null, annual_salary: null, remarks: "" }}
          columns={[
            { key: "department", label: "Department", render: (v) => DEPARTMENTS.find((o) => o.value === v)?.label ?? "—" },
            { key: "num_persons", label: "Persons" },
            { key: "annual_salary", label: "Annual salary" },
          ]}
          isValid={(row) => !!row.department}
          addLabel="Add department"
          editLabel="Edit department"
          renderModal={(row, set) => (
            <>
              <ModalField label="Department *">
                <ChoiceSelect value={row.department} options={DEPARTMENTS} onChange={(v) => set("department", v)} />
              </ModalField>
              {row.department === "other" && (
                <ModalField label="Specify"><Input value={row.department_other} onChange={(e) => set("department_other", e.target.value)} /></ModalField>
              )}
              <ModalRow>
                <ModalField label="Number of persons"><Input type="number" min="1" value={row.num_persons ?? ""} onChange={(e) => set("num_persons", e.target.value || null)} /></ModalField>
                <ModalField label="Annual salary"><Input type="number" step="0.01" value={row.annual_salary ?? ""} onChange={(e) => set("annual_salary", e.target.value || null)} /></ModalField>
              </ModalRow>
              <ModalField label="Remarks"><Textarea rows={2} value={row.remarks} onChange={(e) => set("remarks", e.target.value)} /></ModalField>
            </>
          )}
        />

        {/* D. Existing Employees */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">D. Existing Human Resources</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={hasExisting} onCheckedChange={(c) => form.setValue("has_existing_employees", !!c, { shouldDirty: true })} />
            FPO has existing employees
          </label>
          {hasExisting && (
            <div className="space-y-3 border-l-2 border-primary/30 pl-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {[["existing_employees_total","Existing employees"],["existing_technical_staff","Technical staff"],["existing_administrative_staff","Admin staff"],["existing_marketing_staff","Marketing staff"],["existing_skilled_operators","Skilled operators"]].map(([k,l]) => (
                  <div key={k} className="space-y-1.5">
                    <Label className="text-xs">{l}</Label>
                    <Input type="number" min="0" {...form.register(k as keyof Data)} />
                  </div>
                ))}
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Qualification notes</Label><Textarea rows={2} {...form.register("existing_qualification_notes")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Experience notes</Label><Textarea rows={2} {...form.register("existing_experience_notes")} /></div>
            </div>
          )}
        </CardContent></Card>

        {/* E. Training Requirements */}
        <NestedListCard<Train>
          title="E. Training Requirements"
          items={trainingRequirements}
          onChange={(next) => form.setValue("training_requirements", next, { shouldDirty: true })}
          emptyRow={{ training_area: 0, training_area_other: "", duration: "", training_provider: "", estimated_cost: null }}
          columns={[
            {
              key: "training_area",
              label: "Training area",
              render: (v) => (trainingAreaQuery.data?.find((r) => r.id === v)?.label as string) ?? "—",
            },
            { key: "duration", label: "Duration" },
            { key: "estimated_cost", label: "Est. cost" },
          ]}
          isValid={(row) => row.training_area > 0}
          addLabel="Add training"
          editLabel="Edit training"
          renderModal={(row, set) => (
            <>
              <ModalField label="Training area *">
                <MasterSelect
                  value={row.training_area === 0 ? null : row.training_area}
                  options={trainingAreaQuery.data ?? []}
                  onChange={(v) => set("training_area", (v ?? 0) as number)}
                />
              </ModalField>
              {trainingAreaQuery.data?.find((r) => r.id === row.training_area)?.code === "other" && (
                <ModalField label="Specify (Others)"><Input value={row.training_area_other} onChange={(e) => set("training_area_other", e.target.value)} /></ModalField>
              )}
              <ModalRow>
                <ModalField label="Duration"><Input value={row.duration} onChange={(e) => set("duration", e.target.value)} /></ModalField>
                <ModalField label="Training provider"><Input value={row.training_provider ?? ""} onChange={(e) => set("training_provider", e.target.value)} /></ModalField>
              </ModalRow>
              <ModalField label="Estimated cost (₹)"><Input type="number" step="0.01" min="0" value={row.estimated_cost ?? ""} onChange={(e) => set("estimated_cost", e.target.value || null)} /></ModalField>
            </>
          )}
        />

        {/* F. Labour Availability */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">F. Labour Availability</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label className="text-xs">Availability</Label><ChoiceSelect value={labourAvail ?? ""} options={LABOUR_AVAIL} onChange={(v) => form.setValue("labour_availability", v, { shouldDirty: true })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Primary source</Label><ChoiceSelect value={labourSource ?? ""} options={LABOUR_SOURCE} onChange={(v) => form.setValue("primary_labour_source", v, { shouldDirty: true })} /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Remarks</Label><Textarea rows={2} {...form.register("labour_remarks")} /></div>
        </CardContent></Card>

        {/* G. Welfare */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">G. Employee Welfare</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {WELFARE.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={welfareItems.includes(o.value)} onCheckedChange={(c) => toggleArrayField("welfare_items", o.value, !!c)} />
                {o.label}
              </label>
            ))}
          </div>
          {welfareItems.includes("other") && (
            <div className="space-y-1.5"><Label className="text-xs">Specify (Others)</Label><Input {...form.register("welfare_other")} /></div>
          )}
        </CardContent></Card>

        {/* H. Statutory Compliance */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">H. Statutory Compliance</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {STATUTORY.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={statutory.includes(o.value)} onCheckedChange={(c) => toggleArrayField("statutory_compliance", o.value, !!c)} />
                {o.label}
              </label>
            ))}
          </div>
          {statutory.includes("other") && (
            <div className="space-y-1.5"><Label className="text-xs">Specify (Others)</Label><Input {...form.register("statutory_compliance_other")} /></div>
          )}
        </CardContent></Card>

        {/* I. Future Expansion */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">I. Future Manpower Expansion</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={hasExpansion} onCheckedChange={(c) => form.setValue("has_future_manpower_expansion", !!c, { shouldDirty: true })} />
            Additional manpower planned
          </label>
          {hasExpansion && (
            <div className="grid gap-3 border-l-2 border-primary/30 pl-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label className="text-xs">Expansion year</Label><Input type="number" {...form.register("expansion_year")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Additional employees</Label><Input type="number" min="0" {...form.register("additional_employees_planned")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Additional technical</Label><Input type="number" min="0" {...form.register("additional_technical_staff")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Additional admin</Label><Input type="number" min="0" {...form.register("additional_administrative_staff")} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Additional salary requirement (₹)</Label><Input type="number" step="0.01" {...form.register("additional_salary_requirement")} /></div>
            </div>
          )}
        </CardContent></Card>
      </div>
    </SectionShell>
  );
}
