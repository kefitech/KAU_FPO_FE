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
import {
  MasterSearchableSelect,
  ModalField,
  ModalRow,
  NestedListCard,
} from "./nested-list";
import { SectionHelp } from "./section-help";
import { SectionShell } from "./section-shell";

// ── Input caps — mirror backend DPRSectionMachinery / DPRMachineryItem /
//    DPRSupportingAssetItem columns ──
const MAX_TEXT_CHARS = 200;              // most CharField widths
const MAX_PURPOSE_CHARS = 500;           // purpose CharField(500)
const MAX_SHORT_CHARS = 100;             // model_number, country, warranty_period
const MAX_OTHER_TEXT_CHARS = 200;        // *_other companions
const MAX_STATUTORY_OTHER_CHARS = 300;   // statutory_approvals_other CharField(300)
const MAX_LONG_TEXT_CHARS = 2000;        // TextField defensive cap
// Cost fields — Decimal(18, 2). Cap at ₹1000 crore.
const MAX_COST_INR = 10_000_000_000;
// Quantity — Decimal(15, 3). 1M units is a soft ceiling.
const MAX_QUANTITY = 1_000_000;
// Rated capacity — Decimal(15, 3). Same soft cap.
const MAX_CAPACITY = 1_000_000;
// Useful life years — integer, realistic 1–100.
const MAX_LIFE_YEARS = 100;
// Residual value % — Decimal(5, 2). 0–100.
const MAX_RESIDUAL_PCT = 100;

// ── Choices ────────────────────────────────────────────────────────────────

const AUTOMATION = [
  { value: "manual", label: "Manual" },
  { value: "semi_auto", label: "Semi-Automatic" },
  { value: "auto", label: "Automatic" },
  { value: "fully_auto", label: "Fully Automatic" },
];

const SPARE_PARTS = [
  { value: "easily", label: "Easily Available" },
  { value: "on_order", label: "Available on Order" },
  { value: "imported", label: "Imported" },
  { value: "limited", label: "Limited Availability" },
];

const STATUTORY = [
  { value: "factory_inspector", label: "Factory Inspector" },
  { value: "electrical_inspector", label: "Electrical Inspector" },
  { value: "boiler_inspection", label: "Boiler Inspection" },
  { value: "calibration", label: "Calibration" },
  { value: "safety_cert", label: "Safety Certification" },
  { value: "pollution_control", label: "Pollution Control" },
  { value: "food_safety", label: "Food Safety" },
  { value: "other", label: "Others (Specify)" },
];

// ── Schemas ────────────────────────────────────────────────────────────────

const MachineSchema = z.object({
  id: z.number().optional(),
  order: z.number(),
  name: z.string(),
  purpose: z.string(),
  project_component: z.number().nullable(),
  machine_category: z.number().nullable(),
  machine_category_other: z.string(),
  quantity_required: z.union([z.string(), z.number()]).nullable(),
  process_stage: z.string(),
  unit: z.number().nullable(),
  manufacturer: z.string(),
  supplier: z.string(),
  model_number: z.string(),
  country_of_manufacture: z.string(),
  rated_capacity: z.union([z.string(), z.number()]).nullable(),
  capacity_unit: z.number().nullable(),
  power_source: z.string(),
  automation_level: z.string(),
  operating_capacity: z.string(),
  operating_principle: z.string(),
  power_requirement: z.string(),
  fuel_requirement: z.string(),
  water_requirement: z.string(),
  compressed_air_requirement: z.string(),
  recommended_operating_hours: z.string(),
  num_operators_required: z.union([z.string(), z.number()]).nullable(),
  installation_area_required: z.string(),
  foundation_required: z.boolean(),
  foundation_type: z.string(),
  working_clearance_required: z.string(),
  foundation_size: z.string(),
  unit_cost: z.union([z.string(), z.number()]).nullable(),
  basic_cost: z.union([z.string(), z.number()]).nullable(),
  gst: z.union([z.string(), z.number()]).nullable(),
  transportation_charges: z.union([z.string(), z.number()]).nullable(),
  loading_unloading_charges: z.union([z.string(), z.number()]).nullable(),
  installation_charges: z.union([z.string(), z.number()]).nullable(),
  commissioning_charges: z.union([z.string(), z.number()]).nullable(),
  insurance: z.union([z.string(), z.number()]).nullable(),
  other_charges: z.union([z.string(), z.number()]).nullable(),
  supplier_identified: z.boolean(),
  supplier_name: z.string(),
  supplier_location: z.string(),
  delivery_period: z.string(),
  warranty_period: z.string(),
  amc_required: z.boolean().nullable(),
  amc_cost: z.union([z.string(), z.number()]).nullable(),
  amc_duration: z.string(),
  annual_maintenance_required: z.boolean().nullable(),
  spare_parts_availability: z.string(),
  daily_maintenance_requirement: z.string(),
  preventive_maintenance_frequency: z.string(),
  major_overhaul_frequency: z.string(),
  useful_life_years: z.union([z.string(), z.number()]).nullable(),
  residual_value_pct: z.union([z.string(), z.number()]).nullable(),
});
type Machine = z.infer<typeof MachineSchema>;

const SupportingSchema = z.object({
  id: z.number().optional(),
  order: z.number(),
  asset: z.number().nullable(),
  asset_name_other: z.string(),
  quantity: z.union([z.string(), z.number()]).nullable(),
  purpose: z.string(),
  estimated_cost: z.union([z.string(), z.number()]).nullable(),
});
type Supporting = z.infer<typeof SupportingSchema>;

const Schema = z.object({
  statutory_approvals: z.array(z.string()),
  statutory_approvals_other: z.string(),
  statutory_remarks: z.string(),
  items: z.array(MachineSchema),
  supporting_assets: z.array(SupportingSchema),
});
type Data = z.infer<typeof Schema>;

// ── Utilities ──────────────────────────────────────────────────────────────

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

const DEC_KEYS_ITEM = [
  "quantity_required", "rated_capacity", "unit_cost", "basic_cost", "gst",
  "transportation_charges", "loading_unloading_charges", "installation_charges",
  "commissioning_charges", "insurance", "other_charges", "amc_cost", "residual_value_pct",
] as const;

// ── Per-row validators (mirror machinery_validators.py) ──────────────────

type MachineErrors = Partial<Record<
  "name" | "project_component" | "quantity_required" | "capacity_unit" | "unit_cost" | "useful_life_years"
, string>>;
function validateMachine(row: Machine): MachineErrors {
  const e: MachineErrors = {};
  if (!(row.name ?? "").trim()) {
    e.name = "Machinery name is required.";
  }
  const qty = row.quantity_required;
  const qtyNum = qty !== null && qty !== undefined && qty !== "" ? Number(qty) : null;
  if (qtyNum === null || !Number.isFinite(qtyNum) || qtyNum <= 0) {
    e.quantity_required = "Quantity shall be greater than zero.";
  }
  if (!row.project_component) {
    e.project_component = "Every machinery item shall be linked to a project component.";
  }
  const rc = row.rated_capacity;
  const rcNum = rc !== null && rc !== undefined && rc !== "" ? Number(rc) : null;
  if (rcNum !== null && rcNum > 0 && !row.capacity_unit) {
    e.capacity_unit = "Capacity Unit shall be specified when machinery capacity is entered.";
  }
  const uc = row.unit_cost;
  const ucNum = uc !== null && uc !== undefined && uc !== "" ? Number(uc) : null;
  if (ucNum !== null && ucNum <= 0) {
    e.unit_cost = "Unit Cost shall be greater than zero.";
  }
  const life = row.useful_life_years;
  const lifeNum = life !== null && life !== undefined && life !== "" ? Number(life) : null;
  if (lifeNum !== null && lifeNum <= 0) {
    e.useful_life_years = "Useful Life shall be greater than zero.";
  }
  return e;
}

type SupportingErrors = Partial<Record<"asset" | "quantity", string>>;
function validateSupporting(row: Supporting): SupportingErrors {
  const e: SupportingErrors = {};
  if (!row.asset) e.asset = "Asset is required.";
  const qty = row.quantity;
  const qtyNum = qty !== null && qty !== undefined && qty !== "" ? Number(qty) : null;
  if (qtyNum === null || !Number.isFinite(qtyNum) || qtyNum <= 0) {
    e.quantity = "Supporting asset quantity shall be greater than zero.";
  }
  return e;
}

function serializePayload(v: Data): Record<string, unknown> {
  return {
    ...v,
    items: v.items.map((it, i) => {
      const out: Record<string, unknown> = { ...it, order: i };
      for (const k of DEC_KEYS_ITEM) out[k] = toDec(it[k]);
      out.num_operators_required = toInt(it.num_operators_required);
      out.useful_life_years = toInt(it.useful_life_years);
      return out;
    }),
    supporting_assets: v.supporting_assets.map((s, i) => ({
      ...s,
      order: i,
      quantity: toDec(s.quantity),
      estimated_cost: toDec(s.estimated_cost),
    })),
  };
}

// ── Empty row helpers ─────────────────────────────────────────────────────

const EMPTY_MACHINE: Machine = {
  order: 0, name: "", purpose: "", project_component: null, machine_category: null,
  machine_category_other: "", quantity_required: null, process_stage: "", unit: null,
  manufacturer: "", supplier: "", model_number: "", country_of_manufacture: "",
  rated_capacity: null, capacity_unit: null, power_source: "", automation_level: "",
  operating_capacity: "", operating_principle: "", power_requirement: "",
  fuel_requirement: "", water_requirement: "", compressed_air_requirement: "",
  recommended_operating_hours: "", num_operators_required: null,
  installation_area_required: "", foundation_required: false, foundation_type: "",
  working_clearance_required: "", foundation_size: "",
  unit_cost: null, basic_cost: null, gst: null, transportation_charges: null,
  loading_unloading_charges: null, installation_charges: null,
  commissioning_charges: null, insurance: null, other_charges: null,
  supplier_identified: false, supplier_name: "", supplier_location: "",
  delivery_period: "", warranty_period: "", amc_required: null, amc_cost: null, amc_duration: "",
  annual_maintenance_required: null, spare_parts_availability: "",
  daily_maintenance_requirement: "", preventive_maintenance_frequency: "",
  major_overhaul_frequency: "", useful_life_years: null, residual_value_pct: null,
};

// ── Section component ─────────────────────────────────────────────────────

export function MachinerySection({ uuid }: { uuid: string }) {
  const componentQuery = useQuery({
    queryKey: ["dpr-master", "components"],
    queryFn: () => dprMasterApi.list("components"),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const machineryCatQuery = useQuery({
    queryKey: ["dpr-master", "machinery-categories"],
    queryFn: () => dprMasterApi.list("machinery-categories"),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const unitQuery = useQuery({
    queryKey: ["dpr-master", "capacity-units"],
    queryFn: () => dprMasterApi.list("capacity-units"),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const supportingQuery = useQuery({
    queryKey: ["dpr-master", "supporting-assets"],
    queryFn: () => dprMasterApi.list("supporting-assets"),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, fieldErrors, fieldWarnings, save, discard } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "machinery",
    schema: Schema,
    defaultValues: {
      statutory_approvals: [], statutory_approvals_other: "", statutory_remarks: "",
      items: [], supporting_assets: [],
    },
    serializePayload,
  });

  // useWatch — reactive subscriptions (form.watch is stale after form.reset).
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const supporting = useWatch({ control: form.control, name: "supporting_assets" }) ?? [];
  const approvals = useWatch({ control: form.control, name: "statutory_approvals" }) ?? [];
  const statutoryOther = useWatch({ control: form.control, name: "statutory_approvals_other" }) ?? "";
  const statutoryRemarks = useWatch({ control: form.control, name: "statutory_remarks" }) ?? "";

  // Convenience setter — always includes shouldDirty: true.
  const setField = <K extends keyof Data>(name: K, value: Data[K]) =>
    form.setValue(name as never, value as never, { shouldDirty: true });

  const toggleApproval = (code: string, checked: boolean) => {
    const cur = form.getValues("statutory_approvals") ?? [];
    setField("statutory_approvals", checked ? [...cur, code] : cur.filter((c) => c !== code));
  };

  // Section-level live errors — mirror machinery_validators.py.
  const liveErrors: Record<string, string | undefined> = {};
  if (approvals.includes("other") && !String(statutoryOther).trim()) {
    liveErrors.statutory_approvals_other = 'Please specify — "Others" was selected in statutory approvals.';
  }
  const err = (name: string): string | undefined =>
    fieldErrors.get(name) ?? liveErrors[name];

  const loading = isLoading || componentQuery.isLoading || machineryCatQuery.isLoading || unitQuery.isLoading || supportingQuery.isLoading;

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="machinery"
      loading={loading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
      help={
        <SectionHelp
          title="Plant, Machinery & Equipment"
          purpose="Capture every piece of plant, machinery, equipment or tool the project will procure or use — plus supporting assets (trolleys, forklifts, computers, tools) and section-level statutory approvals (factory inspector, electrical, boiler, calibration, safety cert, pollution control, food safety, etc.). Every machinery row must link to a project component so the DPR PDF can show which machinery is used by which activity."
          whatToFill={[
            "A — Machinery Items. Click 'Add machinery' for each machine, equipment or tool. Required per row: name, quantity > 0, linked project component (FK from Components section). Optional but strongly recommended: manufacturer, model number, rated capacity + capacity unit (if capacity entered, unit is required), unit cost, useful life, warranty. Split by machine — a cold-press expeller + a filter train + a bottling line = 3 rows.",
            "H — Supporting Assets. Click 'Add supporting asset' for each non-machinery item — trolley, weighing scale, forklift, laptop, tool kit, etc. Asset FK + quantity > 0 are required per row; purpose + estimated cost are optional.",
            "G — Statutory Approvals (section-level). Tick which approvals your machinery configuration will need — factory inspector, electrical inspector, boiler, calibration, safety cert, pollution control, food safety. 'Others' reveals a specify field. Free-text remarks area at the bottom for anything context-specific.",
          ]}
          tips={[
            "Every machinery row MUST link to a project component. If you can't pick one, add the component in the Components section first.",
            "Capacity + Unit are a paired field. If you enter '40' for rated capacity, you must also pick a unit (kg/hour, litres/day, etc.) — the DPR is unreadable otherwise.",
            "Cost line-items feed the Investment section. Unit cost is the machine ex-factory; GST + transport + installation + commissioning + insurance can be captured separately as backend supports them (though only unit_cost + GST are surfaced in the current MVP modal). Sum lands in the Machinery line of Project Cost.",
            "Useful life + Residual value drive depreciation. Default useful life is 10 years for most food-processing machinery; residual value is typically 5-10%. Leave both blank if you don't know — the auto-calc will use category defaults.",
            "Spare parts availability + Warranty are risk-mitigation signals for bankers. 'Easily Available' + '1 year comprehensive' reads well; 'Imported' + 'None' triggers questions.",
            "Statutory approvals differ by machinery type. A boiler needs boiler inspection; an electrical panel needs electrical inspector; anything food-contact needs FSSAI + food safety. Tick what's actually applicable — don't over-tick.",
          ]}
          downstream={[
            "Machinery chapter in the DPR PDF — full item table + supporting assets + statutory approvals all render there",
            "Investment section — machinery unit_cost + GST + charges sum into the Machinery line of Project Cost",
            "Depreciation calculation — useful_life_years + residual_value_pct + machine_category defaults drive the SLM schedule",
            "Utilities section — power source + fuel/water requirements inform utility sizing",
            "HR section — num_operators_required informs the manpower plan (Cat B field, not yet surfaced in modal)",
            "Risk Analysis chapter — spare parts availability + statutory approval status feed the technical risk narrative",
            "AI narrative — machinery list feeds the Machinery Selection paragraph",
          ]}
        />
      }
    >
      <div className="space-y-4">
        {/* A. Machinery Items — id enables readiness-panel deep-link scroll */}
        <div id="dpr-field-items" />
        <NestedListCard<Machine>
          title="A. Machinery, Equipment & Tools"
          items={items}
          onChange={(next) => form.setValue("items", next, { shouldDirty: true })}
          warning={fieldWarnings.get("items")}
          emptyRow={EMPTY_MACHINE}
          columns={[
            { key: "name", label: "Name" },
            { key: "machine_category", label: "Category", render: (v) => (machineryCatQuery.data?.find((r) => r.id === v)?.label as string) ?? "—" },
            { key: "quantity_required", label: "Qty" },
            { key: "unit_cost", label: "Unit cost (₹)" },
          ]}
          isValid={(row) => Object.keys(validateMachine(row)).length === 0}
          addLabel="Add machinery"
          editLabel="Edit machinery"
          renderModal={(row, set) => {
            const mErr = validateMachine(row);
            return (
              <>
                <ModalField label="Machinery name *" error={mErr.name}>
                  <Input
                    value={row.name}
                    maxLength={MAX_TEXT_CHARS}
                    onChange={(e) => set("name", e.target.value.slice(0, MAX_TEXT_CHARS))}
                  />
                </ModalField>
                <ModalField label="Purpose">
                  <Input
                    value={row.purpose}
                    maxLength={MAX_PURPOSE_CHARS}
                    onChange={(e) => set("purpose", e.target.value.slice(0, MAX_PURPOSE_CHARS))}
                  />
                </ModalField>
                <ModalRow>
                  <ModalField label="Linked project component *" error={mErr.project_component}>
                    <MasterSearchableSelect
                      value={row.project_component}
                      options={componentQuery.data ?? []}
                      onChange={(v) => set("project_component", v)}
                      placeholder="Type to search component…"
                    />
                  </ModalField>
                  <ModalField label="Machine category">
                    <MasterSearchableSelect
                      value={row.machine_category}
                      options={machineryCatQuery.data ?? []}
                      onChange={(v) => set("machine_category", v)}
                      placeholder="Type to search category…"
                    />
                  </ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Quantity required *" error={mErr.quantity_required}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={12}
                      placeholder="e.g. 1"
                      value={row.quantity_required !== null && row.quantity_required !== undefined ? String(row.quantity_required) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, {
                          max: MAX_QUANTITY,
                          maxDecimals: 3,
                        });
                        set("quantity_required", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                  <ModalField label="Unit">
                    <MasterSearchableSelect
                      value={row.unit}
                      options={unitQuery.data ?? []}
                      onChange={(v) => set("unit", v)}
                      placeholder="Type to search unit…"
                    />
                  </ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Manufacturer">
                    <Input
                      value={row.manufacturer}
                      maxLength={MAX_TEXT_CHARS}
                      onChange={(e) => set("manufacturer", e.target.value.slice(0, MAX_TEXT_CHARS))}
                    />
                  </ModalField>
                  <ModalField label="Supplier">
                    <Input
                      value={row.supplier}
                      maxLength={MAX_TEXT_CHARS}
                      onChange={(e) => set("supplier", e.target.value.slice(0, MAX_TEXT_CHARS))}
                    />
                  </ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Model number">
                    <Input
                      value={row.model_number}
                      maxLength={MAX_SHORT_CHARS}
                      onChange={(e) => set("model_number", e.target.value.slice(0, MAX_SHORT_CHARS))}
                    />
                  </ModalField>
                  <ModalField label="Country of manufacture">
                    <Input
                      value={row.country_of_manufacture}
                      maxLength={MAX_SHORT_CHARS}
                      onChange={(e) => set("country_of_manufacture", e.target.value.slice(0, MAX_SHORT_CHARS))}
                    />
                  </ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Rated capacity">
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={12}
                      placeholder="e.g. 40"
                      value={row.rated_capacity !== null && row.rated_capacity !== undefined ? String(row.rated_capacity) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, {
                          max: MAX_CAPACITY,
                          maxDecimals: 3,
                        });
                        set("rated_capacity", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                  <ModalField label="Capacity unit" error={mErr.capacity_unit}>
                    <MasterSearchableSelect
                      value={row.capacity_unit}
                      options={unitQuery.data ?? []}
                      onChange={(v) => set("capacity_unit", v)}
                      placeholder="Type to search unit…"
                    />
                  </ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Power source">
                    <Input
                      value={row.power_source}
                      maxLength={MAX_TEXT_CHARS}
                      onChange={(e) => set("power_source", e.target.value.slice(0, MAX_TEXT_CHARS))}
                    />
                  </ModalField>
                  <ModalField label="Automation level">
                    <SearchableSelect
                      value={row.automation_level}
                      options={AUTOMATION}
                      onChange={(v: string) => set("automation_level", v)}
                      placeholder="Type to search…"
                    />
                  </ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Unit cost (₹)" error={mErr.unit_cost}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={16}
                      placeholder="e.g. 320000"
                      value={row.unit_cost !== null && row.unit_cost !== undefined ? String(row.unit_cost) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, {
                          max: MAX_COST_INR,
                          maxDecimals: 2,
                        });
                        set("unit_cost", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                  <ModalField label="GST (₹)">
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={16}
                      placeholder="e.g. 57600"
                      value={row.gst !== null && row.gst !== undefined ? String(row.gst) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, {
                          max: MAX_COST_INR,
                          maxDecimals: 2,
                        });
                        set("gst", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Useful life (years)" error={mErr.useful_life_years}>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={3}
                      placeholder="e.g. 10"
                      value={row.useful_life_years !== null && row.useful_life_years !== undefined ? String(row.useful_life_years) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseIntegerInput(e.target.value, {
                          max: MAX_LIFE_YEARS,
                          min: 1,
                        });
                        set("useful_life_years", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                  <ModalField label="Residual value (%)">
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={6}
                      placeholder="e.g. 10"
                      value={row.residual_value_pct !== null && row.residual_value_pct !== undefined ? String(row.residual_value_pct) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, {
                          max: MAX_RESIDUAL_PCT,
                          maxDecimals: 2,
                        });
                        set("residual_value_pct", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Spare parts availability">
                    <SearchableSelect
                      value={row.spare_parts_availability}
                      options={SPARE_PARTS}
                      onChange={(v: string) => set("spare_parts_availability", v)}
                      placeholder="Type to search…"
                    />
                  </ModalField>
                  <ModalField label="Warranty period">
                    <Input
                      value={row.warranty_period}
                      maxLength={MAX_SHORT_CHARS}
                      placeholder="e.g. 1 year"
                      onChange={(e) => set("warranty_period", e.target.value.slice(0, MAX_SHORT_CHARS))}
                    />
                  </ModalField>
                </ModalRow>
              </>
            );
          }}
        />

        {/* H. Supporting Assets — id enables readiness-panel deep-link scroll */}
        <div id="dpr-field-supporting_assets" />
        <NestedListCard<Supporting>
          title="H. Supporting Assets"
          items={supporting}
          onChange={(next) => form.setValue("supporting_assets", next, { shouldDirty: true })}
          warning={fieldWarnings.get("supporting_assets")}
          emptyRow={{ order: 0, asset: null, asset_name_other: "", quantity: null, purpose: "", estimated_cost: null }}
          columns={[
            { key: "asset", label: "Asset", render: (v) => (supportingQuery.data?.find((r) => r.id === v)?.label as string) ?? "—" },
            { key: "quantity", label: "Qty" },
            { key: "estimated_cost", label: "Cost (₹)" },
          ]}
          isValid={(row) => Object.keys(validateSupporting(row)).length === 0}
          addLabel="Add supporting asset"
          editLabel="Edit supporting asset"
          renderModal={(row, set) => {
            const sErr = validateSupporting(row);
            const isOtherAsset = supportingQuery.data?.find((r) => r.id === row.asset)?.code === "other";
            return (
              <>
                <ModalField label="Asset *" error={sErr.asset}>
                  <MasterSearchableSelect
                    value={row.asset}
                    options={supportingQuery.data ?? []}
                    onChange={(v) => set("asset", v)}
                    placeholder="Type to search asset…"
                  />
                </ModalField>
                {isOtherAsset && (
                  <ModalField label="Please specify (Others)">
                    <Input
                      value={row.asset_name_other}
                      maxLength={MAX_OTHER_TEXT_CHARS}
                      onChange={(e) => set("asset_name_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
                    />
                  </ModalField>
                )}
                <ModalField label="Purpose">
                  <Input
                    value={row.purpose}
                    maxLength={MAX_PURPOSE_CHARS}
                    onChange={(e) => set("purpose", e.target.value.slice(0, MAX_PURPOSE_CHARS))}
                  />
                </ModalField>
                <ModalRow>
                  <ModalField label="Quantity *" error={sErr.quantity}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={12}
                      placeholder="e.g. 1"
                      value={row.quantity !== null && row.quantity !== undefined ? String(row.quantity) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, {
                          max: MAX_QUANTITY,
                          maxDecimals: 2,
                        });
                        set("quantity", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                  <ModalField label="Estimated cost (₹)">
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={16}
                      placeholder="e.g. 12000"
                      value={row.estimated_cost !== null && row.estimated_cost !== undefined ? String(row.estimated_cost) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, {
                          max: MAX_COST_INR,
                          maxDecimals: 2,
                        });
                        set("estimated_cost", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                </ModalRow>
              </>
            );
          }}
        />

        {/* G. Statutory Approvals */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">G. Statutory Requirements</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {STATUTORY.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={approvals.includes(o.value)} onCheckedChange={(c) => toggleApproval(o.value, !!c)} />
                {o.label}
              </label>
            ))}
          </div>
          {approvals.includes("other") && (
            <div id="dpr-field-statutory_approvals_other" className="space-y-1.5">
              <Label className={err("statutory_approvals_other") ? "text-xs text-destructive" : "text-xs"}>
                Please specify (Others) *
              </Label>
              <Input
                value={statutoryOther as string}
                maxLength={MAX_STATUTORY_OTHER_CHARS}
                onChange={(e) => setField("statutory_approvals_other", e.target.value.slice(0, MAX_STATUTORY_OTHER_CHARS))}
              />
              {err("statutory_approvals_other") && (
                <p className="text-xs text-destructive">{err("statutory_approvals_other")}</p>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Remarks</Label>
            <CountedTextarea
              rows={2}
              maxChars={MAX_LONG_TEXT_CHARS}
              value={statutoryRemarks as string}
              onChange={(v) => setField("statutory_remarks", v)}
            />
          </div>
        </CardContent></Card>
      </div>
    </SectionShell>
  );
}
