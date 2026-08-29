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
  MasterSelect,
  ModalField,
  ModalRow,
  NestedListCard,
} from "./nested-list";
import { SectionShell } from "./section-shell";

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

const ImpactSchema = z.object({
  id: z.number().optional(),
  impact: z.number(),
  impact_other: z.string(),
  estimated_quantity: z.string(),
  source: z.string(),
  existing_control_measure: z.string(),
  proposed_mitigation_measure: z.string(),
});
type Impact = z.infer<typeof ImpactSchema>;

const ClimateRiskSchema = z.object({
  id: z.number().optional(),
  risk: z.number(),
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

function serializePayload(v: Data): Record<string, unknown> {
  const out: Record<string, unknown> = { ...v };
  for (const k of INT_KEYS) out[k] = toInt(v[k]);
  return out;
}

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

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, save, discard } = useDprSectionForm<Data>({
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

  const toggle = (field: "resources_used" | "conservation_measures" | "safety_measures" | "sustainability_initiatives", code: string, checked: boolean) => {
    const cur = form.getValues(field) ?? [];
    form.setValue(field, checked ? [...cur, code] : cur.filter((c) => c !== code), { shouldDirty: true });
  };

  const loading = isLoading || impactQuery.isLoading || climateRiskQuery.isLoading;

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
    >
      <div className="space-y-4">
        {/* A. Environmental Impacts */}
        <NestedListCard<Impact>
          title="A. Environmental Impact"
          items={impacts}
          onChange={(next) => form.setValue("environmental_impacts", next, { shouldDirty: true })}
          emptyRow={{ impact: 0, impact_other: "", estimated_quantity: "", source: "", existing_control_measure: "", proposed_mitigation_measure: "" }}
          columns={[
            { key: "impact", label: "Impact", render: (v) => (impactQuery.data?.find((r) => r.id === v)?.label as string) ?? "—" },
            { key: "estimated_quantity", label: "Estimated qty" },
            { key: "proposed_mitigation_measure", label: "Mitigation", render: (v) => ((v as string)?.slice(0, 40) ?? "") + ((v as string)?.length > 40 ? "…" : "") },
          ]}
          isValid={(row) => row.impact > 0}
          addLabel="Add impact"
          editLabel="Edit impact"
          renderModal={(row, set) => (
            <>
              <ModalField label="Impact *">
                <MasterSelect value={row.impact === 0 ? null : row.impact} options={impactQuery.data ?? []} onChange={(v) => set("impact", (v ?? 0) as number)} />
              </ModalField>
              {impactQuery.data?.find((r) => r.id === row.impact)?.code === "other" && (
                <ModalField label="Specify"><Input value={row.impact_other} onChange={(e) => set("impact_other", e.target.value)} /></ModalField>
              )}
              <ModalRow>
                <ModalField label="Estimated quantity"><Input value={row.estimated_quantity} onChange={(e) => set("estimated_quantity", e.target.value)} /></ModalField>
                <ModalField label="Source"><Input value={row.source} onChange={(e) => set("source", e.target.value)} /></ModalField>
              </ModalRow>
              <ModalField label="Existing control measure"><Textarea rows={2} value={row.existing_control_measure} onChange={(e) => set("existing_control_measure", e.target.value)} /></ModalField>
              <ModalField label="Proposed mitigation measure"><Textarea rows={2} value={row.proposed_mitigation_measure} onChange={(e) => set("proposed_mitigation_measure", e.target.value)} /></ModalField>
            </>
          )}
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
              <div className="mt-2 space-y-1.5"><Label className="text-xs">Specify (Others)</Label><Input {...form.register("conservation_other")} /></div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5"><Label className="text-xs">Annual electricity</Label><Input {...form.register("annual_electricity_requirement")} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Annual water</Label><Input {...form.register("annual_water_requirement")} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Annual fuel</Label><Input {...form.register("annual_fuel_requirement")} /></div>
          </div>
        </CardContent></Card>

        {/* C. Climate Risks */}
        <NestedListCard<ClimateRisk>
          title="C. Climate Resilience"
          items={climateRisks}
          onChange={(next) => form.setValue("climate_risks", next, { shouldDirty: true })}
          emptyRow={{ risk: 0, risk_other: "", expected_impact: "", proposed_mitigation_strategy: "" }}
          columns={[
            { key: "risk", label: "Climate risk", render: (v) => (climateRiskQuery.data?.find((r) => r.id === v)?.label as string) ?? "—" },
            { key: "proposed_mitigation_strategy", label: "Mitigation", render: (v) => ((v as string)?.slice(0, 40) ?? "") + ((v as string)?.length > 40 ? "…" : "") },
          ]}
          isValid={(row) => row.risk > 0}
          addLabel="Add climate risk"
          editLabel="Edit climate risk"
          renderModal={(row, set) => (
            <>
              <ModalField label="Climate risk *">
                <MasterSelect value={row.risk === 0 ? null : row.risk} options={climateRiskQuery.data ?? []} onChange={(v) => set("risk", (v ?? 0) as number)} />
              </ModalField>
              {climateRiskQuery.data?.find((r) => r.id === row.risk)?.code === "other" && (
                <ModalField label="Specify"><Input value={row.risk_other} onChange={(e) => set("risk_other", e.target.value)} /></ModalField>
              )}
              <ModalField label="Expected impact"><Textarea rows={2} value={row.expected_impact} onChange={(e) => set("expected_impact", e.target.value)} /></ModalField>
              <ModalField label="Proposed mitigation strategy"><Textarea rows={2} value={row.proposed_mitigation_strategy} onChange={(e) => set("proposed_mitigation_strategy", e.target.value)} /></ModalField>
            </>
          )}
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
            <div className="space-y-1.5"><Label className="text-xs">Specify (Others)</Label><Input {...form.register("safety_other")} /></div>
          )}
        </CardContent></Card>

        {/* E. Social Impact */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">E. Social Impact</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {[["farmers_benefited","Farmers benefited"],["direct_jobs_created","Direct jobs"],["indirect_jobs_created","Indirect jobs"],["women_beneficiaries","Women"],["youth_beneficiaries","Youth"],["sc_st_beneficiaries","SC/ST"],["small_marginal_farmers","Small & marginal farmers"]].map(([k,l]) => (
              <div key={k} className="space-y-1.5">
                <Label className="text-xs">{l}</Label>
                <Input type="number" min="0" {...form.register(k as keyof Data)} />
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label className="text-xs">Expected farmer income increase</Label><Input {...form.register("expected_income_increase")} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Expected post-harvest loss reduction</Label><Input {...form.register("expected_post_harvest_loss_reduction")} /></div>
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
            <div className="space-y-1.5"><Label className="text-xs">Specify (Others)</Label><Input {...form.register("sustainability_other")} /></div>
          )}
        </CardContent></Card>

        {/* G. ESG */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">G. ESG (Optional)</h3>
          <div className="space-y-1.5"><Label className="text-xs">Environmental initiatives</Label><Textarea rows={2} {...form.register("environmental_initiatives")} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Social initiatives</Label><Textarea rows={2} {...form.register("social_initiatives")} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Governance practices</Label><Textarea rows={2} {...form.register("governance_practices")} /></div>
        </CardContent></Card>
      </div>
    </SectionShell>
  );
}
