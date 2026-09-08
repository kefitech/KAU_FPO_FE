"use client";

import { useQuery } from "@tanstack/react-query";
import { useWatch } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useDprSectionForm } from "@/hooks/use-dpr-section-form";
import { dprMasterApi } from "@/lib/api/dpr-master";

import { CountedTextarea } from "./counted-textarea";
import { normaliseIntegerInput } from "./dpr-input-normalisers";
import {
  MasterSearchableSelect,
  ModalField,
  ModalRow,
  NestedListCard,
} from "./nested-list";
import { SectionHelp } from "./section-help";
import { SectionShell } from "./section-shell";

// ── Input caps — mirror backend DPRSectionESS + child tables ──
const MAX_TEXT_CHARS = 200;              // most CharField widths
const MAX_LONG_CHARS = 300;              // source CharField(300)
const MAX_OTHER_TEXT_CHARS = 200;        // *_other companions
const MAX_LONG_TEXT_CHARS = 2000;        // TextField defensive cap
// Beneficiary counts — realistic 0-1M.
const MAX_BENEFICIARIES = 1_000_000;

// ── Choices ────────────────────────────────────────────────────────────────

const RESOURCES = [
  { value: "electricity", label: "Electricity" },
  { value: "water", label: "Water" },
  { value: "fuel", label: "Fuel" },
  { value: "raw_materials", label: "Raw Materials" },
  { value: "packaging", label: "Packaging Materials" },
];
const CONSERVATION = [
  { value: "water_conservation", label: "Water Conservation" },
  { value: "energy_conservation", label: "Energy Conservation" },
  { value: "waste_recycling", label: "Waste Recycling" },
  { value: "rainwater_harvesting", label: "Rainwater Harvesting" },
  { value: "solar_energy", label: "Solar Energy" },
  { value: "biomass_utilisation", label: "Biomass Utilisation" },
  { value: "other", label: "Others (Specify)" },
];
const SAFETY = [
  { value: "ppe", label: "PPE" },
  { value: "fire_safety", label: "Fire Safety" },
  { value: "first_aid", label: "First Aid" },
  { value: "safety_signage", label: "Safety Signage" },
  { value: "emergency_exit", label: "Emergency Exit" },
  { value: "machine_guards", label: "Machine Guards" },
  { value: "safety_training", label: "Safety Training" },
  { value: "health_checkup", label: "Health Check-up" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Others (Specify)" },
];
const SUSTAINABILITY = [
  { value: "renewable_energy", label: "Renewable Energy" },
  { value: "organic_production", label: "Organic Production" },
  { value: "natural_farming", label: "Natural Farming" },
  { value: "waste_recycling", label: "Waste Recycling" },
  { value: "water_reuse", label: "Water Reuse" },
  { value: "eco_packaging", label: "Eco-friendly Packaging" },
  { value: "circular_economy", label: "Circular Economy" },
  { value: "resource_recovery", label: "Resource Recovery" },
  { value: "carbon_reduction", label: "Carbon Reduction" },
  { value: "other", label: "Others (Specify)" },
];

// ── Schemas ────────────────────────────────────────────────────────────────

const ImpactSchema = z.object({
  id: z.number().optional(),
  impact: z.number().nullable(),
  impact_other: z.string(),
  estimated_quantity: z.string(),
  source: z.string(),
  existing_control_measure: z.string(),
  proposed_mitigation_measure: z.string(),
});
type Impact = z.infer<typeof ImpactSchema>;

const ClimateRiskSchema = z.object({
  id: z.number().optional(),
  risk: z.number().nullable(),
  risk_other: z.string(),
  expected_impact: z.string(),
  proposed_mitigation_strategy: z.string(),
});
type ClimateRisk = z.infer<typeof ClimateRiskSchema>;

const Schema = z.object({
  resources_used: z.array(z.string()),
  conservation_measures: z.array(z.string()),
  conservation_other: z.string(),
  annual_electricity_requirement: z.string(),
  annual_water_requirement: z.string(),
  annual_fuel_requirement: z.string(),
  safety_measures: z.array(z.string()),
  safety_other: z.string(),
  farmers_benefited: z.union([z.string(), z.number()]).nullable(),
  direct_jobs_created: z.union([z.string(), z.number()]).nullable(),
  indirect_jobs_created: z.union([z.string(), z.number()]).nullable(),
  women_beneficiaries: z.union([z.string(), z.number()]).nullable(),
  youth_beneficiaries: z.union([z.string(), z.number()]).nullable(),
  sc_st_beneficiaries: z.union([z.string(), z.number()]).nullable(),
  small_marginal_farmers: z.union([z.string(), z.number()]).nullable(),
  expected_income_increase: z.string(),
  expected_post_harvest_loss_reduction: z.string(),
  sustainability_initiatives: z.array(z.string()),
  sustainability_other: z.string(),
  environmental_initiatives: z.string(),
  social_initiatives: z.string(),
  governance_practices: z.string(),
  environmental_impacts: z.array(ImpactSchema),
  climate_risks: z.array(ClimateRiskSchema),
});
type Data = z.infer<typeof Schema>;

// ── Utilities ──────────────────────────────────────────────────────────────

function toInt(v: string | number | null): number | null {
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

const INT_KEYS = [
  "farmers_benefited", "direct_jobs_created", "indirect_jobs_created",
  "women_beneficiaries", "youth_beneficiaries", "sc_st_beneficiaries",
  "small_marginal_farmers",
] as const;

// ── Per-row validators (mirror ess_validators.py) ──────────────────────

type ImpactErrors = Partial<Record<"impact" | "impact_other", string>>;
function validateImpact(row: Impact, isOtherImpact: (id: number | null) => boolean): ImpactErrors {
  const e: ImpactErrors = {};
  if (!row.impact) e.impact = "Environmental impact is required.";
  if (row.impact && isOtherImpact(row.impact) && !(row.impact_other ?? "").trim()) {
    e.impact_other = 'Please specify — "Others" was selected for environmental impact.';
  }
  return e;
}

type ClimateRiskErrors = Partial<Record<"risk" | "risk_other", string>>;
function validateClimateRisk(row: ClimateRisk, isOtherRisk: (id: number | null) => boolean): ClimateRiskErrors {
  const e: ClimateRiskErrors = {};
  if (!row.risk) e.risk = "Climate risk is required.";
  if (row.risk && isOtherRisk(row.risk) && !(row.risk_other ?? "").trim()) {
    e.risk_other = 'Please specify — "Others" was selected for climate risk.';
  }
  return e;
}

function serializePayload(v: Data): Record<string, unknown> {
  const out: Record<string, unknown> = { ...v };
  for (const k of INT_KEYS) out[k] = toInt(v[k]);
  return out;
}

// ── Section component ─────────────────────────────────────────────────────

export function ESSSection({ uuid }: { uuid: string }) {
  const impactQuery = useQuery({
    queryKey: ["dpr-master", "environmental-impacts"],
    queryFn: () => dprMasterApi.list("environmental-impacts"),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const climateRiskQuery = useQuery({
    queryKey: ["dpr-master", "climate-risks"],
    queryFn: () => dprMasterApi.list("climate-risks"),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, fieldErrors, fieldWarnings, save, discard } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "ess",
    schema: Schema,
    defaultValues: {
      resources_used: [], conservation_measures: [], conservation_other: "",
      annual_electricity_requirement: "", annual_water_requirement: "", annual_fuel_requirement: "",
      safety_measures: [], safety_other: "",
      farmers_benefited: null, direct_jobs_created: null, indirect_jobs_created: null,
      women_beneficiaries: null, youth_beneficiaries: null, sc_st_beneficiaries: null,
      small_marginal_farmers: null, expected_income_increase: "",
      expected_post_harvest_loss_reduction: "",
      sustainability_initiatives: [], sustainability_other: "",
      environmental_initiatives: "", social_initiatives: "", governance_practices: "",
      environmental_impacts: [], climate_risks: [],
    },
    serializePayload,
  });

  // useWatch — reactive subscriptions (form.watch is stale after form.reset).
  const resources = useWatch({ control: form.control, name: "resources_used" }) ?? [];
  const conservation = useWatch({ control: form.control, name: "conservation_measures" }) ?? [];
  const safety = useWatch({ control: form.control, name: "safety_measures" }) ?? [];
  const sustainability = useWatch({ control: form.control, name: "sustainability_initiatives" }) ?? [];
  const impacts = useWatch({ control: form.control, name: "environmental_impacts" }) ?? [];
  const climateRisks = useWatch({ control: form.control, name: "climate_risks" }) ?? [];

  // Section-level watched text/textarea values.
  const conservationOther = useWatch({ control: form.control, name: "conservation_other" }) ?? "";
  const safetyOther = useWatch({ control: form.control, name: "safety_other" }) ?? "";
  const sustainabilityOther = useWatch({ control: form.control, name: "sustainability_other" }) ?? "";
  const annualElectricity = useWatch({ control: form.control, name: "annual_electricity_requirement" }) ?? "";
  const annualWater = useWatch({ control: form.control, name: "annual_water_requirement" }) ?? "";
  const annualFuel = useWatch({ control: form.control, name: "annual_fuel_requirement" }) ?? "";
  const expectedIncomeIncrease = useWatch({ control: form.control, name: "expected_income_increase" }) ?? "";
  const expectedPostHarvestLossReduction = useWatch({ control: form.control, name: "expected_post_harvest_loss_reduction" }) ?? "";
  const environmentalInitiatives = useWatch({ control: form.control, name: "environmental_initiatives" }) ?? "";
  const socialInitiatives = useWatch({ control: form.control, name: "social_initiatives" }) ?? "";
  const governancePractices = useWatch({ control: form.control, name: "governance_practices" }) ?? "";

  // E card integer watched values.
  const farmersBenefited = useWatch({ control: form.control, name: "farmers_benefited" });
  const directJobs = useWatch({ control: form.control, name: "direct_jobs_created" });
  const indirectJobs = useWatch({ control: form.control, name: "indirect_jobs_created" });
  const womenBeneficiaries = useWatch({ control: form.control, name: "women_beneficiaries" });
  const youthBeneficiaries = useWatch({ control: form.control, name: "youth_beneficiaries" });
  const scStBeneficiaries = useWatch({ control: form.control, name: "sc_st_beneficiaries" });
  const smallMarginalFarmers = useWatch({ control: form.control, name: "small_marginal_farmers" });

  // Convenience setter — always includes shouldDirty: true.
  const setField = <K extends keyof Data>(name: K, value: Data[K]) =>
    form.setValue(name as never, value as never, { shouldDirty: true });

  const toggle = (
    field: "resources_used" | "conservation_measures" | "safety_measures" | "sustainability_initiatives",
    code: string,
    checked: boolean,
  ) => {
    const cur = form.getValues(field) ?? [];
    setField(field, checked ? [...cur, code] : cur.filter((c) => c !== code));
  };

  // Section-level live errors — mirror ess_validators.py.
  const LIVE_CHECKED = new Set<string>([
    "conservation_other",
    "safety_other",
    "sustainability_other",
  ]);
  const liveErrors: Record<string, string | undefined> = {};
  if (conservation.includes("other") && !String(conservationOther).trim()) {
    liveErrors.conservation_other = 'Please specify — "Others" in conservation measures.';
  }
  if (safety.includes("other") && !String(safetyOther).trim()) {
    liveErrors.safety_other = 'Please specify — "Others" in safety measures.';
  }
  if (sustainability.includes("other") && !String(sustainabilityOther).trim()) {
    liveErrors.sustainability_other = 'Please specify — "Others" in sustainability initiatives.';
  }
  const err = (name: string): string | undefined =>
    LIVE_CHECKED.has(name) ? liveErrors[name] : fieldErrors.get(name);

  // Climate-risk warning: count rows without mitigation strategy. Backend
  // warns (not errors) per row via ess_validators; we surface an aggregate
  // banner on the C card so the user notices before generating the DPR.
  const climateRiskMissingMitigation = climateRisks.filter(
    (r) => !(r.proposed_mitigation_strategy ?? "").trim(),
  ).length;

  const loading = isLoading || impactQuery.isLoading || climateRiskQuery.isLoading;

  const isOtherImpact = (id: number | null) => {
    if (!id) return false;
    return impactQuery.data?.find((r) => r.id === id)?.code === "other";
  };
  const isOtherRisk = (id: number | null) => {
    if (!id) return false;
    return climateRiskQuery.data?.find((r) => r.id === id)?.code === "other";
  };

  // Reusable integer count input — E card beneficiaries.
  const intCountInput = (
    watchedValue: string | number | null | undefined,
    key: keyof Data,
    label: string,
  ) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="text"
        inputMode="numeric"
        maxLength={7}
        placeholder="e.g. 250"
        value={watchedValue !== null && watchedValue !== undefined ? String(watchedValue) : ""}
        onChange={(e) => {
          const cleaned = normaliseIntegerInput(e.target.value, { max: MAX_BENEFICIARIES, min: 0 });
          setField(key, (cleaned === "" ? null : cleaned) as Data[keyof Data]);
        }}
      />
    </div>
  );

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="ess"
      loading={loading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
      help={
        <SectionHelp
          title="Environmental, Social & Sustainability Assessment"
          purpose="Capture the environmental / social / sustainability footprint of the project — impacts + mitigations, resource use, climate risks, workplace safety, social impact numbers, sustainability initiatives, and ESG narrative. This feeds the ESS chapter of the DPR PDF and satisfies bank appraisal ESG disclosure requirements."
          whatToFill={[
            "A — Environmental Impacts. Add one row per identifiable impact (solid waste, wastewater, air emission, noise, etc.). Impact FK is required per row; 'Others' reveals a specify text. Estimated quantity, source, existing control measure + proposed mitigation all optional but expected in a real DPR.",
            "B — Resource Utilisation. Tick which major resources the project needs (electricity/water/fuel/raw materials/packaging) + conservation measures being applied. 'Others' reveals specify. Annual requirements are free text — include units.",
            "C — Climate Risks. Add one row per climate risk relevant to the location (erratic monsoon, flooding, heatwave, cyclone, etc.). Backend WARNS if a risk has no mitigation strategy — always fill the mitigation for each risk added.",
            "D — Occupational Health & Safety. Multi-select from 10 workplace safety measures. Ticking 'Others' requires the specify text.",
            "E — Social Impact. Numbers of beneficiaries (farmers, jobs, women/youth/SC-ST, small & marginal). Expected income increase + post-harvest loss reduction as free text (include %).",
            "F — Sustainability Measures. Multi-select from 10 initiatives (renewable energy, organic production, waste recycling, eco packaging, circular economy, etc.). 'Others' requires specify.",
            "G — ESG Narrative (optional). Three free-text areas: Environmental initiatives, Social initiatives, Governance practices. Used by AI narrative for the ESG paragraph in the DPR PDF.",
          ]}
          tips={[
            "Environmental impacts and climate risks are the two headline sections bank appraisers zoom in on. Even 2-3 well-described rows beat 10 shallow ones.",
            "Every climate risk should have a mitigation. The backend warns you if not; the DPR PDF renders those as red flags in the risk chapter.",
            "For social impact numbers, err on the accurate side — inflated 'farmers benefited' numbers get called out in due diligence. Use the FPO member roll as the upper bound.",
            "Sustainability initiatives dovetail with the Renewable Initiatives Cat J of the Utilities section — tick what you already committed to there.",
            "ESG narrative (Cat G) is optional but powerful for bankers who filter by ESG-compliant projects. Even 2-3 short sentences per bucket helps.",
            "Cross-check Cat D safety with Compliance Cat E (Labour) and Utilities Cat I (Fire & Safety) — the three should align.",
          ]}
          downstream={[
            "ESS chapter in the DPR PDF — full A-G profile renders there",
            "Risk Analysis chapter — climate risks + environmental impacts feed the risk matrix",
            "Compliance chapter — sustainability initiatives inform Cat C (Environmental Compliance) status",
            "AI narrative — ESG data feeds the Sustainability paragraph and often the Executive Summary",
            "Bank appraisal ESG scorecard — most Indian banks now require ESS disclosure at project appraisal stage",
          ]}
        />
      }
    >
      <div className="space-y-4">
        {/* A. Environmental Impacts — id enables readiness-panel deep-link scroll */}
        <div id="dpr-field-environmental_impacts" />
        <NestedListCard<Impact>
          title="A. Environmental Impact"
          items={impacts}
          onChange={(next) => form.setValue("environmental_impacts", next, { shouldDirty: true })}
          warning={fieldWarnings.get("environmental_impacts")}
          emptyRow={{ impact: null, impact_other: "", estimated_quantity: "", source: "", existing_control_measure: "", proposed_mitigation_measure: "" }}
          columns={[
            { key: "impact", label: "Impact", render: (v) => (impactQuery.data?.find((r) => r.id === v)?.label as string) ?? "—" },
            { key: "estimated_quantity", label: "Estimated qty" },
            { key: "proposed_mitigation_measure", label: "Mitigation", render: (v) => ((v as string)?.slice(0, 40) ?? "") + ((v as string)?.length > 40 ? "…" : "") },
          ]}
          isValid={(row) => Object.keys(validateImpact(row, isOtherImpact)).length === 0}
          addLabel="Add impact"
          editLabel="Edit impact"
          renderModal={(row, set) => {
            const iErr = validateImpact(row, isOtherImpact);
            return (
              <>
                <ModalField label="Impact *" error={iErr.impact}>
                  <MasterSearchableSelect
                    value={row.impact}
                    options={impactQuery.data ?? []}
                    onChange={(v) => set("impact", v)}
                    placeholder="Type to search impact…"
                  />
                </ModalField>
                {isOtherImpact(row.impact) && (
                  <ModalField label="Please specify (Others) *" error={iErr.impact_other}>
                    <Input
                      value={row.impact_other}
                      maxLength={MAX_OTHER_TEXT_CHARS}
                      onChange={(e) => set("impact_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
                    />
                  </ModalField>
                )}
                <ModalRow>
                  <ModalField label="Estimated quantity">
                    <Input
                      value={row.estimated_quantity}
                      maxLength={MAX_TEXT_CHARS}
                      onChange={(e) => set("estimated_quantity", e.target.value.slice(0, MAX_TEXT_CHARS))}
                    />
                  </ModalField>
                  <ModalField label="Source">
                    <Input
                      value={row.source}
                      maxLength={MAX_LONG_CHARS}
                      onChange={(e) => set("source", e.target.value.slice(0, MAX_LONG_CHARS))}
                    />
                  </ModalField>
                </ModalRow>
                <ModalField label="Existing control measure">
                  <CountedTextarea
                    rows={2}
                    maxChars={MAX_LONG_TEXT_CHARS}
                    value={row.existing_control_measure}
                    onChange={(v) => set("existing_control_measure", v)}
                  />
                </ModalField>
                <ModalField label="Proposed mitigation measure">
                  <CountedTextarea
                    rows={2}
                    maxChars={MAX_LONG_TEXT_CHARS}
                    value={row.proposed_mitigation_measure}
                    onChange={(v) => set("proposed_mitigation_measure", v)}
                  />
                </ModalField>
              </>
            );
          }}
        />

        {/* B. Resource Utilisation */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">B. Resource Utilisation</h3>
          <div>
            <Label>Major resources required</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {RESOURCES.map((o) => (
                <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={resources.includes(o.value)} onCheckedChange={(c) => toggle("resources_used", o.value, !!c)} />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>Conservation measures</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {CONSERVATION.map((o) => (
                <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={conservation.includes(o.value)} onCheckedChange={(c) => toggle("conservation_measures", o.value, !!c)} />
                  {o.label}
                </label>
              ))}
            </div>
            {conservation.includes("other") && (
              <div id="dpr-field-conservation_other" className="mt-2 space-y-1.5">
                <Label className={err("conservation_other") ? "text-xs text-destructive" : "text-xs"}>
                  Please specify (Others) *
                </Label>
                <Input
                  value={conservationOther as string}
                  maxLength={MAX_OTHER_TEXT_CHARS}
                  onChange={(e) => setField("conservation_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
                />
                {err("conservation_other") && (
                  <p className="text-xs text-destructive">{err("conservation_other")}</p>
                )}
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Annual electricity</Label>
              <Input
                value={annualElectricity as string}
                maxLength={MAX_TEXT_CHARS}
                onChange={(e) => setField("annual_electricity_requirement", e.target.value.slice(0, MAX_TEXT_CHARS))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Annual water</Label>
              <Input
                value={annualWater as string}
                maxLength={MAX_TEXT_CHARS}
                onChange={(e) => setField("annual_water_requirement", e.target.value.slice(0, MAX_TEXT_CHARS))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Annual fuel</Label>
              <Input
                value={annualFuel as string}
                maxLength={MAX_TEXT_CHARS}
                onChange={(e) => setField("annual_fuel_requirement", e.target.value.slice(0, MAX_TEXT_CHARS))}
              />
            </div>
          </div>
        </CardContent></Card>

        {/* C. Climate Risks — id enables readiness-panel deep-link scroll */}
        <div id="dpr-field-climate_risks" />
        <NestedListCard<ClimateRisk>
          title="C. Climate Resilience"
          items={climateRisks}
          onChange={(next) => form.setValue("climate_risks", next, { shouldDirty: true })}
          warning={
            climateRiskMissingMitigation > 0
              ? `${climateRiskMissingMitigation} climate risk${climateRiskMissingMitigation === 1 ? "" : "s"} missing a mitigation strategy — recommended per KAU spec.`
              : fieldWarnings.get("climate_risks")
          }
          emptyRow={{ risk: null, risk_other: "", expected_impact: "", proposed_mitigation_strategy: "" }}
          columns={[
            { key: "risk", label: "Climate risk", render: (v) => (climateRiskQuery.data?.find((r) => r.id === v)?.label as string) ?? "—" },
            { key: "proposed_mitigation_strategy", label: "Mitigation", render: (v) => ((v as string)?.slice(0, 40) ?? "") + ((v as string)?.length > 40 ? "…" : "") },
          ]}
          isValid={(row) => Object.keys(validateClimateRisk(row, isOtherRisk)).length === 0}
          addLabel="Add climate risk"
          editLabel="Edit climate risk"
          renderModal={(row, set) => {
            const rErr = validateClimateRisk(row, isOtherRisk);
            return (
              <>
                <ModalField label="Climate risk *" error={rErr.risk}>
                  <MasterSearchableSelect
                    value={row.risk}
                    options={climateRiskQuery.data ?? []}
                    onChange={(v) => set("risk", v)}
                    placeholder="Type to search risk…"
                  />
                </ModalField>
                {isOtherRisk(row.risk) && (
                  <ModalField label="Please specify (Others) *" error={rErr.risk_other}>
                    <Input
                      value={row.risk_other}
                      maxLength={MAX_OTHER_TEXT_CHARS}
                      onChange={(e) => set("risk_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
                    />
                  </ModalField>
                )}
                <ModalField label="Expected impact">
                  <CountedTextarea
                    rows={2}
                    maxChars={MAX_LONG_TEXT_CHARS}
                    value={row.expected_impact}
                    onChange={(v) => set("expected_impact", v)}
                  />
                </ModalField>
                <ModalField label="Proposed mitigation strategy">
                  <CountedTextarea
                    rows={2}
                    maxChars={MAX_LONG_TEXT_CHARS}
                    value={row.proposed_mitigation_strategy}
                    onChange={(v) => set("proposed_mitigation_strategy", v)}
                  />
                </ModalField>
              </>
            );
          }}
        />

        {/* D. Safety */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">D. Occupational Health & Safety</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {SAFETY.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={safety.includes(o.value)} onCheckedChange={(c) => toggle("safety_measures", o.value, !!c)} />
                {o.label}
              </label>
            ))}
          </div>
          {safety.includes("other") && (
            <div id="dpr-field-safety_other" className="space-y-1.5">
              <Label className={err("safety_other") ? "text-xs text-destructive" : "text-xs"}>
                Please specify (Others) *
              </Label>
              <Input
                value={safetyOther as string}
                maxLength={MAX_OTHER_TEXT_CHARS}
                onChange={(e) => setField("safety_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
              />
              {err("safety_other") && (
                <p className="text-xs text-destructive">{err("safety_other")}</p>
              )}
            </div>
          )}
        </CardContent></Card>

        {/* E. Social Impact */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">E. Social Impact</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {intCountInput(farmersBenefited, "farmers_benefited", "Farmers benefited")}
            {intCountInput(directJobs, "direct_jobs_created", "Direct jobs")}
            {intCountInput(indirectJobs, "indirect_jobs_created", "Indirect jobs")}
            {intCountInput(womenBeneficiaries, "women_beneficiaries", "Women")}
            {intCountInput(youthBeneficiaries, "youth_beneficiaries", "Youth")}
            {intCountInput(scStBeneficiaries, "sc_st_beneficiaries", "SC/ST")}
            {intCountInput(smallMarginalFarmers, "small_marginal_farmers", "Small & marginal farmers")}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Expected farmer income increase</Label>
              <Input
                value={expectedIncomeIncrease as string}
                maxLength={MAX_TEXT_CHARS}
                placeholder="e.g. ~₹8,000/farmer/year (25-30 %)"
                onChange={(e) => setField("expected_income_increase", e.target.value.slice(0, MAX_TEXT_CHARS))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Expected post-harvest loss reduction</Label>
              <Input
                value={expectedPostHarvestLossReduction as string}
                maxLength={MAX_TEXT_CHARS}
                placeholder="e.g. ~15 % (copra spoilage down)"
                onChange={(e) => setField("expected_post_harvest_loss_reduction", e.target.value.slice(0, MAX_TEXT_CHARS))}
              />
            </div>
          </div>
        </CardContent></Card>

        {/* F. Sustainability */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">F. Sustainability Measures</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {SUSTAINABILITY.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={sustainability.includes(o.value)} onCheckedChange={(c) => toggle("sustainability_initiatives", o.value, !!c)} />
                {o.label}
              </label>
            ))}
          </div>
          {sustainability.includes("other") && (
            <div id="dpr-field-sustainability_other" className="space-y-1.5">
              <Label className={err("sustainability_other") ? "text-xs text-destructive" : "text-xs"}>
                Please specify (Others) *
              </Label>
              <Input
                value={sustainabilityOther as string}
                maxLength={MAX_OTHER_TEXT_CHARS}
                onChange={(e) => setField("sustainability_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
              />
              {err("sustainability_other") && (
                <p className="text-xs text-destructive">{err("sustainability_other")}</p>
              )}
            </div>
          )}
        </CardContent></Card>

        {/* G. ESG */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">G. ESG (Optional)</h3>
          <div className="space-y-1.5">
            <Label className="text-xs">Environmental initiatives</Label>
            <CountedTextarea
              rows={2}
              maxChars={MAX_LONG_TEXT_CHARS}
              value={environmentalInitiatives as string}
              onChange={(v) => setField("environmental_initiatives", v)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Social initiatives</Label>
            <CountedTextarea
              rows={2}
              maxChars={MAX_LONG_TEXT_CHARS}
              value={socialInitiatives as string}
              onChange={(v) => setField("social_initiatives", v)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Governance practices</Label>
            <CountedTextarea
              rows={2}
              maxChars={MAX_LONG_TEXT_CHARS}
              value={governancePractices as string}
              onChange={(v) => setField("governance_practices", v)}
            />
          </div>
        </CardContent></Card>
      </div>
    </SectionShell>
  );
}
