"use client";

import { useWatch } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDprSectionForm } from "@/hooks/use-dpr-section-form";

import {
  ChoiceSelect,
  ModalField,
  ModalRow,
  NestedListCard,
} from "./nested-list";
import { SectionShell } from "./section-shell";

const CATEGORIES = [
  { value: "production", label: "A. Production Risks" },
  { value: "market", label: "B. Market Risks" },
  { value: "financial", label: "C. Financial Risks" },
  { value: "institutional", label: "D. Institutional Risks" },
  { value: "environmental", label: "E. Environmental Risks" },
  { value: "regulatory", label: "F. Regulatory Risks" },
];

// Category → list of applicable risk_code choices (from backend model)
const RISKS_BY_CAT: Record<string, { value: string; label: string }[]> = {
  production: [
    { value: "raw_material_unavailable", label: "Non-availability of Raw Materials" },
    { value: "seasonal_supply", label: "Seasonal Raw Material Supply" },
    { value: "poor_quality_material", label: "Poor Quality Raw Materials" },
    { value: "pest_disease", label: "Pest and Disease Incidence" },
    { value: "production_losses", label: "Production Losses" },
    { value: "machinery_breakdown", label: "Machinery Breakdown" },
    { value: "power_failure", label: "Power Failure" },
    { value: "water_scarcity", label: "Water Scarcity" },
    { value: "labour_shortage", label: "Labour Shortage" },
    { value: "technology_failure", label: "Technology Failure" },
    { value: "other", label: "Others (Specify)" },
  ],
  market: [
    { value: "price_fluctuation", label: "Price Fluctuation" },
    { value: "low_market_demand", label: "Low Market Demand" },
    { value: "competition", label: "Competition" },
    { value: "delayed_payments", label: "Delayed Payments" },
    { value: "customer_concentration", label: "Customer Concentration" },
    { value: "product_rejection", label: "Product Rejection" },
    { value: "export_restrictions", label: "Export Restrictions" },
    { value: "logistics_issues", label: "Logistics Issues" },
    { value: "other", label: "Others (Specify)" },
  ],
  financial: [
    { value: "cost_escalation", label: "Cost Escalation" },
    { value: "interest_rate_increase", label: "Interest Rate Increase" },
    { value: "wc_shortage", label: "Working Capital Shortage" },
    { value: "loan_delay", label: "Loan Delay" },
    { value: "cash_flow_problems", label: "Cash Flow Problems" },
    { value: "credit_recovery", label: "Credit Recovery Issues" },
    { value: "inflation", label: "Inflation" },
    { value: "other", label: "Others (Specify)" },
  ],
  institutional: [
    { value: "weak_governance", label: "Weak Governance" },
    { value: "low_member_participation", label: "Low Member Participation" },
    { value: "management_issues", label: "Management Issues" },
    { value: "skilled_manpower_shortage", label: "Skilled Manpower Shortage" },
    { value: "staff_turnover", label: "Staff Turnover" },
    { value: "decision_delays", label: "Decision-making Delays" },
    { value: "other", label: "Others (Specify)" },
  ],
  environmental: [
    { value: "flood", label: "Flood" },
    { value: "drought", label: "Drought" },
    { value: "cyclone", label: "Cyclone" },
    { value: "landslide", label: "Landslide" },
    { value: "water_pollution", label: "Water Pollution" },
    { value: "fire", label: "Fire" },
    { value: "climate_change", label: "Climate Change" },
    { value: "other", label: "Others (Specify)" },
  ],
  regulatory: [
    { value: "delay_licences", label: "Delay in Licences" },
    { value: "delay_subsidy", label: "Delay in Subsidy" },
    { value: "policy_changes", label: "Policy Changes" },
    { value: "tax_changes", label: "Tax Changes" },
    { value: "env_regulations", label: "Environmental Regulations" },
    { value: "labour_regulations", label: "Labour Regulations" },
    { value: "other", label: "Others (Specify)" },
  ],
};

const LEVEL = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const ItemSchema = z.object({
  id: z.number().optional(),
  order: z.number(),
  risk_category: z.string(),
  risk_code: z.string(),
  risk_code_other: z.string(),
  risk_description: z.string(),
  mitigation_strategy: z.string(),
  responsible_person_or_agency: z.string(),
  implementation_timeline: z.string(),
  expected_outcome: z.string(),
  probability: z.string(),
  impact: z.string(),
  existing_measures: z.string(),
});
type Item = z.infer<typeof ItemSchema>;

const Schema = z.object({
  items: z.array(ItemSchema),
});
type Data = z.infer<typeof Schema>;

function serializePayload(v: Data): Record<string, unknown> {
  return {
    items: v.items.map((r, i) => ({ ...r, order: i })),
  };
}

export function RiskSection({ uuid }: { uuid: string }) {
  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, fieldErrors, fieldWarnings, save, discard } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "risk",
    schema: Schema,
    defaultValues: { items: [] },
    serializePayload,
  });

  // useWatch — reactive subscription (form.watch is stale after form.reset).
  const items = useWatch({ control: form.control, name: "items" }) ?? [];

  // Split items by category so each category-panel renders only its own list
  function itemsForCat(cat: string) {
    return items.filter((it) => it.risk_category === cat);
  }
  function updateForCat(cat: string, subset: Item[]) {
    const others = items.filter((it) => it.risk_category !== cat);
    // Preserve global order: prepend the subset's slot in original order for the category
    form.setValue("items", [...others, ...subset], { shouldDirty: true });
  }

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="risk"
      loading={isLoading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
    >
      <div className="space-y-4">
        {/* Section-level error/warning — items list is split across categories, so surface once at top. */}
        {fieldErrors.has("items") && (
          <div className="rounded-md border border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {fieldErrors.get("items")}
          </div>
        )}
        {!fieldErrors.has("items") && fieldWarnings.has("items") && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-500">
            {fieldWarnings.get("items")}
          </div>
        )}
        {CATEGORIES.map((cat) => {
          const subset = itemsForCat(cat.value);
          const codeOptions = RISKS_BY_CAT[cat.value] ?? [];
          return (
            <NestedListCard<Item>
              key={cat.value}
              title={cat.label}
              items={subset}
              onChange={(next) => updateForCat(cat.value, next)}
              emptyRow={{
                order: 0,
                risk_category: cat.value,
                risk_code: "",
                risk_code_other: "",
                risk_description: "",
                mitigation_strategy: "",
                responsible_person_or_agency: "",
                implementation_timeline: "",
                expected_outcome: "",
                probability: "",
                impact: "",
                existing_measures: "",
              }}
              columns={[
                { key: "risk_code", label: "Risk", render: (v) => codeOptions.find((o) => o.value === v)?.label ?? "—" },
                { key: "probability", label: "Prob.", render: (v) => LEVEL.find((o) => o.value === v)?.label ?? "—" },
                { key: "impact", label: "Impact", render: (v) => LEVEL.find((o) => o.value === v)?.label ?? "—" },
                { key: "mitigation_strategy", label: "Mitigation", render: (v) => ((v as string)?.slice(0, 50) ?? "") + ((v as string)?.length > 50 ? "…" : "") },
              ]}
              isValid={(row) => !!row.risk_code && row.mitigation_strategy.trim().length > 0}
              addLabel="Add risk"
              editLabel="Edit risk"
              emptyHint="No risks identified in this category yet."
              renderModal={(row, set) => (
                <>
                  <ModalField label="Risk *">
                    <ChoiceSelect value={row.risk_code} options={codeOptions} onChange={(v) => set("risk_code", v)} />
                  </ModalField>
                  {row.risk_code === "other" && (
                    <ModalField label="Specify (Others)"><Input value={row.risk_code_other} onChange={(e) => set("risk_code_other", e.target.value)} /></ModalField>
                  )}
                  <ModalField label="Risk description">
                    <Textarea rows={2} value={row.risk_description} onChange={(e) => set("risk_description", e.target.value)} />
                  </ModalField>
                  <ModalField label="Mitigation strategy *">
                    <Textarea rows={3} value={row.mitigation_strategy} onChange={(e) => set("mitigation_strategy", e.target.value)} />
                  </ModalField>
                  <ModalRow>
                    <ModalField label="Probability"><ChoiceSelect value={row.probability} options={LEVEL} onChange={(v) => set("probability", v)} /></ModalField>
                    <ModalField label="Expected impact"><ChoiceSelect value={row.impact} options={LEVEL} onChange={(v) => set("impact", v)} /></ModalField>
                  </ModalRow>
                  <ModalRow>
                    <ModalField label="Responsible person / agency"><Input value={row.responsible_person_or_agency} onChange={(e) => set("responsible_person_or_agency", e.target.value)} /></ModalField>
                    <ModalField label="Implementation timeline"><Input value={row.implementation_timeline} onChange={(e) => set("implementation_timeline", e.target.value)} /></ModalField>
                  </ModalRow>
                  <ModalField label="Expected outcome">
                    <Textarea rows={2} value={row.expected_outcome} onChange={(e) => set("expected_outcome", e.target.value)} />
                  </ModalField>
                  <ModalField label="Existing measures">
                    <Textarea rows={2} value={row.existing_measures} onChange={(e) => set("existing_measures", e.target.value)} />
                  </ModalField>
                </>
              )}
            />
          );
        })}

        {/* Overall risk rating (read-only, auto-classified by backend at generation) */}
        <Card>
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground">
              Overall project risk rating is auto-classified by the system at DPR generation based on the cumulative assessment across all categories.
            </p>
          </CardContent>
        </Card>
      </div>
    </SectionShell>
  );
}
