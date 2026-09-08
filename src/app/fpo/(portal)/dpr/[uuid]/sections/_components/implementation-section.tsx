"use client";

import { useWatch } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";

import { useDprSectionForm } from "@/hooks/use-dpr-section-form";

import { CountedTextarea } from "./counted-textarea";
import { normaliseIntegerInput } from "./dpr-input-normalisers";
import {
  ModalField,
  ModalRow,
  NestedListCard,
} from "./nested-list";
import { SectionHelp } from "./section-help";
import { SectionShell } from "./section-shell";

// ── Input caps — mirror backend DPRSectionImplementation + child tables ──
const MAX_LONG_CHARS = 300;              // activity_name, supplier_finalisation_method, monitoring_authority, responsible_person
const MAX_TEXT_CHARS = 200;              // *_other companions
const MAX_SHORT_CHARS = 100;             // estimated_duration, expected_procurement_period
const MAX_LONG_TEXT_CHARS = 2000;        // TextField defensive cap
const MAX_QUOTATIONS = 50;               // realistic upper bound

const PROCUREMENT = [
  { value: "direct_purchase", label: "Direct Purchase" },
  { value: "tender", label: "Tender" },
  { value: "quotation", label: "Quotation-based" },
  { value: "rate_contract", label: "Rate Contract" },
  { value: "empanelled", label: "Empanelled Supplier" },
  { value: "other", label: "Others (Specify)" },
];
const AGENCIES = [
  { value: "fpo_board", label: "FPO Board" },
  { value: "ceo", label: "CEO" },
  { value: "project_manager", label: "Project Manager" },
  { value: "consultant", label: "Consultant" },
  { value: "contractor", label: "Contractor" },
  { value: "machinery_supplier", label: "Machinery Supplier" },
  { value: "government_dept", label: "Government Department" },
  { value: "bank", label: "Bank" },
  { value: "other", label: "Other Agencies (Specify)" },
];
const MILESTONE_TYPES = [
  { value: "financial_closure", label: "Financial Closure" },
  { value: "civil_completion", label: "Civil Work Completion" },
  { value: "machinery_install", label: "Machinery Installation" },
  { value: "trial_production", label: "Trial Production" },
  { value: "commercial_production", label: "Commercial Production" },
  { value: "first_sale", label: "First Sale" },
  { value: "break_even", label: "Break-even Achievement" },
  { value: "other", label: "Others (Specify)" },
];
const FREQUENCY = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

const ActivitySchema = z.object({
  id: z.number().optional(),
  order: z.number(),
  activity_name: z.string(),
  proposed_start_date: z.string().nullable(),
  proposed_completion_date: z.string().nullable(),
  estimated_duration: z.string(),
  responsible_person_or_agency: z.string(),
});
type Activity = z.infer<typeof ActivitySchema>;

const MilestoneSchema = z.object({
  id: z.number().optional(),
  order: z.number(),
  milestone_type: z.string(),
  milestone_type_other: z.string(),
  expected_date: z.string().nullable(),
  remarks: z.string(),
});
type Milestone = z.infer<typeof MilestoneSchema>;

const Schema = z.object({
  procurement_method: z.string(),
  procurement_method_other: z.string(),
  tender_required: z.boolean().nullable(),
  num_quotations_proposed: z.union([z.string(), z.number()]).nullable(),
  supplier_finalisation_method: z.string(),
  expected_procurement_period: z.string(),
  responsibility_agencies: z.array(z.string()),
  responsibility_agency_other: z.string(),
  responsibility_remarks: z.string(),
  monitoring_frequency: z.string(),
  monitoring_authority: z.string(),
  reporting_mechanism: z.string(),
  corrective_action_process: z.string(),
  activities: z.array(ActivitySchema),
  milestones: z.array(MilestoneSchema),
});
type Data = z.infer<typeof Schema>;

// ── Per-row validators (mirror implementation_validators.py) ──

type ActivityErrors = Partial<Record<"activity_name" | "proposed_start_date", string>>;
function validateActivity(row: Activity): ActivityErrors {
  const e: ActivityErrors = {};
  if (!(row.activity_name ?? "").trim()) {
    e.activity_name = "Activity name is required.";
  }
  if (row.proposed_start_date && row.proposed_completion_date) {
    if (row.proposed_start_date > row.proposed_completion_date) {
      e.proposed_start_date = "Start Date shall precede Completion Date.";
    }
  }
  return e;
}

type MilestoneErrors = Partial<Record<"milestone_type" | "milestone_type_other", string>>;
function validateMilestone(row: Milestone): MilestoneErrors {
  const e: MilestoneErrors = {};
  if (!row.milestone_type) e.milestone_type = "Milestone type is required.";
  if (row.milestone_type === "other" && !(row.milestone_type_other ?? "").trim()) {
    e.milestone_type_other = 'Please specify — "Others" was selected for milestone type.';
  }
  return e;
}

function serializePayload(v: Data): Record<string, unknown> {
  const toInt = (x: string | number | null): number | null => {
    if (x === null || x === "") return null;
    const n = typeof x === "number" ? x : Number(x);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  };
  return {
    ...v,
    num_quotations_proposed: toInt(v.num_quotations_proposed),
    activities: v.activities.map((r, i) => ({
      ...r,
      order: i,
      proposed_start_date: r.proposed_start_date || null,
      proposed_completion_date: r.proposed_completion_date || null,
    })),
    milestones: v.milestones.map((r, i) => ({
      ...r,
      order: i,
      expected_date: r.expected_date || null,
    })),
  };
}

export function ImplementationSection({ uuid }: { uuid: string }) {
  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, fieldErrors, fieldWarnings, save, discard } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "implementation",
    schema: Schema,
    defaultValues: {
      procurement_method: "", procurement_method_other: "",
      tender_required: null, num_quotations_proposed: null,
      supplier_finalisation_method: "", expected_procurement_period: "",
      responsibility_agencies: [], responsibility_agency_other: "", responsibility_remarks: "",
      monitoring_frequency: "", monitoring_authority: "",
      reporting_mechanism: "", corrective_action_process: "",
      activities: [], milestones: [],
    },
    serializePayload,
  });

  // useWatch — reactive subscriptions (form.watch is stale after form.reset).
  const activities = useWatch({ control: form.control, name: "activities" }) ?? [];
  const milestones = useWatch({ control: form.control, name: "milestones" }) ?? [];
  const agencies = useWatch({ control: form.control, name: "responsibility_agencies" }) ?? [];
  const procurementMethod = useWatch({ control: form.control, name: "procurement_method" });
  const procurementMethodOther = useWatch({ control: form.control, name: "procurement_method_other" }) ?? "";
  const tenderRequired = useWatch({ control: form.control, name: "tender_required" });
  const numQuotations = useWatch({ control: form.control, name: "num_quotations_proposed" });
  const supplierFinalisationMethod = useWatch({ control: form.control, name: "supplier_finalisation_method" }) ?? "";
  const expectedProcurementPeriod = useWatch({ control: form.control, name: "expected_procurement_period" }) ?? "";
  const responsibilityAgencyOther = useWatch({ control: form.control, name: "responsibility_agency_other" }) ?? "";
  const responsibilityRemarks = useWatch({ control: form.control, name: "responsibility_remarks" }) ?? "";
  const monitoringFrequency = useWatch({ control: form.control, name: "monitoring_frequency" });
  const monitoringAuthority = useWatch({ control: form.control, name: "monitoring_authority" }) ?? "";
  const reportingMechanism = useWatch({ control: form.control, name: "reporting_mechanism" }) ?? "";
  const correctiveActionProcess = useWatch({ control: form.control, name: "corrective_action_process" }) ?? "";

  // Convenience setter — always includes shouldDirty: true.
  const setField = <K extends keyof Data>(name: K, value: Data[K]) =>
    form.setValue(name as never, value as never, { shouldDirty: true });

  const toggleAgency = (code: string, checked: boolean) => {
    const cur = form.getValues("responsibility_agencies") ?? [];
    setField("responsibility_agencies", checked ? [...cur, code] : cur.filter((c) => c !== code));
  };

  // Section-level live errors — mirror implementation_validators.py.
  const LIVE_CHECKED = new Set<string>([
    "procurement_method",
    "procurement_method_other",
    "responsibility_agency_other",
    "monitoring_frequency",
  ]);
  const liveErrors: Record<string, string | undefined> = {};
  if (!procurementMethod) {
    liveErrors.procurement_method = "Procurement Method shall be specified.";
  }
  if (procurementMethod === "other" && !String(procurementMethodOther).trim()) {
    liveErrors.procurement_method_other = 'Please specify — "Others" was selected for procurement method.';
  }
  if (agencies.includes("other") && !String(responsibilityAgencyOther).trim()) {
    liveErrors.responsibility_agency_other = 'Please specify — "Others" was selected in responsibility agencies.';
  }
  if (!monitoringFrequency) {
    liveErrors.monitoring_frequency = "Monitoring Frequency shall be specified.";
  }
  const err = (name: string): string | undefined =>
    LIVE_CHECKED.has(name) ? liveErrors[name] : fieldErrors.get(name);

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="implementation"
      loading={isLoading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
      help={
        <SectionHelp
          title="Project Implementation Plan"
          purpose="Capture the project implementation roadmap — activity schedule (Gantt-style with start + completion dates), procurement plan, responsibility matrix, critical milestones, and monitoring framework. Feeds the Implementation chapter of the DPR PDF, drives the Gantt chart, and sets up appraisal-time monitoring expectations."
          whatToFill={[
            "A — Implementation Schedule. Add one row per project activity (financial closure → site prep → civil works → machinery procurement → installation → commissioning → trial → commercial launch). Activity name required per row. Start/completion dates optional but strongly recommended (they drive the Gantt chart). Start must precede completion.",
            "B — Procurement Plan. Procurement method (mandatory): direct purchase / tender / quotation-based / rate contract / empanelled / others. 'Others' reveals specify. Tender required checkbox, expected number of quotations, supplier finalisation method, expected procurement period all optional.",
            "C — Implementation Responsibility. Multi-select which agencies own execution (FPO Board / CEO / PM / Consultant / Contractor / Machinery Supplier / Govt Dept / Bank / Others). 'Others' reveals specify. Free-text remarks below.",
            "D — Critical Milestones. Add one row per milestone: financial closure, civil completion, machinery install, trial production, commercial production, first sale, break-even. Type mandatory; 'Others' reveals specify. Expected date + remarks optional.",
            "E — Project Monitoring. Monitoring frequency (mandatory): weekly / fortnightly / monthly / quarterly. Responsible authority, reporting mechanism, corrective action process all optional.",
          ]}
          tips={[
            "Only 3 hard-required fields on this whole page — procurement_method (B), monitoring_frequency (E), and activity_name per activity row (A). Everything else is 'strongly recommended but not blocking'.",
            "Activity start/end dates are what drive the Gantt chart in the DPR PDF. Empty dates mean the PDF renders activities without timeline bars — noticeably weaker to a banker.",
            "Milestone dates should align with the Activity schedule — e.g. 'Machinery Installation' milestone date should match the corresponding activity's completion date.",
            "Monthly monitoring is the most common frequency for FPO-scale projects. Quarterly is fine for slower-moving projects; weekly is heavy for anything smaller than ₹5-cr projects.",
            "If you tick 'Tender required' but pick 'Quotation-based' as method, note it in the supplier_finalisation_method — that combination triggers questions from bankers.",
            "Responsibility Cat C should include the FPO Board even if execution is largely outsourced — the Board is ultimately accountable and appraisers expect that name in the mix.",
          ]}
          downstream={[
            "Implementation chapter in the DPR PDF — activities render as Gantt bars, milestones as timeline markers",
            "Investment section — activity duration informs pre-operative expenses timeline",
            "Compliance chapter — procurement method + tender toggle cross-reference procurement/compliance rules",
            "Finance section — expected procurement period + activity dates feed the capital tranche schedule (Cat J)",
            "Risk Analysis chapter — activity delays surface as project execution risks",
            "AI narrative — activity + milestone + monitoring profile feed the Project Execution paragraph",
          ]}
        />
      }
    >
      <div className="space-y-4">
        {/* A. Activities — id enables readiness-panel deep-link scroll */}
        <div id="dpr-field-activities" />
        <NestedListCard<Activity>
          title="A. Implementation Schedule"
          items={activities}
          onChange={(next) => form.setValue("activities", next, { shouldDirty: true })}
          warning={fieldWarnings.get("activities")}
          emptyRow={{ order: 0, activity_name: "", proposed_start_date: null, proposed_completion_date: null, estimated_duration: "", responsible_person_or_agency: "" }}
          columns={[
            { key: "activity_name", label: "Activity" },
            { key: "proposed_start_date", label: "Start" },
            { key: "proposed_completion_date", label: "Complete" },
            { key: "responsible_person_or_agency", label: "Owner" },
          ]}
          isValid={(row) => Object.keys(validateActivity(row)).length === 0}
          addLabel="Add activity"
          editLabel="Edit activity"
          renderModal={(row, set) => {
            const aErr = validateActivity(row);
            return (
              <>
                <ModalField label="Activity name *" error={aErr.activity_name}>
                  <Input
                    value={row.activity_name}
                    maxLength={MAX_LONG_CHARS}
                    placeholder="e.g. Land Acquisition"
                    onChange={(e) => set("activity_name", e.target.value.slice(0, MAX_LONG_CHARS))}
                  />
                </ModalField>
                <ModalRow>
                  <ModalField label="Proposed start date" error={aErr.proposed_start_date}>
                    <Input
                      type="date"
                      value={row.proposed_start_date ?? ""}
                      onChange={(e) => set("proposed_start_date", e.target.value || null)}
                    />
                  </ModalField>
                  <ModalField label="Proposed completion date">
                    <Input
                      type="date"
                      value={row.proposed_completion_date ?? ""}
                      onChange={(e) => set("proposed_completion_date", e.target.value || null)}
                    />
                  </ModalField>
                </ModalRow>
                <ModalField label="Estimated duration">
                  <Input
                    placeholder='e.g. "45 days"'
                    value={row.estimated_duration}
                    maxLength={MAX_SHORT_CHARS}
                    onChange={(e) => set("estimated_duration", e.target.value.slice(0, MAX_SHORT_CHARS))}
                  />
                </ModalField>
                <ModalField label="Responsible person / agency">
                  <Input
                    value={row.responsible_person_or_agency}
                    maxLength={MAX_LONG_CHARS}
                    onChange={(e) => set("responsible_person_or_agency", e.target.value.slice(0, MAX_LONG_CHARS))}
                  />
                </ModalField>
              </>
            );
          }}
        />

        {/* B. Procurement Plan */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">B. Procurement Plan</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div id="dpr-field-procurement_method" className="space-y-1.5">
              <Label className={err("procurement_method") ? "text-xs text-destructive" : "text-xs"}>
                Procurement method *
              </Label>
              <SearchableSelect
                value={procurementMethod ?? ""}
                options={PROCUREMENT}
                onChange={(v: string) => setField("procurement_method", v)}
                placeholder="Type to search…"
              />
              {err("procurement_method") && (
                <p className="text-xs text-destructive">{err("procurement_method")}</p>
              )}
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={tenderRequired === true} onCheckedChange={(c) => setField("tender_required", !!c)} />
                Tender required
              </label>
            </div>
          </div>
          {procurementMethod === "other" && (
            <div id="dpr-field-procurement_method_other" className="space-y-1.5">
              <Label className={err("procurement_method_other") ? "text-xs text-destructive" : "text-xs"}>
                Please specify (Others) *
              </Label>
              <Input
                value={procurementMethodOther as string}
                maxLength={MAX_TEXT_CHARS}
                onChange={(e) => setField("procurement_method_other", e.target.value.slice(0, MAX_TEXT_CHARS))}
              />
              {err("procurement_method_other") && (
                <p className="text-xs text-destructive">{err("procurement_method_other")}</p>
              )}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Number of quotations proposed</Label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={3}
                placeholder="e.g. 3"
                value={numQuotations !== null && numQuotations !== undefined ? String(numQuotations) : ""}
                onChange={(e) => {
                  const cleaned = normaliseIntegerInput(e.target.value, { max: MAX_QUOTATIONS, min: 0 });
                  setField("num_quotations_proposed", (cleaned === "" ? null : cleaned) as Data["num_quotations_proposed"]);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Expected procurement period</Label>
              <Input
                placeholder='e.g. "3 months"'
                value={expectedProcurementPeriod as string}
                maxLength={MAX_SHORT_CHARS}
                onChange={(e) => setField("expected_procurement_period", e.target.value.slice(0, MAX_SHORT_CHARS))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Supplier finalisation method</Label>
            <Input
              value={supplierFinalisationMethod as string}
              maxLength={MAX_LONG_CHARS}
              onChange={(e) => setField("supplier_finalisation_method", e.target.value.slice(0, MAX_LONG_CHARS))}
            />
          </div>
        </CardContent></Card>

        {/* C. Responsibility */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">C. Implementation Responsibility</h3>
          <Label>Responsible agencies</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {AGENCIES.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={agencies.includes(o.value)} onCheckedChange={(c) => toggleAgency(o.value, !!c)} />
                {o.label}
              </label>
            ))}
          </div>
          {agencies.includes("other") && (
            <div id="dpr-field-responsibility_agency_other" className="space-y-1.5">
              <Label className={err("responsibility_agency_other") ? "text-xs text-destructive" : "text-xs"}>
                Please specify (Others) *
              </Label>
              <Input
                value={responsibilityAgencyOther as string}
                maxLength={MAX_TEXT_CHARS}
                onChange={(e) => setField("responsibility_agency_other", e.target.value.slice(0, MAX_TEXT_CHARS))}
              />
              {err("responsibility_agency_other") && (
                <p className="text-xs text-destructive">{err("responsibility_agency_other")}</p>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Remarks</Label>
            <CountedTextarea
              rows={2}
              maxChars={MAX_LONG_TEXT_CHARS}
              value={responsibilityRemarks as string}
              onChange={(v) => setField("responsibility_remarks", v)}
            />
          </div>
        </CardContent></Card>

        {/* D. Milestones — id enables readiness-panel deep-link scroll */}
        <div id="dpr-field-milestones" />
        <NestedListCard<Milestone>
          title="D. Critical Milestones"
          items={milestones}
          onChange={(next) => form.setValue("milestones", next, { shouldDirty: true })}
          warning={fieldWarnings.get("milestones")}
          emptyRow={{ order: 0, milestone_type: "", milestone_type_other: "", expected_date: null, remarks: "" }}
          columns={[
            { key: "milestone_type", label: "Milestone", render: (v) => MILESTONE_TYPES.find((o) => o.value === v)?.label ?? "—" },
            { key: "expected_date", label: "Expected date" },
          ]}
          isValid={(row) => Object.keys(validateMilestone(row)).length === 0}
          addLabel="Add milestone"
          editLabel="Edit milestone"
          renderModal={(row, set) => {
            const mErr = validateMilestone(row);
            return (
              <>
                <ModalField label="Milestone type *" error={mErr.milestone_type}>
                  <SearchableSelect
                    value={row.milestone_type}
                    options={MILESTONE_TYPES}
                    onChange={(v: string) => set("milestone_type", v)}
                    placeholder="Type to search…"
                  />
                </ModalField>
                {row.milestone_type === "other" && (
                  <ModalField label="Please specify (Others) *" error={mErr.milestone_type_other}>
                    <Input
                      value={row.milestone_type_other}
                      maxLength={MAX_TEXT_CHARS}
                      onChange={(e) => set("milestone_type_other", e.target.value.slice(0, MAX_TEXT_CHARS))}
                    />
                  </ModalField>
                )}
                <ModalField label="Expected date">
                  <Input
                    type="date"
                    value={row.expected_date ?? ""}
                    onChange={(e) => set("expected_date", e.target.value || null)}
                  />
                </ModalField>
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

        {/* E. Monitoring */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">E. Project Monitoring</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div id="dpr-field-monitoring_frequency" className="space-y-1.5">
              <Label className={err("monitoring_frequency") ? "text-xs text-destructive" : "text-xs"}>
                Monitoring frequency *
              </Label>
              <SearchableSelect
                value={monitoringFrequency ?? ""}
                options={FREQUENCY}
                onChange={(v: string) => setField("monitoring_frequency", v)}
                placeholder="Type to search…"
              />
              {err("monitoring_frequency") && (
                <p className="text-xs text-destructive">{err("monitoring_frequency")}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Responsible monitoring authority</Label>
              <Input
                value={monitoringAuthority as string}
                maxLength={MAX_LONG_CHARS}
                onChange={(e) => setField("monitoring_authority", e.target.value.slice(0, MAX_LONG_CHARS))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reporting mechanism</Label>
            <CountedTextarea
              rows={2}
              maxChars={MAX_LONG_TEXT_CHARS}
              value={reportingMechanism as string}
              onChange={(v) => setField("reporting_mechanism", v)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Corrective action process</Label>
            <CountedTextarea
              rows={2}
              maxChars={MAX_LONG_TEXT_CHARS}
              value={correctiveActionProcess as string}
              onChange={(v) => setField("corrective_action_process", v)}
            />
          </div>
        </CardContent></Card>
      </div>
    </SectionShell>
  );
}
