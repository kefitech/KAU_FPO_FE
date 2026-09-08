"use client";

import { useWatch } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";

import { useDprSectionForm } from "@/hooks/use-dpr-section-form";

import { CountedTextarea } from "./counted-textarea";
import {
  ModalField,
  ModalRow,
  NestedListCard,
} from "./nested-list";
import { SectionHelp } from "./section-help";
import { SectionShell } from "./section-shell";

// ── Input caps — mirror backend DPRRiskItem columns ──
const MAX_TEXT_CHARS = 200;              // risk_code_other, implementation_timeline
const MAX_LONG_CHARS = 300;              // responsible_person_or_agency
const MAX_LONG_TEXT_CHARS = 2000;        // TextField defensive cap

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

// ── Per-row validator (mirrors risk_validators.py) ──────────────────────

type RiskErrors = Partial<Record<"risk_code" | "risk_code_other" | "mitigation_strategy", string>>;
function validateRisk(row: Item): RiskErrors {
  const e: RiskErrors = {};
  if (!row.risk_code) e.risk_code = "Risk is required.";
  if (row.risk_code === "other" && !(row.risk_code_other ?? "").trim()) {
    e.risk_code_other = 'Please specify — "Others" was selected for risk.';
  }
  if (!(row.mitigation_strategy ?? "").trim()) {
    e.mitigation_strategy = "Every identified risk shall have at least one proposed mitigation measure.";
  }
  return e;
}

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
      help={
        <SectionHelp
          title="Risk Assessment & Mitigation Plan"
          purpose="Capture every material risk to the project across the 6 KAU-mandated categories (production / market / financial / institutional / environmental / regulatory) and pair each with a mitigation strategy, probability + impact rating, responsible person, and timeline. The system auto-classifies overall project risk (Low / Moderate / High) at DPR generation based on the cumulative assessment."
          whatToFill={[
            "A — Production Risks (add ≥ 1). Non-availability of raw material, seasonal supply, poor quality material, pest/disease, production losses, machinery breakdown, power failure, water scarcity, labour shortage, technology failure. Pick from the 10-option shortlist + Others (Specify).",
            "B — Market Risks (add ≥ 1). Price fluctuation, low market demand, competition, delayed payments, customer concentration, product rejection, export restrictions, logistics issues.",
            "C — Financial Risks (add ≥ 1). Cost escalation, interest rate increase, WC shortage, loan delay, cash-flow problems, credit recovery, inflation.",
            "D — Institutional Risks (add ≥ 1). Weak governance, low member participation, management issues, skilled manpower shortage, staff turnover, decision delays.",
            "E — Environmental Risks (add ≥ 1). Flood, drought, cyclone, landslide, water pollution, fire, climate change.",
            "F — Regulatory Risks (add ≥ 1). Delay in licences, delay in subsidy, policy changes, tax changes, environmental regulations, labour regulations.",
            "Per risk row: Risk (required from dropdown) + Mitigation strategy (required, free text) + Probability (Low/Med/High) + Impact (Low/Med/High) + Responsible person + Timeline + Expected outcome + Existing measures — all optional but recommended.",
          ]}
          tips={[
            "Only 1 hard-required field per row — Mitigation Strategy. Backend REJECTS any risk without one. Cover it briefly (2-3 sentences).",
            "The unique-per-category rule means you can't add 'Machinery Breakdown' twice under Production — dropdown will hide already-picked codes. If you need to log two variations of the same risk, describe them in a single row's mitigation.",
            "Probability × Impact drives the overall risk rating. High/High = red-flag; the DPR PDF highlights these in the Risk Matrix chapter.",
            "Cross-check E (Environmental) with ESS section Cat C (Climate Risks) — they should tell a consistent story about your site's climate exposure.",
            "F (Regulatory) should mirror any 'Rejected' or 'Under Review' entries in the Compliance section — those are literal regulatory risks worth logging here.",
            "A DPR with 0-1 risks per category reads as either unrealistic or complacent to a bank appraiser. Aim for 6-9 total (1-2 per applicable category).",
          ]}
          downstream={[
            "Risk Assessment chapter in the DPR PDF — full 6-category matrix + Cat G mitigation plan render there",
            "Overall Risk Rating (auto-classified at DPR generation) — Low / Moderate / High computed from cumulative probability × impact",
            "Executive Summary — top 3 risks typically feature in the elevator-pitch section",
            "AI narrative — risk profile + mitigation strategy feed the Risk Management paragraph",
            "Bank appraisal — appraisers use this matrix as-is when scoring project bankability",
          ]}
        />
      }
    >
      <div className="space-y-4">
        {/* Section-level error/warning banner + deep-link anchor.
            Items are split across 6 category cards below, so we surface the
            single-source `items` message once at the top and use this element
            as the scroll target for readiness-panel clicks. */}
        <div id="dpr-field-items">
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
        </div>
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
              isValid={(row) => Object.keys(validateRisk(row)).length === 0}
              addLabel="Add risk"
              editLabel="Edit risk"
              emptyHint="No risks identified in this category yet."
              renderModal={(row, set) => {
                const rErr = validateRisk(row);
                // Filter dropdown to exclude codes already used in THIS category
                // (backend enforces `unique_together = [section,risk_category,
                // risk_code]` — same code twice would 500 on save). Keep the
                // current row's own code visible so editing looks normal.
                // 'other' is allowed multiple times only if backend still
                // rejects — we keep it in the dropdown (users often try) but
                // note: DB constraint means only one 'other' per category.
                const usedByOtherRows = new Set<string>();
                for (const other of subset) {
                  if (other.risk_code && other.risk_code !== row.risk_code) {
                    usedByOtherRows.add(other.risk_code);
                  }
                }
                const availableCodes = codeOptions.filter((o) => !usedByOtherRows.has(o.value));
                return (
                  <>
                    <ModalField label="Risk *" error={rErr.risk_code}>
                      <SearchableSelect
                        value={row.risk_code}
                        options={availableCodes}
                        onChange={(v: string) => set("risk_code", v)}
                        placeholder="Type to search risk…"
                      />
                    </ModalField>
                    {row.risk_code === "other" && (
                      <ModalField label="Please specify (Others) *" error={rErr.risk_code_other}>
                        <Input
                          value={row.risk_code_other}
                          maxLength={MAX_TEXT_CHARS}
                          onChange={(e) => set("risk_code_other", e.target.value.slice(0, MAX_TEXT_CHARS))}
                        />
                      </ModalField>
                    )}
                    <ModalField label="Risk description">
                      <CountedTextarea
                        rows={2}
                        maxChars={MAX_LONG_TEXT_CHARS}
                        value={row.risk_description}
                        onChange={(v) => set("risk_description", v)}
                      />
                    </ModalField>
                    <ModalField label="Mitigation strategy *" error={rErr.mitigation_strategy}>
                      <CountedTextarea
                        rows={3}
                        maxChars={MAX_LONG_TEXT_CHARS}
                        value={row.mitigation_strategy}
                        onChange={(v) => set("mitigation_strategy", v)}
                        error={Boolean(rErr.mitigation_strategy)}
                      />
                    </ModalField>
                    <ModalRow>
                      <ModalField label="Probability">
                        <SearchableSelect
                          value={row.probability}
                          options={LEVEL}
                          onChange={(v: string) => set("probability", v)}
                          placeholder="Type to search…"
                        />
                      </ModalField>
                      <ModalField label="Expected impact">
                        <SearchableSelect
                          value={row.impact}
                          options={LEVEL}
                          onChange={(v: string) => set("impact", v)}
                          placeholder="Type to search…"
                        />
                      </ModalField>
                    </ModalRow>
                    <ModalRow>
                      <ModalField label="Responsible person / agency">
                        <Input
                          value={row.responsible_person_or_agency}
                          maxLength={MAX_LONG_CHARS}
                          onChange={(e) => set("responsible_person_or_agency", e.target.value.slice(0, MAX_LONG_CHARS))}
                        />
                      </ModalField>
                      <ModalField label="Implementation timeline">
                        <Input
                          value={row.implementation_timeline}
                          maxLength={MAX_TEXT_CHARS}
                          onChange={(e) => set("implementation_timeline", e.target.value.slice(0, MAX_TEXT_CHARS))}
                        />
                      </ModalField>
                    </ModalRow>
                    <ModalField label="Expected outcome">
                      <CountedTextarea
                        rows={2}
                        maxChars={MAX_LONG_TEXT_CHARS}
                        value={row.expected_outcome}
                        onChange={(v) => set("expected_outcome", v)}
                      />
                    </ModalField>
                    <ModalField label="Existing measures">
                      <CountedTextarea
                        rows={2}
                        maxChars={MAX_LONG_TEXT_CHARS}
                        value={row.existing_measures}
                        onChange={(v) => set("existing_measures", v)}
                      />
                    </ModalField>
                  </>
                );
              }}
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
