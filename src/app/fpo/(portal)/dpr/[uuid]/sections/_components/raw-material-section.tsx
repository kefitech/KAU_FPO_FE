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
import { api } from "@/lib/api/client";

import {
  ChoiceSelect,
  MasterSelect,
  ModalField,
  ModalRow,
  NestedListCard,
} from "./nested-list";
import { SectionShell } from "./section-shell";

/**
 * §2.3.10 Raw Material — 5 tables (biggest section by field count).
 * MVP version: covers all mandatory fields per KAU spec + core optional ones.
 * Field-by-field coverage of optional/additional info can be layered in later.
 */

const MONTHS = [
  ["jan", "Jan"], ["feb", "Feb"], ["mar", "Mar"], ["apr", "Apr"],
  ["may", "May"], ["jun", "Jun"], ["jul", "Jul"], ["aug", "Aug"],
  ["sep", "Sep"], ["oct", "Oct"], ["nov", "Nov"], ["dec", "Dec"],
] as const;

const FREQUENCY = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "seasonal", label: "Seasonal" },
  { value: "as_required", label: "As Required" },
];

const PRICE_BASIS = [
  { value: "recent_purchase", label: "Recent Purchase" },
  { value: "supplier_quotation", label: "Supplier Quotation" },
  { value: "market_survey", label: "Market Survey" },
  { value: "govt_price", label: "Government Price" },
  { value: "other", label: "Other (Specify)" },
];

const PRICE_VARIATION = [
  { value: "low", label: "Low (<10%)" },
  { value: "moderate", label: "Moderate (10–25%)" },
  { value: "high", label: "High (>25%)" },
];

const RISK_TYPES = [
  { value: "seasonal_shortage", label: "Seasonal Shortage" },
  { value: "climate_risk", label: "Climate Risk" },
  { value: "pest_disease", label: "Pest and Disease" },
  { value: "price_fluctuation", label: "Price Fluctuation" },
  { value: "transportation", label: "Transportation Issues" },
  { value: "labour_shortage", label: "Labour Shortage" },
  { value: "competition", label: "Competition for Raw Material" },
  { value: "quality_variation", label: "Quality Variation" },
  { value: "import_dependence", label: "Import Dependence" },
  { value: "other", label: "Other (Specify)" },
];

// Cross-platform commodity endpoint (not DPR-specific).
// Public master-data endpoint returns { category, count, results: [{id, code, name}] }.
// The `id` is the MasterLookup PK — the FK expected by the DPR Material row.
type CommodityRow = { id: number; code: string; name: string };
type MasterDataResponse = { category: string; count: number; results: CommodityRow[] };
async function fetchCommodities(): Promise<{ id: number; label: string }[]> {
  const r = await api.get<MasterDataResponse>("/public/master-data/", {
    params: { category: "commodity" },
  });
  return (r.data.results ?? []).map((x) => ({ id: x.id, label: x.name }));
}

const MaterialSchema = z.object({
  id: z.number().optional(),
  order: z.number(),
  name: z.string(),
  scientific_name: z.string().optional(),
  variety_grade: z.string().optional(),
  commodity: z.number().nullable(),
  unit_of_purchase: z.number().nullable(),
  estimated_annual_requirement: z.union([z.string(), z.number()]).nullable(),
  approx_purchase_price: z.union([z.string(), z.number()]).nullable(),
  primary_source: z.number().nullable(),
  primary_source_other: z.string().optional(),
  procurement_method: z.number().nullable(),
  procurement_method_other: z.string().optional(),
  estimated_qty_available_annual: z.union([z.string(), z.number()]).nullable(),
  num_supplying_farmers: z.union([z.string(), z.number()]).nullable(),
  num_supplying_villages: z.union([z.string(), z.number()]).nullable(),
  available_months: z.array(z.string()),
  available_throughout_year: z.boolean(),
  peak_harvest_season: z.string().optional(),
  lean_season: z.string().optional(),
  storage_required: z.boolean().nullable(),
  off_season_strategy: z.string().optional(),
  quality_standards_applicable: z.boolean(),
  grade: z.string().optional(),
  quality_standard: z.number().nullable(),
  certification_required: z.boolean().nullable(),
  quality_testing_required: z.boolean().nullable(),
  quality_parameters: z.array(z.number()),
  quality_remarks: z.string().optional(),
  current_purchase_price: z.union([z.string(), z.number()]).nullable(),
  price_estimation_basis: z.string(),
  price_estimation_basis_other: z.string().optional(),
  price_varies_seasonally: z.boolean(),
  price_variation_range: z.string(),
});
type Material = z.infer<typeof MaterialSchema>;

const RiskSchema = z.object({
  id: z.number().optional(),
  risk_type: z.string(),
  risk_type_other: z.string(),
  mitigation_strategy: z.string(),
  existing_practices: z.string(),
  previous_experience: z.string(),
});
type Risk = z.infer<typeof RiskSchema>;

const PackagingSchema = z.object({
  id: z.number().optional(),
  order: z.number(),
  material_name: z.string(),
  purpose: z.string(),
  unit: z.number().nullable(),
  estimated_annual_requirement: z.union([z.string(), z.number()]).nullable(),
  unit_cost: z.union([z.string(), z.number()]).nullable(),
  supplier: z.string(),
});
type Packaging = z.infer<typeof PackagingSchema>;

const ConsumableSchema = z.object({
  id: z.number().optional(),
  order: z.number(),
  name: z.string(),
  purpose: z.string(),
  estimated_annual_requirement: z.union([z.string(), z.number()]).nullable(),
  unit: z.number().nullable(),
  unit_cost: z.union([z.string(), z.number()]).nullable(),
});
type Consumable = z.infer<typeof ConsumableSchema>;

const Schema = z.object({
  procurement_model: z.number().nullable(),
  procurement_model_other: z.string(),
  procurement_frequency: z.string(),
  collection_method: z.string(),
  transportation_arrangement: z.string(),
  avg_procurement_cost: z.union([z.string(), z.number()]).nullable(),
  loading_cost: z.union([z.string(), z.number()]).nullable(),
  unloading_cost: z.union([z.string(), z.number()]).nullable(),
  sorting_grading_cost: z.union([z.string(), z.number()]).nullable(),
  handling_charges: z.union([z.string(), z.number()]).nullable(),
  materials: z.array(MaterialSchema),
  risks: z.array(RiskSchema),
  packaging_materials: z.array(PackagingSchema),
  consumables: z.array(ConsumableSchema),
});
type Data = z.infer<typeof Schema>;

function toDec(v: string | number | null): string | null {
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? String(n) : null;
}
function toInt(v: string | number | null): number | null {
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function serializePayload(v: Data): Record<string, unknown> {
  return {
    ...v,
    avg_procurement_cost: toDec(v.avg_procurement_cost),
    loading_cost: toDec(v.loading_cost),
    unloading_cost: toDec(v.unloading_cost),
    sorting_grading_cost: toDec(v.sorting_grading_cost),
    handling_charges: toDec(v.handling_charges),
    materials: v.materials.map((m, i) => ({
      ...m,
      order: i,
      estimated_annual_requirement: toDec(m.estimated_annual_requirement),
      approx_purchase_price: toDec(m.approx_purchase_price),
      estimated_qty_available_annual: toDec(m.estimated_qty_available_annual),
      num_supplying_farmers: toInt(m.num_supplying_farmers),
      num_supplying_villages: toInt(m.num_supplying_villages),
      current_purchase_price: toDec(m.current_purchase_price),
    })),
    packaging_materials: v.packaging_materials.map((p, i) => ({
      ...p,
      order: i,
      estimated_annual_requirement: toDec(p.estimated_annual_requirement),
      unit_cost: toDec(p.unit_cost),
    })),
    consumables: v.consumables.map((c, i) => ({
      ...c,
      order: i,
      estimated_annual_requirement: toDec(c.estimated_annual_requirement),
      unit_cost: toDec(c.unit_cost),
    })),
  };
}

export function RawMaterialSection({ uuid }: { uuid: string }) {
  const unitQuery = useQuery({ queryKey: ["dpr-master", "capacity-units"], queryFn: () => dprMasterApi.list("capacity-units"), staleTime: 24 * 60 * 60 * 1000 });
  const sourceQuery = useQuery({ queryKey: ["dpr-master", "raw-material-sources"], queryFn: () => dprMasterApi.list("raw-material-sources"), staleTime: 24 * 60 * 60 * 1000 });
  const procModelQuery = useQuery({ queryKey: ["dpr-master", "procurement-models"], queryFn: () => dprMasterApi.list("procurement-models"), staleTime: 24 * 60 * 60 * 1000 });
  const qStandardQuery = useQuery({ queryKey: ["dpr-master", "quality-standards"], queryFn: () => dprMasterApi.list("quality-standards"), staleTime: 24 * 60 * 60 * 1000 });
  const qParamsQuery = useQuery({ queryKey: ["dpr-master", "quality-parameters"], queryFn: () => dprMasterApi.list("quality-parameters"), staleTime: 24 * 60 * 60 * 1000 });
  const commodityQuery = useQuery({ queryKey: ["public-master", "commodity"], queryFn: fetchCommodities, staleTime: 24 * 60 * 60 * 1000 });

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, save, discard } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "raw-material",
    schema: Schema,
    defaultValues: {
      procurement_model: null, procurement_model_other: "",
      procurement_frequency: "", collection_method: "", transportation_arrangement: "",
      avg_procurement_cost: null, loading_cost: null, unloading_cost: null,
      sorting_grading_cost: null, handling_charges: null,
      materials: [], risks: [], packaging_materials: [], consumables: [],
    },
    serializePayload,
  });

  // useWatch — reactive subscriptions that reliably re-render after form.reset()
  // from server data. Using form.watch() would leave the list stale after save/reload.
  const materials = useWatch({ control: form.control, name: "materials" }) ?? [];
  const risks = useWatch({ control: form.control, name: "risks" }) ?? [];
  const packaging = useWatch({ control: form.control, name: "packaging_materials" }) ?? [];
  const consumables = useWatch({ control: form.control, name: "consumables" }) ?? [];
  const procurementModel = useWatch({ control: form.control, name: "procurement_model" });
  const procurementFrequency = useWatch({ control: form.control, name: "procurement_frequency" });

  const EMPTY_MATERIAL: Material = {
    order: 0, name: "", scientific_name: "", variety_grade: "", commodity: null,
    unit_of_purchase: null, estimated_annual_requirement: null, approx_purchase_price: null,
    primary_source: null, primary_source_other: "",
    procurement_method: null, procurement_method_other: "",
    estimated_qty_available_annual: null, num_supplying_farmers: null, num_supplying_villages: null,
    available_months: [], available_throughout_year: false,
    peak_harvest_season: "", lean_season: "", storage_required: null, off_season_strategy: "",
    quality_standards_applicable: false, grade: "", quality_standard: null,
    certification_required: null, quality_testing_required: null, quality_parameters: [], quality_remarks: "",
    current_purchase_price: null, price_estimation_basis: "", price_estimation_basis_other: "",
    price_varies_seasonally: false, price_variation_range: "",
  };

  const loading = isLoading || unitQuery.isLoading || sourceQuery.isLoading || procModelQuery.isLoading;

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="raw-material"
      loading={loading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
    >
      <div className="space-y-4">
        {/* Materials */}
        <NestedListCard<Material>
          title="A/B/D/E. Primary Raw Materials"
          items={materials}
          onChange={(next) => form.setValue("materials", next, { shouldDirty: true })}
          emptyRow={EMPTY_MATERIAL}
          columns={[
            { key: "name", label: "Name" },
            { key: "primary_source", label: "Source", render: (v) => (sourceQuery.data?.find((r) => r.id === v)?.label as string) ?? "—" },
            { key: "estimated_annual_requirement", label: "Annual req." },
            { key: "current_purchase_price", label: "Price/unit (₹)" },
          ]}
          isValid={(row) => row.name.trim().length > 0}
          addLabel="Add raw material"
          editLabel="Edit raw material"
          renderModal={(row, set) => (
            <>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">A. Primary raw material</p>
                <ModalField label="Raw material name *"><Input value={row.name} onChange={(e) => set("name", e.target.value)} /></ModalField>
                <ModalRow>
                  <ModalField label="Scientific name"><Input value={row.scientific_name ?? ""} onChange={(e) => set("scientific_name", e.target.value)} /></ModalField>
                  <ModalField label="Variety / grade"><Input value={row.variety_grade ?? ""} onChange={(e) => set("variety_grade", e.target.value)} /></ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Commodity"><MasterSelect value={row.commodity} options={commodityQuery.data ?? []} onChange={(v) => set("commodity", v)} /></ModalField>
                  <ModalField label="Unit of purchase *"><MasterSelect value={row.unit_of_purchase} options={unitQuery.data ?? []} onChange={(v) => set("unit_of_purchase", v)} /></ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Estimated annual requirement *"><Input type="number" step="0.001" value={row.estimated_annual_requirement ?? ""} onChange={(e) => set("estimated_annual_requirement", e.target.value || null)} /></ModalField>
                  <ModalField label="Approx. purchase price / unit (₹)"><Input type="number" step="0.01" value={row.approx_purchase_price ?? ""} onChange={(e) => set("approx_purchase_price", e.target.value || null)} /></ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Primary source *"><MasterSelect value={row.primary_source} options={sourceQuery.data ?? []} onChange={(v) => set("primary_source", v)} /></ModalField>
                  <ModalField label="Procurement method"><MasterSelect value={row.procurement_method} options={procModelQuery.data ?? []} onChange={(v) => set("procurement_method", v)} /></ModalField>
                </ModalRow>
              </div>

              <div className="mt-4 space-y-3 border-t pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">B. Availability</p>
                <ModalRow>
                  <ModalField label="Estimated qty available annually *"><Input type="number" step="0.001" value={row.estimated_qty_available_annual ?? ""} onChange={(e) => set("estimated_qty_available_annual", e.target.value || null)} /></ModalField>
                  <ModalField label="Supplying farmers"><Input type="number" min="0" value={row.num_supplying_farmers ?? ""} onChange={(e) => set("num_supplying_farmers", e.target.value || null)} /></ModalField>
                </ModalRow>
                <div>
                  <Label className="text-xs">Months of availability</Label>
                  <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-12">
                    {MONTHS.map(([code, label]) => {
                      const active = row.available_months.includes(code);
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => set("available_months", (active ? row.available_months.filter((c) => c !== code) : [...row.available_months, code]) as Material["available_months"])}
                          className={`rounded-md border px-1.5 py-1 text-[10px] font-medium transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={row.available_throughout_year} onCheckedChange={(c) => set("available_throughout_year", !!c)} />
                  Available throughout the year
                </label>
                {!row.available_throughout_year && (
                  <>
                    <ModalRow>
                      <ModalField label="Peak harvest season *"><Input value={row.peak_harvest_season ?? ""} onChange={(e) => set("peak_harvest_season", e.target.value)} /></ModalField>
                      <ModalField label="Lean season"><Input value={row.lean_season ?? ""} onChange={(e) => set("lean_season", e.target.value)} /></ModalField>
                    </ModalRow>
                    <ModalField label="Off-season procurement strategy *"><Textarea rows={2} value={row.off_season_strategy ?? ""} onChange={(e) => set("off_season_strategy", e.target.value)} /></ModalField>
                  </>
                )}
              </div>

              <div className="mt-4 space-y-3 border-t pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">D. Quality</p>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={row.quality_standards_applicable} onCheckedChange={(c) => set("quality_standards_applicable", !!c)} />
                  Quality standards applicable
                </label>
                {row.quality_standards_applicable && (
                  <ModalRow>
                    <ModalField label="Quality standard *"><MasterSelect value={row.quality_standard} options={qStandardQuery.data ?? []} onChange={(v) => set("quality_standard", v)} /></ModalField>
                    <ModalField label="Grade"><Input value={row.grade ?? ""} onChange={(e) => set("grade", e.target.value)} /></ModalField>
                  </ModalRow>
                )}
                <div>
                  <Label className="text-xs">Quality parameters</Label>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {(qParamsQuery.data ?? []).map((p) => (
                      <label key={p.id} className="flex cursor-pointer items-center gap-2 text-xs">
                        <Checkbox
                          checked={row.quality_parameters.includes(p.id)}
                          onCheckedChange={(c) => set("quality_parameters", (c ? [...row.quality_parameters, p.id] : row.quality_parameters.filter((i) => i !== p.id)) as number[])}
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3 border-t pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">E. Price</p>
                <ModalRow>
                  <ModalField label="Current purchase price / unit (₹) *"><Input type="number" step="0.01" value={row.current_purchase_price ?? ""} onChange={(e) => set("current_purchase_price", e.target.value || null)} /></ModalField>
                  <ModalField label="Basis of pricing"><ChoiceSelect value={row.price_estimation_basis} options={PRICE_BASIS} onChange={(v) => set("price_estimation_basis", v)} /></ModalField>
                </ModalRow>
                {row.price_estimation_basis === "other" && (
                  <ModalField label="Please specify (Others) *"><Input value={row.price_estimation_basis_other ?? ""} onChange={(e) => set("price_estimation_basis_other", e.target.value)} /></ModalField>
                )}
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={row.price_varies_seasonally} onCheckedChange={(c) => set("price_varies_seasonally", !!c)} />
                  Price varies seasonally
                </label>
                {row.price_varies_seasonally && (
                  <ModalField label="Price variation range"><ChoiceSelect value={row.price_variation_range} options={PRICE_VARIATION} onChange={(v) => set("price_variation_range", v)} /></ModalField>
                )}
              </div>
            </>
          )}
        />

        {/* C. Procurement System (section-level) */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">C. Procurement System</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label className="text-xs">Procurement model *</Label><MasterSelect value={procurementModel} options={procModelQuery.data ?? []} onChange={(v) => form.setValue("procurement_model", v, { shouldDirty: true })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Procurement frequency *</Label><ChoiceSelect value={procurementFrequency ?? ""} options={FREQUENCY} onChange={(v) => form.setValue("procurement_frequency", v, { shouldDirty: true })} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label className="text-xs">Collection method</Label><Input {...form.register("collection_method")} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Transportation arrangement</Label><Input {...form.register("transportation_arrangement")} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[["avg_procurement_cost","Avg. procurement cost"],["loading_cost","Loading cost"],["unloading_cost","Unloading cost"],["sorting_grading_cost","Sorting / grading"],["handling_charges","Handling charges"]].map(([k,l]) => (
              <div key={k} className="space-y-1.5"><Label className="text-xs">{l} (₹)</Label><Input type="number" step="0.01" {...form.register(k as keyof Data)} /></div>
            ))}
          </div>
        </CardContent></Card>

        {/* F. Risks */}
        <NestedListCard<Risk>
          title="F. Supply Risk Assessment"
          items={risks}
          onChange={(next) => form.setValue("risks", next, { shouldDirty: true })}
          emptyRow={{ risk_type: "", risk_type_other: "", mitigation_strategy: "", existing_practices: "", previous_experience: "" }}
          columns={[
            { key: "risk_type", label: "Risk", render: (v) => RISK_TYPES.find((o) => o.value === v)?.label ?? "—" },
            { key: "mitigation_strategy", label: "Mitigation", render: (v) => ((v as string)?.slice(0, 40) ?? "") + ((v as string)?.length > 40 ? "…" : "") },
          ]}
          isValid={(row) => !!row.risk_type && row.mitigation_strategy.trim().length > 0}
          addLabel="Add risk"
          editLabel="Edit risk"
          renderModal={(row, set) => (
            <>
              <ModalField label="Risk *"><ChoiceSelect value={row.risk_type} options={RISK_TYPES} onChange={(v) => set("risk_type", v)} /></ModalField>
              {row.risk_type === "other" && (
                <ModalField label="Specify"><Input value={row.risk_type_other} onChange={(e) => set("risk_type_other", e.target.value)} /></ModalField>
              )}
              <ModalField label="Mitigation strategy *"><Textarea rows={2} value={row.mitigation_strategy} onChange={(e) => set("mitigation_strategy", e.target.value)} /></ModalField>
              <ModalField label="Existing practices"><Textarea rows={2} value={row.existing_practices} onChange={(e) => set("existing_practices", e.target.value)} /></ModalField>
              <ModalField label="Previous experience"><Textarea rows={2} value={row.previous_experience} onChange={(e) => set("previous_experience", e.target.value)} /></ModalField>
            </>
          )}
        />

        {/* G. Packaging */}
        <NestedListCard<Packaging>
          title="G. Packaging Materials"
          items={packaging}
          onChange={(next) => form.setValue("packaging_materials", next, { shouldDirty: true })}
          emptyRow={{ order: 0, material_name: "", purpose: "", unit: null, estimated_annual_requirement: null, unit_cost: null, supplier: "" }}
          columns={[
            { key: "material_name", label: "Material" },
            { key: "purpose", label: "Purpose" },
            { key: "estimated_annual_requirement", label: "Annual req." },
          ]}
          isValid={(row) => row.material_name.trim().length > 0}
          addLabel="Add packaging"
          editLabel="Edit packaging"
          renderModal={(row, set) => (
            <>
              <ModalField label="Material name *"><Input value={row.material_name} onChange={(e) => set("material_name", e.target.value)} /></ModalField>
              <ModalField label="Purpose"><Input value={row.purpose} onChange={(e) => set("purpose", e.target.value)} /></ModalField>
              <ModalRow>
                <ModalField label="Unit"><MasterSelect value={row.unit} options={unitQuery.data ?? []} onChange={(v) => set("unit", v)} /></ModalField>
                <ModalField label="Estimated annual requirement"><Input type="number" step="0.001" value={row.estimated_annual_requirement ?? ""} onChange={(e) => set("estimated_annual_requirement", e.target.value || null)} /></ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Unit cost (₹)"><Input type="number" step="0.01" value={row.unit_cost ?? ""} onChange={(e) => set("unit_cost", e.target.value || null)} /></ModalField>
                <ModalField label="Supplier"><Input value={row.supplier} onChange={(e) => set("supplier", e.target.value)} /></ModalField>
              </ModalRow>
            </>
          )}
        />

        {/* H. Consumables */}
        <NestedListCard<Consumable>
          title="H. Other Consumables"
          items={consumables}
          onChange={(next) => form.setValue("consumables", next, { shouldDirty: true })}
          emptyRow={{ order: 0, name: "", purpose: "", estimated_annual_requirement: null, unit: null, unit_cost: null }}
          columns={[
            { key: "name", label: "Consumable" },
            { key: "estimated_annual_requirement", label: "Annual req." },
            { key: "unit_cost", label: "Unit cost (₹)" },
          ]}
          isValid={(row) => row.name.trim().length > 0}
          addLabel="Add consumable"
          editLabel="Edit consumable"
          renderModal={(row, set) => (
            <>
              <ModalField label="Consumable name *"><Input value={row.name} onChange={(e) => set("name", e.target.value)} /></ModalField>
              <ModalField label="Purpose"><Input value={row.purpose} onChange={(e) => set("purpose", e.target.value)} /></ModalField>
              <ModalRow>
                <ModalField label="Unit"><MasterSelect value={row.unit} options={unitQuery.data ?? []} onChange={(v) => set("unit", v)} /></ModalField>
                <ModalField label="Estimated annual requirement"><Input type="number" step="0.001" value={row.estimated_annual_requirement ?? ""} onChange={(e) => set("estimated_annual_requirement", e.target.value || null)} /></ModalField>
              </ModalRow>
              <ModalField label="Unit cost (₹)"><Input type="number" step="0.01" value={row.unit_cost ?? ""} onChange={(e) => set("unit_cost", e.target.value || null)} /></ModalField>
            </>
          )}
        />
      </div>
    </SectionShell>
  );
}
