"use client";

import { useQuery } from "@tanstack/react-query";
import { useWatch } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";

import { useDprSectionForm } from "@/hooks/use-dpr-section-form";
import { dprMasterApi } from "@/lib/api/dpr-master";

import { CountedTextarea } from "./counted-textarea";
import { normaliseDecimalInput, normaliseIntegerInput } from "./dpr-input-normalisers";
import { LabelWithBadge } from "./label-with-badge";
import {
  MasterSearchableSelect,
  ModalField,
  ModalRow,
  NestedListCard,
} from "./nested-list";
import { SectionHelp } from "./section-help";
import { SectionShell } from "./section-shell";

// ── Input caps — mirror backend DPRSectionHR + child tables ──
const MAX_TEXT_CHARS = 200;              // most CharField widths
const MAX_PURPOSE_CHARS = 500;           // nature_of_work CharField(500)
const MAX_LONG_TEXT_CHARS = 2000;        // TextField defensive cap
const MAX_OTHER_TEXT_CHARS = 200;        // *_other companions
const MAX_REPORTING_CHARS = 300;         // reporting_authority + decision_making_authority CharField(300)
const MAX_DURATION_CHARS = 100;          // training duration CharField(100)
// Salary — Decimal(15,2) for annual, Decimal(12,2) for monthly. ₹1000 cr soft cap.
const MAX_COST_INR = 10_000_000_000;
// Headcount — realistic 1 → 100 000 (an FPO with 100k employees is unheard of).
const MAX_HEADCOUNT = 100_000;
// Expansion year — future 1-15 years from current year.
const CURRENT_YEAR = new Date().getFullYear();
const MIN_EXPANSION_YEAR = CURRENT_YEAR;
const MAX_EXPANSION_YEAR = CURRENT_YEAR + 15;

// ── Choices ────────────────────────────────────────────────────────────────

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

// ── Schemas ────────────────────────────────────────────────────────────────

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
  training_area: z.number().nullable(),
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

// ── Utilities ──────────────────────────────────────────────────────────────

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

// ── Per-row validators (mirror hr_validators.py) ──────────────────────

type EmpErrors = Partial<Record<"designation" | "number_required", string>>;
function validateEmployee(row: Emp): EmpErrors {
  const e: EmpErrors = {};
  if (!(row.designation ?? "").trim()) {
    e.designation = "Designation is required.";
  }
  const num = row.number_required;
  const numNum = num !== null && num !== undefined && num !== "" ? Number(num) : null;
  if (numNum === null || !Number.isFinite(numNum) || numNum <= 0) {
    e.number_required = "Number of employees shall be greater than zero.";
  }
  return e;
}

type DeptErrors = Partial<Record<"department" | "department_other", string>>;
function validateDepartment(row: Dept): DeptErrors {
  const e: DeptErrors = {};
  if (!row.department) {
    e.department = "Department is required.";
  }
  if (row.department === "other" && !(row.department_other ?? "").trim()) {
    e.department_other = 'Please specify — "Others" was selected for department.';
  }
  return e;
}

type TrainErrors = Partial<Record<"training_area", string>>;
function validateTraining(row: Train): TrainErrors {
  const e: TrainErrors = {};
  if (!row.training_area) e.training_area = "Training area is required.";
  return e;
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

// ── Section component ─────────────────────────────────────────────────────

export function HRSection({ uuid }: { uuid: string }) {
  const trainingAreaQuery = useQuery({
    queryKey: ["dpr-master", "training-areas"],
    queryFn: () => dprMasterApi.list("training-areas"),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, fieldErrors, fieldWarnings, save, discard } = useDprSectionForm<Data>({
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
  const operationalMgmtOther = useWatch({ control: form.control, name: "operational_management_other" }) ?? "";
  const labourAvail = useWatch({ control: form.control, name: "labour_availability" });
  const labourSource = useWatch({ control: form.control, name: "primary_labour_source" });

  // Section-level text/textarea watched values.
  const projectHead = useWatch({ control: form.control, name: "project_head" }) ?? "";
  const reportingAuthority = useWatch({ control: form.control, name: "reporting_authority" }) ?? "";
  const orgStructure = useWatch({ control: form.control, name: "org_structure_description" }) ?? "";
  const decisionMaking = useWatch({ control: form.control, name: "decision_making_authority" }) ?? "";
  const existingQualificationNotes = useWatch({ control: form.control, name: "existing_qualification_notes" }) ?? "";
  const existingExperienceNotes = useWatch({ control: form.control, name: "existing_experience_notes" }) ?? "";
  const labourRemarks = useWatch({ control: form.control, name: "labour_remarks" }) ?? "";
  const welfareOther = useWatch({ control: form.control, name: "welfare_other" }) ?? "";
  const statutoryComplianceOther = useWatch({ control: form.control, name: "statutory_compliance_other" }) ?? "";

  // D + I integer counts + I decimal salary watched.
  const existingEmployeesTotal = useWatch({ control: form.control, name: "existing_employees_total" });
  const existingTechnicalStaff = useWatch({ control: form.control, name: "existing_technical_staff" });
  const existingAdminStaff = useWatch({ control: form.control, name: "existing_administrative_staff" });
  const existingMarketingStaff = useWatch({ control: form.control, name: "existing_marketing_staff" });
  const existingSkilledOps = useWatch({ control: form.control, name: "existing_skilled_operators" });
  const expansionYear = useWatch({ control: form.control, name: "expansion_year" });
  const additionalEmployees = useWatch({ control: form.control, name: "additional_employees_planned" });
  const additionalTechnical = useWatch({ control: form.control, name: "additional_technical_staff" });
  const additionalAdmin = useWatch({ control: form.control, name: "additional_administrative_staff" });
  const additionalSalary = useWatch({ control: form.control, name: "additional_salary_requirement" });

  // Convenience setter — always includes shouldDirty: true.
  const setField = <K extends keyof Data>(name: K, value: Data[K]) =>
    form.setValue(name as never, value as never, { shouldDirty: true });

  const toggleArrayField = (field: "welfare_items" | "statutory_compliance", code: string, checked: boolean) => {
    const cur = form.getValues(field) ?? [];
    setField(field, checked ? [...cur, code] : cur.filter((c) => c !== code));
  };

  // Section-level live errors — mirror hr_validators.py.
  // Fields listed here have a FE rule that owns the truth: the FE re-checks
  // on every keystroke, whereas fieldErrors from `/readiness/` only refreshes
  // AFTER a successful save + refetch. Preferring the stale backend error
  // would leave a red message on-screen for the ~5s autosave gap after the
  // user has already fixed the field. So for these keys, we trust liveErrors
  // (undefined = fixed = no error) and let backend errors surface only for
  // fields the FE does NOT re-check locally.
  const LIVE_CHECKED = new Set<string>([
    "operational_management_model",
    "operational_management_other",
    "welfare_other",
    "statutory_compliance_other",
  ]);
  const liveErrors: Record<string, string | undefined> = {};
  if (!operationalMgmt) {
    liveErrors.operational_management_model = "Operational Management Model shall be specified.";
  }
  if (operationalMgmt === "other" && !String(operationalMgmtOther).trim()) {
    liveErrors.operational_management_other = 'Please specify — "Others" was selected for management model.';
  }
  if (welfareItems.includes("other") && !String(welfareOther).trim()) {
    liveErrors.welfare_other = 'Please specify — "Others" in employee welfare.';
  }
  if (statutory.includes("other") && !String(statutoryComplianceOther).trim()) {
    liveErrors.statutory_compliance_other = 'Please specify — "Others" in statutory compliance.';
  }
  const err = (name: string): string | undefined =>
    LIVE_CHECKED.has(name) ? liveErrors[name] : fieldErrors.get(name);

  const loading = isLoading || trainingAreaQuery.isLoading;

  // Reusable text-input helper — shortens the JSX for D-card count fields.
  const intCountInput = (
    watchedValue: string | number | null | undefined,
    key: keyof Data,
    label: string,
    placeholder = "e.g. 1",
  ) => (
    <div className="space-y-1.5">
      <LabelWithBadge uuid={uuid} section="hr" field={String(key)} className="text-xs">
        {label}
      </LabelWithBadge>
      <Input
        type="text"
        inputMode="numeric"
        maxLength={6}
        placeholder={placeholder}
        value={watchedValue !== null && watchedValue !== undefined ? String(watchedValue) : ""}
        onChange={(e) => {
          const cleaned = normaliseIntegerInput(e.target.value, { max: MAX_HEADCOUNT, min: 0 });
          setField(key, (cleaned === "" ? null : cleaned) as Data[keyof Data]);
        }}
      />
    </div>
  );

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
      help={
        <SectionHelp
          title="Human Resources & Organisational Structure"
          purpose="Capture the human-resources picture — management model, per-designation manpower requirement, department-wise staffing, existing employees, training plan, labour availability, employee welfare, statutory compliance, and future manpower expansion. This section feeds the HR chapter of the DPR PDF and drives the salaries + training lines in Operating Cost."
          whatToFill={[
            "A — Project Management (required — Cat A operational_management_model must be picked). FPO-managed / professional CEO / hired manager / outsourced / joint / others. 'Others' reveals specify. Project head, reporting authority, org structure, decision-making authority all optional.",
            "B — Manpower Requirement (add ≥ 1 row per designation). Required per row: designation + count > 0. Optional: nature of work, employment type (permanent/contract/daily/seasonal/part-time/outsourced), qualification, experience, monthly/annual salary, recruitment stage.",
            "C — Department-wise Staffing (add rows per department). Department dropdown (8 options); 'Others' reveals specify field (required per KAU spec). Persons + annual salary + remarks optional. DB enforces unique-per-department — you can't add 'Production' twice.",
            "D — Existing Human Resources (optional). Tick 'FPO has existing employees' to reveal 5 count fields + 2 note textareas. All optional.",
            "E — Training Requirements (add rows for planned training). Training area FK (from master data) required per row. 'Others' reveals specify. Duration, provider, estimated cost all optional. DB enforces unique-per-training-area.",
            "F — Labour Availability (optional). Availability + primary source dropdowns + free-text remarks.",
            "G — Employee Welfare (multi-select 13 items). Tick what the project will provide — staff room, toilets, drinking water, safety kit, uniforms, ESI, PF, etc. 'Others' reveals specify.",
            "H — Statutory Compliance (multi-select 9 items). Tick what applies — EPF, ESI, minimum wages, shops registration, contract labour licence, etc. 'Others' reveals specify.",
            "I — Future Manpower Expansion (optional). Tick 'Additional manpower planned' to reveal expansion year + 4 count fields + salary requirement.",
          ]}
          tips={[
            "Operational management model is the only truly mandatory field on this page. Everything else is 'strongly recommended but not blocking' per KAU spec.",
            "Employee categories should map to real roles you'll hire — Plant Manager, Operator, QC Tech, Admin, etc. A 5-person coconut-oil unit typically has 4–5 rows. Number must be > 0 per row.",
            "Cover EPF + ESI + Minimum Wages + Shops & Establishments as a minimum for statutory compliance — anything less flags a compliance risk to bankers.",
            "Welfare + Statutory checklist are quick tick-boxes. Overshoot rather than undershoot — even simple projects benefit from documenting first aid + safety kit + uniforms.",
            "Salaries feed the Operating Cost. Monthly × 12 = Annual should match; if they don't, the AI narrative will call it out.",
            "Training rows connect back to the Machinery section (Cat F — operator training). If Machinery section marks 'Training required = Yes' but HR has no training row, readiness will nudge you.",
          ]}
          downstream={[
            "HR chapter in the DPR PDF — full A-I profile renders there",
            "Operating Cost — sum(annual_salary) across employee categories + training costs feed the annual opex line",
            "Compliance chapter — statutory compliance items surface as action items",
            "Investment section — training costs feed the pre-operative expenses line",
            "Risk Analysis chapter — labour availability = 'Difficult' flags as a project risk",
            "AI narrative — management model + labour availability + welfare feed the HR paragraph",
          ]}
        />
      }
    >
      <div className="space-y-4">
        {/* A. Management */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">A. Project Management Structure</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Project head / in-charge</Label>
              <Input
                value={projectHead as string}
                maxLength={MAX_TEXT_CHARS}
                onChange={(e) => setField("project_head", e.target.value.slice(0, MAX_TEXT_CHARS))}
              />
            </div>
            <div id="dpr-field-operational_management_model" className="space-y-1.5">
              <LabelWithBadge uuid={uuid} section="hr" field="operational_management_model" className={err("operational_management_model") ? "text-xs text-destructive" : "text-xs"}>
                Operational management model *
              </LabelWithBadge>
              <SearchableSelect
                value={operationalMgmt ?? ""}
                options={MGMT}
                onChange={(v: string) => setField("operational_management_model", v)}
                placeholder="Type to search…"
              />
              {err("operational_management_model") && (
                <p className="text-xs text-destructive">{err("operational_management_model")}</p>
              )}
            </div>
          </div>
          {operationalMgmt === "other" && (
            <div id="dpr-field-operational_management_other" className="space-y-1.5">
              <Label className={err("operational_management_other") ? "text-xs text-destructive" : "text-xs"}>
                Please specify (Others) *
              </Label>
              <Input
                value={operationalMgmtOther as string}
                maxLength={MAX_OTHER_TEXT_CHARS}
                onChange={(e) => setField("operational_management_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
              />
              {err("operational_management_other") && (
                <p className="text-xs text-destructive">{err("operational_management_other")}</p>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Reporting authority</Label>
            <Input
              value={reportingAuthority as string}
              maxLength={MAX_REPORTING_CHARS}
              onChange={(e) => setField("reporting_authority", e.target.value.slice(0, MAX_REPORTING_CHARS))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Organisational structure for the project</Label>
            <CountedTextarea
              rows={2}
              maxChars={MAX_LONG_TEXT_CHARS}
              value={orgStructure as string}
              onChange={(v) => setField("org_structure_description", v)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Decision-making authority</Label>
            <Input
              value={decisionMaking as string}
              maxLength={MAX_REPORTING_CHARS}
              onChange={(e) => setField("decision_making_authority", e.target.value.slice(0, MAX_REPORTING_CHARS))}
            />
          </div>
        </CardContent></Card>

        {/* B. Employee Categories — id enables readiness-panel deep-link scroll */}
        <div id="dpr-field-employee_categories" />
        <NestedListCard<Emp>
          title="B. Manpower Requirement (per employee category)"
          items={employeeCategories}
          onChange={(next) => form.setValue("employee_categories", next, { shouldDirty: true })}
          warning={fieldWarnings.get("employee_categories")}
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
          isValid={(row) => Object.keys(validateEmployee(row)).length === 0}
          addLabel="Add category"
          editLabel="Edit category"
          renderModal={(row, set) => {
            const eErr = validateEmployee(row);
            return (
              <>
                <ModalRow>
                  <ModalField label="Designation *" error={eErr.designation}>
                    <Input
                      value={row.designation}
                      maxLength={MAX_TEXT_CHARS}
                      onChange={(e) => set("designation", e.target.value.slice(0, MAX_TEXT_CHARS))}
                    />
                  </ModalField>
                  <ModalField label="Number required *" error={eErr.number_required}>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="e.g. 1"
                      value={row.number_required !== null && row.number_required !== undefined ? String(row.number_required) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseIntegerInput(e.target.value, { max: MAX_HEADCOUNT, min: 1 });
                        set("number_required", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                </ModalRow>
                <ModalField label="Nature of work">
                  <Input
                    value={row.nature_of_work}
                    maxLength={MAX_PURPOSE_CHARS}
                    onChange={(e) => set("nature_of_work", e.target.value.slice(0, MAX_PURPOSE_CHARS))}
                  />
                </ModalField>
                <ModalRow>
                  <ModalField label="Employment type">
                    <SearchableSelect
                      value={row.employment_type}
                      options={EMPLOYMENT}
                      onChange={(v: string) => set("employment_type", v)}
                      placeholder="Type to search…"
                    />
                  </ModalField>
                  <ModalField label="Qualification">
                    <Input
                      value={row.qualification}
                      maxLength={MAX_TEXT_CHARS}
                      onChange={(e) => set("qualification", e.target.value.slice(0, MAX_TEXT_CHARS))}
                    />
                  </ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Experience required">
                    <Input
                      value={row.experience_required}
                      maxLength={MAX_TEXT_CHARS}
                      onChange={(e) => set("experience_required", e.target.value.slice(0, MAX_TEXT_CHARS))}
                    />
                  </ModalField>
                  <ModalField label="Recruitment stage">
                    <Input
                      value={row.recruitment_stage}
                      maxLength={MAX_TEXT_CHARS}
                      onChange={(e) => set("recruitment_stage", e.target.value.slice(0, MAX_TEXT_CHARS))}
                    />
                  </ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Monthly salary (₹)">
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={14}
                      placeholder="e.g. 18000"
                      value={row.monthly_salary !== null && row.monthly_salary !== undefined ? String(row.monthly_salary) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_COST_INR, maxDecimals: 2 });
                        set("monthly_salary", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                  <ModalField label="Annual salary (₹)">
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={16}
                      placeholder="e.g. 216000"
                      value={row.annual_salary !== null && row.annual_salary !== undefined ? String(row.annual_salary) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_COST_INR, maxDecimals: 2 });
                        set("annual_salary", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                </ModalRow>
              </>
            );
          }}
        />

        {/* C. Departments */}
        <div id="dpr-field-departments" />
        <NestedListCard<Dept>
          title="C. Department-wise Staffing"
          items={departments}
          onChange={(next) => form.setValue("departments", next, { shouldDirty: true })}
          warning={fieldWarnings.get("departments")}
          emptyRow={{ department: "", department_other: "", num_persons: null, annual_salary: null, remarks: "" }}
          columns={[
            { key: "department", label: "Department", render: (v) => DEPARTMENTS.find((o) => o.value === v)?.label ?? "—" },
            { key: "num_persons", label: "Persons" },
            { key: "annual_salary", label: "Annual salary" },
          ]}
          isValid={(row) => Object.keys(validateDepartment(row)).length === 0}
          addLabel="Add department"
          editLabel="Edit department"
          renderModal={(row, set) => {
            const dErr = validateDepartment(row);
            return (
              <>
                <ModalField label="Department *" error={dErr.department}>
                  <SearchableSelect
                    value={row.department}
                    options={DEPARTMENTS}
                    onChange={(v: string) => set("department", v)}
                    placeholder="Type to search department…"
                  />
                </ModalField>
                {row.department === "other" && (
                  <ModalField label="Please specify (Others) *" error={dErr.department_other}>
                    <Input
                      value={row.department_other}
                      maxLength={MAX_OTHER_TEXT_CHARS}
                      onChange={(e) => set("department_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
                    />
                  </ModalField>
                )}
                <ModalRow>
                  <ModalField label="Number of persons">
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="e.g. 3"
                      value={row.num_persons !== null && row.num_persons !== undefined ? String(row.num_persons) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseIntegerInput(e.target.value, { max: MAX_HEADCOUNT, min: 1 });
                        set("num_persons", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                  <ModalField label="Annual salary (₹)">
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={16}
                      placeholder="e.g. 500000"
                      value={row.annual_salary !== null && row.annual_salary !== undefined ? String(row.annual_salary) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_COST_INR, maxDecimals: 2 });
                        set("annual_salary", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                </ModalRow>
                <ModalField label="Remarks">
                  <CountedTextarea
                    rows={2}
                    maxChars={MAX_LONG_TEXT_CHARS}
                    value={row.remarks}
                    onChange={(v) => set("remarks", v)}
                  />
                </ModalField>
              </>
            );
          }}
        />

        {/* D. Existing Employees */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">D. Existing Human Resources</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={hasExisting} onCheckedChange={(c) => setField("has_existing_employees", !!c)} />
            FPO has existing employees
          </label>
          {hasExisting && (
            <div className="space-y-3 border-l-2 border-primary/30 pl-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {intCountInput(existingEmployeesTotal, "existing_employees_total", "Existing employees")}
                {intCountInput(existingTechnicalStaff, "existing_technical_staff", "Technical staff")}
                {intCountInput(existingAdminStaff, "existing_administrative_staff", "Admin staff")}
                {intCountInput(existingMarketingStaff, "existing_marketing_staff", "Marketing staff")}
                {intCountInput(existingSkilledOps, "existing_skilled_operators", "Skilled operators")}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Qualification notes</Label>
                <CountedTextarea
                  rows={2}
                  maxChars={MAX_LONG_TEXT_CHARS}
                  value={existingQualificationNotes as string}
                  onChange={(v) => setField("existing_qualification_notes", v)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Experience notes</Label>
                <CountedTextarea
                  rows={2}
                  maxChars={MAX_LONG_TEXT_CHARS}
                  value={existingExperienceNotes as string}
                  onChange={(v) => setField("existing_experience_notes", v)}
                />
              </div>
            </div>
          )}
        </CardContent></Card>

        {/* E. Training Requirements */}
        <NestedListCard<Train>
          title="E. Training Requirements"
          items={trainingRequirements}
          onChange={(next) => form.setValue("training_requirements", next, { shouldDirty: true })}
          warning={fieldWarnings.get("training_requirements")}
          emptyRow={{ training_area: null, training_area_other: "", duration: "", training_provider: "", estimated_cost: null }}
          columns={[
            {
              key: "training_area",
              label: "Training area",
              render: (v) => (trainingAreaQuery.data?.find((r) => r.id === v)?.label as string) ?? "—",
            },
            { key: "duration", label: "Duration" },
            { key: "estimated_cost", label: "Est. cost" },
          ]}
          isValid={(row) => Object.keys(validateTraining(row)).length === 0}
          addLabel="Add training"
          editLabel="Edit training"
          renderModal={(row, set) => {
            const tErr = validateTraining(row);
            const isOtherArea = trainingAreaQuery.data?.find((r) => r.id === row.training_area)?.code === "other";
            return (
              <>
                <ModalField label="Training area *" error={tErr.training_area}>
                  <MasterSearchableSelect
                    value={row.training_area}
                    options={trainingAreaQuery.data ?? []}
                    onChange={(v) => set("training_area", v)}
                    placeholder="Type to search training area…"
                  />
                </ModalField>
                {isOtherArea && (
                  <ModalField label="Please specify (Others)">
                    <Input
                      value={row.training_area_other}
                      maxLength={MAX_OTHER_TEXT_CHARS}
                      onChange={(e) => set("training_area_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
                    />
                  </ModalField>
                )}
                <ModalRow>
                  <ModalField label="Duration">
                    <Input
                      value={row.duration}
                      maxLength={MAX_DURATION_CHARS}
                      placeholder="e.g. 3 days"
                      onChange={(e) => set("duration", e.target.value.slice(0, MAX_DURATION_CHARS))}
                    />
                  </ModalField>
                  <ModalField label="Training provider">
                    <Input
                      value={row.training_provider ?? ""}
                      maxLength={MAX_TEXT_CHARS}
                      onChange={(e) => set("training_provider", e.target.value.slice(0, MAX_TEXT_CHARS))}
                    />
                  </ModalField>
                </ModalRow>
                <ModalField label="Estimated cost (₹)">
                  <Input
                    type="text"
                    inputMode="decimal"
                    maxLength={16}
                    placeholder="e.g. 25000"
                    value={row.estimated_cost !== null && row.estimated_cost !== undefined ? String(row.estimated_cost) : ""}
                    onChange={(e) => {
                      const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_COST_INR, maxDecimals: 2 });
                      set("estimated_cost", cleaned === "" ? null : cleaned);
                    }}
                  />
                </ModalField>
              </>
            );
          }}
        />

        {/* F. Labour Availability */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">F. Labour Availability</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Availability</Label>
              <SearchableSelect
                value={labourAvail ?? ""}
                options={LABOUR_AVAIL}
                onChange={(v: string) => setField("labour_availability", v)}
                placeholder="Type to search…"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Primary source</Label>
              <SearchableSelect
                value={labourSource ?? ""}
                options={LABOUR_SOURCE}
                onChange={(v: string) => setField("primary_labour_source", v)}
                placeholder="Type to search…"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Remarks</Label>
            <CountedTextarea
              rows={2}
              maxChars={MAX_LONG_TEXT_CHARS}
              value={labourRemarks as string}
              onChange={(v) => setField("labour_remarks", v)}
            />
          </div>
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
            <div id="dpr-field-welfare_other" className="space-y-1.5">
              <Label className={err("welfare_other") ? "text-xs text-destructive" : "text-xs"}>
                Please specify (Others) *
              </Label>
              <Input
                value={welfareOther as string}
                maxLength={MAX_OTHER_TEXT_CHARS}
                onChange={(e) => setField("welfare_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
              />
              {err("welfare_other") && (
                <p className="text-xs text-destructive">{err("welfare_other")}</p>
              )}
            </div>
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
            <div id="dpr-field-statutory_compliance_other" className="space-y-1.5">
              <Label className={err("statutory_compliance_other") ? "text-xs text-destructive" : "text-xs"}>
                Please specify (Others) *
              </Label>
              <Input
                value={statutoryComplianceOther as string}
                maxLength={MAX_OTHER_TEXT_CHARS}
                onChange={(e) => setField("statutory_compliance_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
              />
              {err("statutory_compliance_other") && (
                <p className="text-xs text-destructive">{err("statutory_compliance_other")}</p>
              )}
            </div>
          )}
        </CardContent></Card>

        {/* I. Future Expansion */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">I. Future Manpower Expansion</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={hasExpansion} onCheckedChange={(c) => setField("has_future_manpower_expansion", !!c)} />
            Additional manpower planned
          </label>
          {hasExpansion && (
            <div className="grid gap-3 border-l-2 border-primary/30 pl-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <LabelWithBadge uuid={uuid} section="hr" field="expansion_year" className="text-xs">
                  Expansion year
                </LabelWithBadge>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder={`e.g. ${CURRENT_YEAR + 2}`}
                  value={expansionYear !== null && expansionYear !== undefined ? String(expansionYear) : ""}
                  onChange={(e) => {
                    const cleaned = normaliseIntegerInput(e.target.value, { max: MAX_EXPANSION_YEAR, min: MIN_EXPANSION_YEAR });
                    setField("expansion_year", (cleaned === "" ? null : cleaned) as Data["expansion_year"]);
                  }}
                />
              </div>
              {intCountInput(additionalEmployees, "additional_employees_planned", "Additional employees")}
              {intCountInput(additionalTechnical, "additional_technical_staff", "Additional technical")}
              {intCountInput(additionalAdmin, "additional_administrative_staff", "Additional admin")}
              <div className="space-y-1.5 sm:col-span-2">
                <LabelWithBadge uuid={uuid} section="hr" field="additional_salary_requirement" className="text-xs">
                  Additional salary requirement (₹)
                </LabelWithBadge>
                <Input
                  type="text"
                  inputMode="decimal"
                  maxLength={16}
                  placeholder="e.g. 600000"
                  value={additionalSalary !== null && additionalSalary !== undefined ? String(additionalSalary) : ""}
                  onChange={(e) => {
                    const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_COST_INR, maxDecimals: 2 });
                    setField("additional_salary_requirement", (cleaned === "" ? null : cleaned) as Data["additional_salary_requirement"]);
                  }}
                />
              </div>
            </div>
          )}
        </CardContent></Card>
      </div>
    </SectionShell>
  );
}
