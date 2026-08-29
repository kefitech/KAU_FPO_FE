"use client";

import { useWatch } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDprSectionForm } from "@/hooks/use-dpr-section-form";

import { FieldError } from "./field-error";
import {
  ChoiceSelect,
  ModalField,
  ModalRow,
  NestedListCard,
} from "./nested-list";
import { SectionShell } from "./section-shell";

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
  const tenderRequired = useWatch({ control: form.control, name: "tender_required" });
  const monitoringFrequency = useWatch({ control: form.control, name: "monitoring_frequency" });

  const toggleAgency = (code: string, checked: boolean) => {
    const cur = form.getValues("responsibility_agencies") ?? [];
    form.setValue("responsibility_agencies", checked ? [...cur, code] : cur.filter((c) => c !== code), { shouldDirty: true });
  };

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
    >
      <div className="space-y-4">
        {/* A. Activities */}
        <NestedListCard<Activity>
          title="A. Implementation Schedule"
          items={activities}
          onChange={(next) => form.setValue("activities", next, { shouldDirty: true })}
          emptyRow={{ order: 0, activity_name: "", proposed_start_date: null, proposed_completion_date: null, estimated_duration: "", responsible_person_or_agency: "" }}
          columns={[
            { key: "activity_name", label: "Activity" },
            { key: "proposed_start_date", label: "Start" },
            { key: "proposed_completion_date", label: "Complete" },
            { key: "responsible_person_or_agency", label: "Owner" },
          ]}
          isValid={(row) => row.activity_name.trim().length > 0}
          addLabel="Add activity"
          editLabel="Edit activity"
          renderModal={(row, set) => (
            <>
              <ModalField label="Activity name *"><Input value={row.activity_name} onChange={(e) => set("activity_name", e.target.value)} placeholder="e.g. Land Acquisition" /></ModalField>
              <ModalRow>
                <ModalField label="Proposed start date"><Input type="date" value={row.proposed_start_date ?? ""} onChange={(e) => set("proposed_start_date", e.target.value || null)} /></ModalField>
                <ModalField label="Proposed completion date"><Input type="date" value={row.proposed_completion_date ?? ""} onChange={(e) => set("proposed_completion_date", e.target.value || null)} /></ModalField>
              </ModalRow>
              <ModalField label="Estimated duration"><Input placeholder='e.g. "45 days"' value={row.estimated_duration} onChange={(e) => set("estimated_duration", e.target.value)} /></ModalField>
              <ModalField label="Responsible person / agency"><Input value={row.responsible_person_or_agency} onChange={(e) => set("responsible_person_or_agency", e.target.value)} /></ModalField>
            </>
          )}
        />

        {/* B. Procurement Plan */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">B. Procurement Plan</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={`text-xs ${fieldErrors.has("procurement_method") ? "text-destructive" : ""}`}>Procurement method *</Label>
              <ChoiceSelect value={procurementMethod ?? ""} options={PROCUREMENT} onChange={(v) => form.setValue("procurement_method", v, { shouldDirty: true })} />
              <FieldError name="procurement_method" errors={fieldErrors} warnings={fieldWarnings} />
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={tenderRequired === true} onCheckedChange={(c) => form.setValue("tender_required", !!c, { shouldDirty: true })} />
                Tender required
              </label>
            </div>
          </div>
          {procurementMethod === "other" && (
            <div className="space-y-1.5"><Label className="text-xs">Specify (Others)</Label><Input {...form.register("procurement_method_other")} /></div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label className="text-xs">Number of quotations proposed</Label><Input type="number" min="0" {...form.register("num_quotations_proposed")} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Expected procurement period</Label><Input placeholder='e.g. "3 months"' {...form.register("expected_procurement_period")} /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Supplier finalisation method</Label><Input {...form.register("supplier_finalisation_method")} /></div>
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
            <div className="space-y-1.5"><Label className="text-xs">Specify (Others)</Label><Input {...form.register("responsibility_agency_other")} /></div>
          )}
          <div className="space-y-1.5"><Label className="text-xs">Remarks</Label><Textarea rows={2} {...form.register("responsibility_remarks")} /></div>
        </CardContent></Card>

        {/* D. Milestones */}
        <NestedListCard<Milestone>
          title="D. Critical Milestones"
          items={milestones}
          onChange={(next) => form.setValue("milestones", next, { shouldDirty: true })}
          emptyRow={{ order: 0, milestone_type: "", milestone_type_other: "", expected_date: null, remarks: "" }}
          columns={[
            { key: "milestone_type", label: "Milestone", render: (v) => MILESTONE_TYPES.find((o) => o.value === v)?.label ?? "—" },
            { key: "expected_date", label: "Expected date" },
          ]}
          isValid={(row) => !!row.milestone_type}
          addLabel="Add milestone"
          editLabel="Edit milestone"
          renderModal={(row, set) => (
            <>
              <ModalField label="Milestone type *"><ChoiceSelect value={row.milestone_type} options={MILESTONE_TYPES} onChange={(v) => set("milestone_type", v)} /></ModalField>
              {row.milestone_type === "other" && (
                <ModalField label="Specify"><Input value={row.milestone_type_other} onChange={(e) => set("milestone_type_other", e.target.value)} /></ModalField>
              )}
              <ModalField label="Expected date"><Input type="date" value={row.expected_date ?? ""} onChange={(e) => set("expected_date", e.target.value || null)} /></ModalField>
              <ModalField label="Remarks"><Textarea rows={2} value={row.remarks} onChange={(e) => set("remarks", e.target.value)} /></ModalField>
            </>
          )}
        />

        {/* E. Monitoring */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">E. Project Monitoring</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={`text-xs ${fieldErrors.has("monitoring_frequency") ? "text-destructive" : ""}`}>Monitoring frequency *</Label>
              <ChoiceSelect value={monitoringFrequency ?? ""} options={FREQUENCY} onChange={(v) => form.setValue("monitoring_frequency", v, { shouldDirty: true })} />
              <FieldError name="monitoring_frequency" errors={fieldErrors} warnings={fieldWarnings} />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Responsible monitoring authority</Label><Input {...form.register("monitoring_authority")} /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Reporting mechanism</Label><Textarea rows={2} {...form.register("reporting_mechanism")} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Corrective action process</Label><Textarea rows={2} {...form.register("corrective_action_process")} /></div>
        </CardContent></Card>
      </div>
    </SectionShell>
  );
}
