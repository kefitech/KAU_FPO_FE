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
import { api } from "@/lib/api/client";

import { SearchableSelect } from "@/components/ui/searchable-select";

import { CountedTextarea } from "./counted-textarea";
import {
  normaliseDecimalInput,
  normaliseIntegerInput,
} from "./dpr-input-normalisers";
import {
  ChoiceSelect,
  MasterSearchableSelect,
  ModalField,
  ModalRow,
  NestedListCard,
} from "./nested-list";
import { SectionHelp } from "./section-help";
import { SectionShell } from "./section-shell";

// ── Input caps — mirror backend DPRSectionRawMaterial + nested models ───
// Text CharField widths (most 200, some 300, one 50).
const MAX_NAME_CHARS = 200;
const MAX_SCIENTIFIC_CHARS = 200;
const MAX_VARIETY_CHARS = 100;
const MAX_SEASON_CHARS = 200;
const MAX_GRADE_CHARS = 50;
const MAX_OTHER_TEXT_CHARS = 200;
const MAX_METHOD_TEXT_CHARS = 300;      // collection_method, transportation_arrangement
const MAX_LONG_TEXT_CHARS = 2000;       // TextField defensive cap — off_season_strategy,
                                        // quality_remarks, mitigation, existing_practices,
                                        // previous_experience, purpose fields, supplier

// Numeric bounds — matched to real business ranges (not backend column max).
// Decimal(18, 3) supports trillions; capped here to 1 billion units — larger
// than any credible FPO annual requirement.
const MAX_QTY = 1_000_000_000;
const MAX_PRICE_INR = 100_000_000;      // ₹10 crore per unit — very high
const MAX_COST_INR = 10_000_000_000;    // ₹1000 crore section-level cost cap
const MAX_FARMERS = 100_000;
// MAX_VILLAGES reserved for `num_supplying_villages` when that widget is
// added to the material modal (currently in the schema but not rendered).

// ── Per-row validator helpers (mirror raw_material_validators.py) ──────
// One helper per modal — used both for the modal Save-button gate AND
// (later) for surfacing inline field errors as the user types.
type MaterialErrors = Partial<Record<
  "name" | "unit_of_purchase" | "estimated_annual_requirement" | "primary_source"
  | "procurement_method" | "estimated_qty_available_annual" | "num_supplying_farmers"
  | "available_months" | "peak_harvest_season" | "off_season_strategy"
  | "quality_standard" | "current_purchase_price"
, string>>;

function validateMaterial(row: {
  name: string;
  unit_of_purchase: number | null;
  estimated_annual_requirement: string | number | null;
  primary_source: number | null;
  procurement_method: number | null;
  estimated_qty_available_annual: string | number | null;
  num_supplying_farmers: string | number | null;
  available_months: string[];
  available_throughout_year: boolean;
  peak_harvest_season?: string;
  off_season_strategy?: string;
  quality_standards_applicable: boolean;
  quality_standard: number | null;
  current_purchase_price: string | number | null;
}): MaterialErrors {
  const e: MaterialErrors = {};
  const gt0 = (v: unknown) => {
    if (v === null || v === undefined || v === "") return false;
    const n = Number(v);
    return Number.isFinite(n) && n > 0;
  };

  if (!(row.name ?? "").trim()) e.name = "Raw Material Name shall not be blank.";
  if (!row.unit_of_purchase) e.unit_of_purchase = "Unit of Purchase shall be specified.";
  if (!gt0(row.estimated_annual_requirement)) {
    e.estimated_annual_requirement = "Estimated Annual Requirement shall be greater than zero.";
  }
  if (!row.primary_source) e.primary_source = "Primary Source of Supply shall be specified.";
  if (!row.procurement_method) e.procurement_method = "Procurement Method shall be specified.";
  if (!gt0(row.estimated_qty_available_annual)) {
    e.estimated_qty_available_annual = "Estimated Quantity Available shall be greater than zero.";
  }
  if (!gt0(row.num_supplying_farmers)) {
    e.num_supplying_farmers = "Number of Supplying Farmers shall be greater than zero.";
  }
  if (!row.available_months || row.available_months.length === 0) {
    e.available_months = "At least one month of availability shall be specified.";
  }
  if (!row.available_throughout_year) {
    if (!(row.peak_harvest_season ?? "").trim()) {
      e.peak_harvest_season = "Peak Harvest Season is required when material is not available year-round.";
    }
    if (!(row.off_season_strategy ?? "").trim()) {
      e.off_season_strategy = "Off-season Procurement Strategy is required when material is not available year-round.";
    }
  }
  if (row.quality_standards_applicable && !row.quality_standard) {
    e.quality_standard = "Quality Standard is required when quality standards are applicable.";
  }
  if (!gt0(row.current_purchase_price)) {
    e.current_purchase_price = "Purchase Price shall be greater than zero.";
  }
  return e;
}

function validateRisk(row: { risk_type: string; mitigation_strategy: string }) {
  const e: Partial<Record<"risk_type" | "mitigation_strategy", string>> = {};
  if (!row.risk_type) e.risk_type = "Risk type is required.";
  if (!(row.mitigation_strategy ?? "").trim()) {
    e.mitigation_strategy = "Mitigation strategy is required.";
  }
  return e;
}

function validatePackaging(row: { material_name: string }) {
  const e: Partial<Record<"material_name", string>> = {};
  if (!(row.material_name ?? "").trim()) e.material_name = "Material name is required.";
  return e;
}

function validateConsumable(row: { name: string }) {
  const e: Partial<Record<"name", string>> = {};
  if (!(row.name ?? "").trim()) e.name = "Consumable name is required.";
  return e;
}

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

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, fieldErrors, fieldWarnings, save, discard } = useDprSectionForm<Data>({
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
  // Section-level C sub-card — converted from register() to controlled so
  // Save button + autosave fire reliably on every keystroke (fixes the
  // same Location F3 regression risk).
  const collectionMethod = useWatch({ control: form.control, name: "collection_method" }) ?? "";
  const transportArrangement = useWatch({ control: form.control, name: "transportation_arrangement" }) ?? "";
  const avgProcurementCost = useWatch({ control: form.control, name: "avg_procurement_cost" });
  const loadingCost = useWatch({ control: form.control, name: "loading_cost" });
  const unloadingCost = useWatch({ control: form.control, name: "unloading_cost" });
  const sortingGradingCost = useWatch({ control: form.control, name: "sorting_grading_cost" });
  const handlingCharges = useWatch({ control: form.control, name: "handling_charges" });

  // Convenience setter — always includes shouldDirty: true.
  const setField = <K extends keyof Data>(name: K, value: Data[K]) =>
    form.setValue(name as never, value as never, { shouldDirty: true });

  // ── Live required-field validation (section-level only) ────────────────
  // Mirrors `raw_material_validators.py` for the 3 section-level errors +
  // 2 advisory warnings. Per-row rules stay backend-driven for now — those
  // will graduate to a per-modal validateRow() helper in a later pass
  // (same pattern products-section uses). Backend `fieldErrors` still
  // wins when present.
  const liveErrors: Record<string, string | undefined> = {};
  const liveWarnings: Record<string, string | undefined> = {};

  if (materials.length === 0) {
    liveErrors.materials = "At least one primary raw material shall be specified.";
  }
  if (!procurementModel) {
    liveErrors.procurement_model = "Procurement Model shall be specified.";
  }
  if (!procurementFrequency) {
    liveErrors.procurement_frequency = "Procurement Frequency shall be specified.";
  }
  if (packaging.length === 0) {
    liveWarnings.packaging_materials =
      "No packaging materials defined. Mandatory if finished products are marketed.";
  }
  if (risks.length === 0) {
    liveWarnings.risks =
      "No supply risks specified. Consider identifying at least one for a complete DPR.";
  }

  const err = (name: string): string | undefined =>
    fieldErrors.get(name) ?? liveErrors[name];
  const warn = (name: string): string | undefined =>
    fieldWarnings.get(name) ?? liveWarnings[name];

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
      help={
        <SectionHelp
          title="Raw Material Assessment & Supply System"
          purpose="The biggest section in the wizard. Captures your entire raw-material supply chain — what you're sourcing, from where, how much, when it's available, the quality, at what price, plus procurement logistics, supply risks, packaging, and consumables. Every field flows into the DPR PDF's Raw Material chapter and into the Financial Analysis chapter's working-capital and cost-of-goods-sold calculations."
          whatToFill={[
            "A/B/D/E — Primary Raw Materials (required, ≥ 1 row). Click 'Add raw material' to open the detail modal. Every row captures one material end-to-end: identity, availability, quality, and price. Multiple materials are normal for integrated projects (e.g. coconut oil unit: copra + packaging + fuel).",
            "For each material row — Name + Unit of Purchase + Estimated Annual Requirement (> 0) + Primary Source + Procurement Method are required. Also: Available Months (or tick 'Available throughout the year'), Number of Supplying Farmers, Purchase Price. If not available year-round, Peak Harvest Season and Off-season Procurement Strategy become required.",
            "C — Procurement System (section-level, required). Pick Procurement Model (Aggregation / Cluster / Direct etc.) and Procurement Frequency (Daily / Weekly / …). Collection method, transport arrangement and the 5 cost fields (procurement, loading, unloading, sorting, handling) are optional but feed the working-capital calc.",
            "F — Supply Risk Assessment (advisory). Add rows for each risk your supply chain faces — seasonal shortage, climate risk, price fluctuation, transport, etc. Each row requires a risk type and a mitigation strategy. Empty list produces a warning, not an error.",
            "G — Packaging Materials (advisory). Add one row per SKU (500 ml bottles, 1 L cans, cartons). Only Material Name is required. Empty list produces a warning — reminds you it's mandatory if you sell finished products, but doesn't block submission.",
            "H — Other Consumables (optional). Filter cloth, cleaning solvents, oils, lubricants — anything not a raw material and not packaging but consumed regularly. Only Name is required.",
          ]}
          tips={[
            "Numbers flow into Finance directly. Estimated Annual Requirement × Purchase Price becomes your Y1 cost of goods sold. Realistic numbers matter — 20% inflation vs actual will distort every projection downstream.",
            "Availability months are the months you can actually source the material — not the months you plan to run production. A coconut oil unit ticks Oct–Feb + Jul for copra availability (peak harvest windows), even though the unit runs year-round from buffer stock.",
            "Off-season strategy is required when a material isn't year-round. Concrete details help ('15,000 kg buffer during Nov-Jan peak; balance from Karnataka border traders during monsoon lean months at ~5% premium') vs vague answers ('will manage during off-season').",
            "Numeric fields silently clip runaway pastes. Farmers is integer-only (2.5 → 25). Quantities and prices cap at large but sane values (1 billion units, ₹10 crore/unit). You cannot enter negatives.",
            "Every text field has a character cap matching backend column widths. Long-form fields (off-season strategy, mitigation, existing practices) go into 2000-char CountedTextareas with an amber/red counter — plenty for a page of text.",
            "Click any row in a table to open the read-only detail drawer; click the pencil to jump straight into edit; the delete icon prompts before removing. The status icon on each row shows whether every required field is filled.",
          ]}
          downstream={[
            "Raw Material chapter in the DPR PDF — every field surfaces there",
            "Financial Analysis chapter — annual requirement × purchase price feeds Y1 cost of goods sold + working capital calc",
            "Risk Analysis chapter — supply-chain risks appear alongside production and market risks",
            "AI-generated narrative — procurement model + primary source + seasonality inform the supply chain paragraph",
            "PDF procurement-cost table — the 5 section-level cost fields render as a summary",
          ]}
        />
      }
    >
      <div className="space-y-4">
        {/* Materials — id lets readiness-panel deep-links scroll here */}
        <div id="dpr-field-materials" />
        <NestedListCard<Material>
          title="A/B/D/E. Primary Raw Materials"
          items={materials}
          onChange={(next) => form.setValue("materials", next, { shouldDirty: true })}
          emptyRow={EMPTY_MATERIAL}
          error={err("materials")}
          warning={warn("materials")}
          columns={[
            { key: "name", label: "Name" },
            { key: "primary_source", label: "Source", render: (v) => (sourceQuery.data?.find((r) => r.id === v)?.label as string) ?? "—" },
            { key: "estimated_annual_requirement", label: "Annual req." },
            { key: "current_purchase_price", label: "Price/unit (₹)" },
          ]}
          // isValid mirrors backend per-row rules — Save button in the modal
          // stays disabled until every backend-required field is satisfied.
          isValid={(row) => Object.keys(validateMaterial(row)).length === 0}
          addLabel="Add raw material"
          editLabel="Edit raw material"
          renderModal={(row, set) => {
            // Live per-field errors from the same validator. Mirrors the
            // products-section validateRow pattern — every field with a
            // problem shows inline red the moment the user leaves it invalid,
            // no wait for save.
            const rErr = validateMaterial(row);
            const monthsError =
              !row.available_throughout_year && row.available_months.length === 0
                ? rErr.available_months
                : undefined;
            return (
            <>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">A. Primary raw material</p>
                <ModalField label="Raw material name *" error={rErr.name}>
                  <Input
                    value={row.name}
                    maxLength={MAX_NAME_CHARS}
                    onChange={(e) => set("name", e.target.value.slice(0, MAX_NAME_CHARS))}
                  />
                </ModalField>
                <ModalRow>
                  <ModalField label="Scientific name">
                    <Input
                      value={row.scientific_name ?? ""}
                      maxLength={MAX_SCIENTIFIC_CHARS}
                      onChange={(e) => set("scientific_name", e.target.value.slice(0, MAX_SCIENTIFIC_CHARS))}
                    />
                  </ModalField>
                  <ModalField label="Variety / grade">
                    <Input
                      value={row.variety_grade ?? ""}
                      maxLength={MAX_VARIETY_CHARS}
                      onChange={(e) => set("variety_grade", e.target.value.slice(0, MAX_VARIETY_CHARS))}
                    />
                  </ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Commodity"><MasterSearchableSelect value={row.commodity} options={commodityQuery.data ?? []} onChange={(v) => set("commodity", v)} placeholder="Type to search commodity…" /></ModalField>
                  <ModalField label="Unit of purchase *" error={rErr.unit_of_purchase}>
                    <MasterSearchableSelect value={row.unit_of_purchase} options={unitQuery.data ?? []} onChange={(v) => set("unit_of_purchase", v)} placeholder="Type to search unit…" />
                  </ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Estimated annual requirement *" error={rErr.estimated_annual_requirement}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={14}
                      placeholder="e.g. 72000"
                      value={row.estimated_annual_requirement !== null && row.estimated_annual_requirement !== undefined ? String(row.estimated_annual_requirement) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_QTY, maxDecimals: 3 });
                        set("estimated_annual_requirement", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                  <ModalField label="Approx. purchase price / unit (₹)">
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={14}
                      placeholder="e.g. 90"
                      value={row.approx_purchase_price !== null && row.approx_purchase_price !== undefined ? String(row.approx_purchase_price) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_PRICE_INR, maxDecimals: 2 });
                        set("approx_purchase_price", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Primary source *" error={rErr.primary_source}>
                    <MasterSearchableSelect value={row.primary_source} options={sourceQuery.data ?? []} onChange={(v) => set("primary_source", v)} placeholder="Type to search source…" />
                  </ModalField>
                  <ModalField label="Procurement method *" error={rErr.procurement_method}>
                    <MasterSearchableSelect value={row.procurement_method} options={procModelQuery.data ?? []} onChange={(v) => set("procurement_method", v)} placeholder="Type to search method…" />
                  </ModalField>
                </ModalRow>
              </div>

              <div className="mt-4 space-y-3 border-t pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">B. Availability</p>
                <ModalRow>
                  <ModalField label="Estimated qty available annually *" error={rErr.estimated_qty_available_annual}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={14}
                      placeholder="e.g. 95000"
                      value={row.estimated_qty_available_annual !== null && row.estimated_qty_available_annual !== undefined ? String(row.estimated_qty_available_annual) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_QTY, maxDecimals: 3 });
                        set("estimated_qty_available_annual", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                  <ModalField label="Supplying farmers *" error={rErr.num_supplying_farmers}>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="e.g. 240"
                      value={row.num_supplying_farmers !== null && row.num_supplying_farmers !== undefined ? String(row.num_supplying_farmers) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseIntegerInput(e.target.value, { max: MAX_FARMERS });
                        set("num_supplying_farmers", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                </ModalRow>
                <div>
                  <Label className={`text-xs ${monthsError ? "text-destructive" : ""}`}>
                    Months of availability *
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                      (or tick “Available throughout the year” below)
                    </span>
                  </Label>
                  <div
                    className={`mt-2 grid grid-cols-6 gap-1.5 rounded-md sm:grid-cols-12 ${
                      monthsError ? "border border-destructive/50 bg-destructive/[0.03] p-2" : ""
                    }`}
                  >
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
                  {monthsError && (
                    <p className="mt-1 text-xs text-destructive">{monthsError}</p>
                  )}
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={row.available_throughout_year} onCheckedChange={(c) => set("available_throughout_year", !!c)} />
                  Available throughout the year
                </label>
                {!row.available_throughout_year && (
                  <>
                    <ModalRow>
                      <ModalField label="Peak harvest season *" error={rErr.peak_harvest_season}>
                        <Input
                          value={row.peak_harvest_season ?? ""}
                          maxLength={MAX_SEASON_CHARS}
                          onChange={(e) => set("peak_harvest_season", e.target.value.slice(0, MAX_SEASON_CHARS))}
                        />
                      </ModalField>
                      <ModalField label="Lean season">
                        <Input
                          value={row.lean_season ?? ""}
                          maxLength={MAX_SEASON_CHARS}
                          onChange={(e) => set("lean_season", e.target.value.slice(0, MAX_SEASON_CHARS))}
                        />
                      </ModalField>
                    </ModalRow>
                    <ModalField label="Off-season procurement strategy *" error={rErr.off_season_strategy}>
                      <CountedTextarea
                        rows={2}
                        maxChars={MAX_LONG_TEXT_CHARS}
                        value={row.off_season_strategy ?? ""}
                        onChange={(v) => set("off_season_strategy", v)}
                        error={Boolean(rErr.off_season_strategy)}
                      />
                    </ModalField>
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
                    <ModalField label="Quality standard *" error={rErr.quality_standard}>
                      <MasterSearchableSelect value={row.quality_standard} options={qStandardQuery.data ?? []} onChange={(v) => set("quality_standard", v)} placeholder="Type to search standard…" />
                    </ModalField>
                    <ModalField label="Grade">
                      <Input
                        value={row.grade ?? ""}
                        maxLength={MAX_GRADE_CHARS}
                        onChange={(e) => set("grade", e.target.value.slice(0, MAX_GRADE_CHARS))}
                      />
                    </ModalField>
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
                  <ModalField label="Current purchase price / unit (₹) *" error={rErr.current_purchase_price}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={14}
                      placeholder="e.g. 90"
                      value={row.current_purchase_price !== null && row.current_purchase_price !== undefined ? String(row.current_purchase_price) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_PRICE_INR, maxDecimals: 2 });
                        set("current_purchase_price", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                  <ModalField label="Basis of pricing"><ChoiceSelect value={row.price_estimation_basis} options={PRICE_BASIS} onChange={(v) => set("price_estimation_basis", v)} /></ModalField>
                </ModalRow>
                {row.price_estimation_basis === "other" && (
                  <ModalField label="Please specify (Others) *">
                    <Input
                      value={row.price_estimation_basis_other ?? ""}
                      maxLength={MAX_OTHER_TEXT_CHARS}
                      onChange={(e) => set("price_estimation_basis_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
                    />
                  </ModalField>
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
          );
          }}
        />

        {/* C. Procurement System (section-level) */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">C. Procurement System</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div id="dpr-field-procurement_model" className="space-y-1.5">
              <Label className={`text-xs ${err("procurement_model") ? "text-destructive" : ""}`}>
                Procurement model *
              </Label>
              <MasterSearchableSelect
                value={procurementModel}
                options={procModelQuery.data ?? []}
                onChange={(v) => form.setValue("procurement_model", v, { shouldDirty: true })}
                placeholder="Type to search model…"
              />
              {err("procurement_model") && (
                <p className="text-xs text-destructive">{err("procurement_model")}</p>
              )}
            </div>
            <div id="dpr-field-procurement_frequency" className="space-y-1.5">
              <Label className={`text-xs ${err("procurement_frequency") ? "text-destructive" : ""}`}>
                Procurement frequency *
              </Label>
              <SearchableSelect
                value={procurementFrequency ?? ""}
                options={FREQUENCY}
                onChange={(v) => form.setValue("procurement_frequency", v, { shouldDirty: true })}
                placeholder="Type to search frequency…"
              />
              {err("procurement_frequency") && (
                <p className="text-xs text-destructive">{err("procurement_frequency")}</p>
              )}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Collection method</Label>
              <Input
                value={collectionMethod as string}
                maxLength={MAX_METHOD_TEXT_CHARS}
                onChange={(e) => setField("collection_method", e.target.value.slice(0, MAX_METHOD_TEXT_CHARS))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Transportation arrangement</Label>
              <Input
                value={transportArrangement as string}
                maxLength={MAX_METHOD_TEXT_CHARS}
                onChange={(e) => setField("transportation_arrangement", e.target.value.slice(0, MAX_METHOD_TEXT_CHARS))}
              />
            </div>
          </div>
          {/* 5 cost fields — controlled + normaliser (money pattern). */}
          <div className="grid gap-3 sm:grid-cols-2">
            {(() => {
              const costFields: Array<[keyof Data, string, string | number | null | undefined]> = [
                ["avg_procurement_cost", "Avg. procurement cost", avgProcurementCost as string | number | null | undefined],
                ["loading_cost", "Loading cost", loadingCost as string | number | null | undefined],
                ["unloading_cost", "Unloading cost", unloadingCost as string | number | null | undefined],
                ["sorting_grading_cost", "Sorting / grading", sortingGradingCost as string | number | null | undefined],
                ["handling_charges", "Handling charges", handlingCharges as string | number | null | undefined],
              ];
              return costFields.map(([key, label, value]) => (
                <div key={key as string} className="space-y-1.5">
                  <Label className="text-xs">{label} (₹)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    maxLength={14}
                    placeholder="e.g. 1.5"
                    value={value !== null && value !== undefined ? String(value) : ""}
                    onChange={(e) => {
                      const cleaned = normaliseDecimalInput(e.target.value, {
                        max: MAX_COST_INR,
                        maxDecimals: 2,
                      });
                      setField(key, (cleaned === "" ? null : cleaned) as Data[typeof key]);
                    }}
                  />
                </div>
              ));
            })()}
          </div>
        </CardContent></Card>

        {/* F. Risks */}
        <div id="dpr-field-risks" />
        <NestedListCard<Risk>
          title="F. Supply Risk Assessment"
          items={risks}
          onChange={(next) => form.setValue("risks", next, { shouldDirty: true })}
          emptyRow={{ risk_type: "", risk_type_other: "", mitigation_strategy: "", existing_practices: "", previous_experience: "" }}
          error={err("risks")}
          warning={warn("risks")}
          columns={[
            { key: "risk_type", label: "Risk", render: (v) => RISK_TYPES.find((o) => o.value === v)?.label ?? "—" },
            { key: "mitigation_strategy", label: "Mitigation", render: (v) => ((v as string)?.slice(0, 40) ?? "") + ((v as string)?.length > 40 ? "…" : "") },
          ]}
          // Save button in modal gated by validateRisk — mirrors backend
          // per-row rules: risk_type required + mitigation strategy required.
          isValid={(row) => Object.keys(validateRisk(row)).length === 0}
          addLabel="Add risk"
          editLabel="Edit risk"
          renderModal={(row, set) => {
            const rErr = validateRisk(row);
            return (
            <>
              <ModalField label="Risk *" error={rErr.risk_type}>
                {/* SearchableSelect — 10 risk types is long enough to benefit
                    from type-to-filter (same pattern as districts / blocks
                    / expansion year elsewhere in the wizard). */}
                <SearchableSelect
                  value={row.risk_type}
                  options={RISK_TYPES}
                  onChange={(v) => set("risk_type", v)}
                  placeholder="Type to search risk…"
                />
              </ModalField>
              {row.risk_type === "other" && (
                <ModalField label="Specify">
                  <Input
                    value={row.risk_type_other}
                    maxLength={MAX_OTHER_TEXT_CHARS}
                    onChange={(e) => set("risk_type_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
                  />
                </ModalField>
              )}
              <ModalField label="Mitigation strategy *" error={rErr.mitigation_strategy}>
                <CountedTextarea
                  rows={2}
                  maxChars={MAX_LONG_TEXT_CHARS}
                  value={row.mitigation_strategy}
                  onChange={(v) => set("mitigation_strategy", v)}
                  error={Boolean(rErr.mitigation_strategy)}
                />
              </ModalField>
              <ModalField label="Existing practices">
                <CountedTextarea
                  rows={2}
                  maxChars={MAX_LONG_TEXT_CHARS}
                  value={row.existing_practices}
                  onChange={(v) => set("existing_practices", v)}
                />
              </ModalField>
              <ModalField label="Previous experience">
                <CountedTextarea
                  rows={2}
                  maxChars={MAX_LONG_TEXT_CHARS}
                  value={row.previous_experience}
                  onChange={(v) => set("previous_experience", v)}
                />
              </ModalField>
            </>
            );
          }}
        />

        {/* G. Packaging */}
        <div id="dpr-field-packaging_materials" />
        <NestedListCard<Packaging>
          title="G. Packaging Materials"
          items={packaging}
          onChange={(next) => form.setValue("packaging_materials", next, { shouldDirty: true })}
          emptyRow={{ order: 0, material_name: "", purpose: "", unit: null, estimated_annual_requirement: null, unit_cost: null, supplier: "" }}
          error={err("packaging_materials")}
          warning={warn("packaging_materials")}
          columns={[
            { key: "material_name", label: "Material" },
            { key: "purpose", label: "Purpose" },
            { key: "estimated_annual_requirement", label: "Annual req." },
          ]}
          isValid={(row) => Object.keys(validatePackaging(row)).length === 0}
          addLabel="Add packaging"
          editLabel="Edit packaging"
          renderModal={(row, set) => {
            const rErr = validatePackaging(row);
            return (
            <>
              <ModalField label="Material name *" error={rErr.material_name}>
                <Input
                  value={row.material_name}
                  maxLength={MAX_NAME_CHARS}
                  onChange={(e) => set("material_name", e.target.value.slice(0, MAX_NAME_CHARS))}
                />
              </ModalField>
              <ModalField label="Purpose">
                <Input
                  value={row.purpose}
                  maxLength={MAX_NAME_CHARS}
                  onChange={(e) => set("purpose", e.target.value.slice(0, MAX_NAME_CHARS))}
                />
              </ModalField>
              <ModalRow>
                <ModalField label="Unit"><MasterSearchableSelect value={row.unit} options={unitQuery.data ?? []} onChange={(v) => set("unit", v)} placeholder="Type to search unit…" /></ModalField>
                <ModalField label="Estimated annual requirement">
                  <Input
                    type="text"
                    inputMode="decimal"
                    maxLength={14}
                    placeholder="e.g. 240000"
                    value={row.estimated_annual_requirement !== null && row.estimated_annual_requirement !== undefined ? String(row.estimated_annual_requirement) : ""}
                    onChange={(e) => {
                      const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_QTY, maxDecimals: 3 });
                      set("estimated_annual_requirement", cleaned === "" ? null : cleaned);
                    }}
                  />
                </ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Unit cost (₹)">
                  <Input
                    type="text"
                    inputMode="decimal"
                    maxLength={14}
                    placeholder="e.g. 6.5"
                    value={row.unit_cost !== null && row.unit_cost !== undefined ? String(row.unit_cost) : ""}
                    onChange={(e) => {
                      const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_PRICE_INR, maxDecimals: 2 });
                      set("unit_cost", cleaned === "" ? null : cleaned);
                    }}
                  />
                </ModalField>
                <ModalField label="Supplier">
                  <Input
                    value={row.supplier}
                    maxLength={MAX_NAME_CHARS}
                    onChange={(e) => set("supplier", e.target.value.slice(0, MAX_NAME_CHARS))}
                  />
                </ModalField>
              </ModalRow>
            </>
            );
          }}
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
          isValid={(row) => Object.keys(validateConsumable(row)).length === 0}
          addLabel="Add consumable"
          editLabel="Edit consumable"
          renderModal={(row, set) => {
            const rErr = validateConsumable(row);
            return (
            <>
              <ModalField label="Consumable name *" error={rErr.name}>
                <Input
                  value={row.name}
                  maxLength={MAX_NAME_CHARS}
                  onChange={(e) => set("name", e.target.value.slice(0, MAX_NAME_CHARS))}
                />
              </ModalField>
              <ModalField label="Purpose">
                <Input
                  value={row.purpose}
                  maxLength={MAX_NAME_CHARS}
                  onChange={(e) => set("purpose", e.target.value.slice(0, MAX_NAME_CHARS))}
                />
              </ModalField>
              <ModalRow>
                <ModalField label="Unit"><MasterSearchableSelect value={row.unit} options={unitQuery.data ?? []} onChange={(v) => set("unit", v)} placeholder="Type to search unit…" /></ModalField>
                <ModalField label="Estimated annual requirement">
                  <Input
                    type="text"
                    inputMode="decimal"
                    maxLength={14}
                    placeholder="e.g. 180"
                    value={row.estimated_annual_requirement !== null && row.estimated_annual_requirement !== undefined ? String(row.estimated_annual_requirement) : ""}
                    onChange={(e) => {
                      const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_QTY, maxDecimals: 3 });
                      set("estimated_annual_requirement", cleaned === "" ? null : cleaned);
                    }}
                  />
                </ModalField>
              </ModalRow>
              <ModalField label="Unit cost (₹)">
                <Input
                  type="text"
                  inputMode="decimal"
                  maxLength={14}
                  placeholder="e.g. 120"
                  value={row.unit_cost !== null && row.unit_cost !== undefined ? String(row.unit_cost) : ""}
                  onChange={(e) => {
                    const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_PRICE_INR, maxDecimals: 2 });
                    set("unit_cost", cleaned === "" ? null : cleaned);
                  }}
                />
              </ModalField>
            </>
            );
          }}
        />
      </div>
    </SectionShell>
  );
}
