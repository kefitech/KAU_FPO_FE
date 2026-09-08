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

// ── Input caps — mirror backend DPRSectionUtilities + child tables ──
const MAX_TEXT_CHARS = 200;              // most CharField widths
const MAX_PURPOSE_CHARS = 500;           // purpose CharField(500)
const MAX_SHORT_CHARS = 100;             // consumer_number CharField(100)
const MAX_OTHER_TEXT_CHARS = 200;        // *_other companions
const MAX_LONG_TEXT_CHARS = 2000;        // TextField defensive cap
// Cost / revenue fields — Decimal(15, 2). Cap at ₹1000 crore.
const MAX_COST_INR = 10_000_000_000;
// Electrical load — Decimal(10, 2). 100,000 kW is a soft ceiling for any FPO.
const MAX_LOAD_KW = 100_000;
// Number of chambers — realistic 1–20.
const MAX_CHAMBERS = 20;

// ── Choices ────────────────────────────────────────────────────────────────

const ELECTRICITY_SUPPLY = [
  { value: "single_phase", label: "Single Phase" },
  { value: "three_phase", label: "Three Phase" },
  { value: "ht", label: "HT Connection" },
  { value: "lt", label: "LT Connection" },
];
const WATER_SOURCES = [
  { value: "borewell", label: "Borewell" },
  { value: "open_well", label: "Open Well" },
  { value: "panchayat_supply", label: "Panchayat Water" },
  { value: "municipal_supply", label: "Municipal Water" },
  { value: "river", label: "River" },
  { value: "canal", label: "Canal" },
  { value: "tank", label: "Tank" },
  { value: "rainwater_harvesting", label: "Rainwater Harvesting" },
  { value: "private_supply", label: "Private Supply" },
  { value: "other", label: "Others (Specify)" },
];
const PROCESS_TYPES = [
  { value: "compressed_air", label: "Compressed Air" },
  { value: "steam", label: "Steam" },
  { value: "boiler", label: "Boiler" },
  { value: "hot_water", label: "Hot Water" },
];
const COMMUNICATION = [
  { value: "broadband_internet", label: "Broadband" },
  { value: "mobile_internet", label: "Mobile" },
  { value: "wifi", label: "Wi-Fi" },
  { value: "cctv", label: "CCTV" },
  { value: "fibre", label: "Fibre" },
  { value: "erp", label: "ERP" },
  { value: "accounting", label: "Accounting SW" },
  { value: "inventory", label: "Inventory SW" },
  { value: "barcode", label: "Barcode" },
  { value: "qr_code", label: "QR Code" },
  { value: "digital_weighing", label: "Digital Weighing" },
  { value: "biometric", label: "Biometric" },
  { value: "cloud_backup", label: "Cloud Backup" },
  { value: "other", label: "Others" },
];
const FIRE_SAFETY = [
  { value: "fire_extinguishers", label: "Fire Extinguishers" },
  { value: "first_aid", label: "First Aid" },
  { value: "ppe", label: "PPE" },
  { value: "emergency_exit", label: "Emergency Exit" },
  { value: "fire_alarm", label: "Fire Alarm" },
  { value: "fire_hydrant", label: "Fire Hydrant" },
  { value: "smoke_detector", label: "Smoke Detector" },
  { value: "emergency_lighting", label: "Emergency Lighting" },
  { value: "safety_signage", label: "Safety Signage" },
  { value: "other", label: "Others" },
];

// ── Schemas ────────────────────────────────────────────────────────────────

const FuelSchema = z.object({
  id: z.number().optional(),
  fuel: z.number().nullable(),
  fuel_other: z.string(),
  purpose: z.string(),
  daily_consumption: z.string(),
  annual_consumption: z.string(),
  estimated_annual_cost: z.union([z.string(), z.number()]).nullable(),
});
type Fuel = z.infer<typeof FuelSchema>;

const ProcessSchema = z.object({
  id: z.number().optional(),
  utility_type: z.string(),
  purpose: z.string(),
  capacity: z.string(),
  source: z.string(),
});
type Process = z.infer<typeof ProcessSchema>;

const WasteSchema = z.object({
  id: z.number().optional(),
  waste: z.number().nullable(),
  waste_other: z.string(),
  disposal_method: z.string(),
  estimated_quantity: z.string(),
  utilisation_method: z.string(),
  revenue_from_byproducts: z.union([z.string(), z.number()]).nullable(),
});
type Waste = z.infer<typeof WasteSchema>;

const RenewableSchema = z.object({
  id: z.number().optional(),
  initiative: z.number().nullable(),
  initiative_other: z.string(),
  capacity: z.string(),
  estimated_cost: z.union([z.string(), z.number()]).nullable(),
  expected_annual_savings: z.union([z.string(), z.number()]).nullable(),
});
type Renewable = z.infer<typeof RenewableSchema>;

const Schema = z.object({
  electricity_required: z.boolean(),
  existing_electricity_connection: z.boolean().nullable(),
  electricity_supply_type: z.string(),
  backup_power_required: z.boolean().nullable(),
  consumer_number: z.string(),
  connected_load_kw: z.union([z.string(), z.number()]).nullable(),
  contract_demand_kva: z.union([z.string(), z.number()]).nullable(),
  additional_load_required: z.string(),
  generator_capacity: z.string(),
  dg_set_required: z.boolean(),
  ups_required: z.boolean(),
  solar_backup_proposed: z.boolean(),

  water_required: z.boolean(),
  water_source: z.string(),
  water_source_other: z.string(),
  water_available_year_round: z.boolean().nullable(),
  daily_water_requirement: z.string(),
  peak_water_requirement: z.string(),
  annual_water_requirement: z.string(),
  water_storage_capacity: z.string(),
  water_treatment_required: z.string(),

  refrigeration_required: z.boolean(),
  temperature_range: z.string(),
  cooling_capacity: z.string(),
  cold_room_size: z.string(),
  num_chambers: z.union([z.string(), z.number()]).nullable(),
  refrigerant_type: z.string(),
  refrigeration_backup_arrangement: z.string(),

  generates_effluent: z.boolean(),
  effluent_quantity: z.string(),
  effluent_treatment_required: z.string(),
  effluent_treatment_method: z.string(),
  effluent_disposal_method: z.string(),
  effluent_reuse_proposed: z.string(),

  communication_items: z.array(z.string()),
  communication_other: z.string(),
  fire_safety_items: z.array(z.string()),
  fire_safety_other: z.string(),

  fuels: z.array(FuelSchema),
  process_utilities: z.array(ProcessSchema),
  wastes: z.array(WasteSchema),
  renewable_initiatives: z.array(RenewableSchema),
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

// ── Per-row validators (mirror utilities_validators.py) ──────────────────

type FuelErrors = Partial<Record<"fuel", string>>;
function validateFuel(row: Fuel): FuelErrors {
  const e: FuelErrors = {};
  if (!row.fuel) e.fuel = "Fuel type is required.";
  return e;
}

type WasteErrors = Partial<Record<"waste" | "disposal_method", string>>;
function validateWaste(row: Waste): WasteErrors {
  const e: WasteErrors = {};
  if (!row.waste) e.waste = "Waste type is required.";
  if (!(row.disposal_method ?? "").trim()) {
    e.disposal_method = "Disposal method shall be specified for each waste type.";
  }
  return e;
}

type RenewableErrors = Partial<Record<"initiative", string>>;
function validateRenewable(row: Renewable): RenewableErrors {
  const e: RenewableErrors = {};
  if (!row.initiative) e.initiative = "Initiative is required.";
  return e;
}

type ProcessErrors = Partial<Record<"utility_type", string>>;
function validateProcess(row: Process): ProcessErrors {
  const e: ProcessErrors = {};
  if (!row.utility_type) e.utility_type = "Utility type is required.";
  return e;
}

function serializePayload(v: Data): Record<string, unknown> {
  return {
    ...v,
    connected_load_kw: toDec(v.connected_load_kw),
    contract_demand_kva: toDec(v.contract_demand_kva),
    num_chambers: toInt(v.num_chambers),
    fuels: v.fuels.map((f) => ({ ...f, estimated_annual_cost: toDec(f.estimated_annual_cost) })),
    wastes: v.wastes.map((w) => ({ ...w, revenue_from_byproducts: toDec(w.revenue_from_byproducts) })),
    renewable_initiatives: v.renewable_initiatives.map((r) => ({
      ...r,
      estimated_cost: toDec(r.estimated_cost),
      expected_annual_savings: toDec(r.expected_annual_savings),
    })),
  };
}

// ── Section component ─────────────────────────────────────────────────────

export function UtilitiesSection({ uuid }: { uuid: string }) {
  const fuelQuery = useQuery({
    queryKey: ["dpr-master", "fuel-types"],
    queryFn: () => dprMasterApi.list("fuel-types"),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const wasteQuery = useQuery({
    queryKey: ["dpr-master", "waste-types"],
    queryFn: () => dprMasterApi.list("waste-types"),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const renewableQuery = useQuery({
    queryKey: ["dpr-master", "renewable-initiatives"],
    queryFn: () => dprMasterApi.list("renewable-initiatives"),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, fieldErrors, fieldWarnings, save, discard } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "utilities",
    schema: Schema,
    defaultValues: {
      electricity_required: false, existing_electricity_connection: null,
      electricity_supply_type: "", backup_power_required: null, consumer_number: "",
      connected_load_kw: null, contract_demand_kva: null,
      additional_load_required: "", generator_capacity: "",
      dg_set_required: false, ups_required: false, solar_backup_proposed: false,
      water_required: false, water_source: "", water_source_other: "",
      water_available_year_round: null, daily_water_requirement: "",
      peak_water_requirement: "", annual_water_requirement: "",
      water_storage_capacity: "", water_treatment_required: "",
      refrigeration_required: false, temperature_range: "", cooling_capacity: "",
      cold_room_size: "", num_chambers: null, refrigerant_type: "",
      refrigeration_backup_arrangement: "",
      generates_effluent: false, effluent_quantity: "",
      effluent_treatment_required: "", effluent_treatment_method: "",
      effluent_disposal_method: "", effluent_reuse_proposed: "",
      communication_items: [], communication_other: "",
      fire_safety_items: [], fire_safety_other: "",
      fuels: [], process_utilities: [], wastes: [], renewable_initiatives: [],
    },
    serializePayload,
  });

  // useWatch — reactive subscriptions (form.watch is stale after form.reset).
  const fuels = useWatch({ control: form.control, name: "fuels" }) ?? [];
  const processUtils = useWatch({ control: form.control, name: "process_utilities" }) ?? [];
  const wastes = useWatch({ control: form.control, name: "wastes" }) ?? [];
  const renewables = useWatch({ control: form.control, name: "renewable_initiatives" }) ?? [];
  const comm = useWatch({ control: form.control, name: "communication_items" }) ?? [];
  const fireSafety = useWatch({ control: form.control, name: "fire_safety_items" }) ?? [];

  const elReq = useWatch({ control: form.control, name: "electricity_required" });
  const waterReq = useWatch({ control: form.control, name: "water_required" });
  const refrReq = useWatch({ control: form.control, name: "refrigeration_required" });
  const effluent = useWatch({ control: form.control, name: "generates_effluent" });
  const electricitySupplyType = useWatch({ control: form.control, name: "electricity_supply_type" });
  const existingElConn = useWatch({ control: form.control, name: "existing_electricity_connection" });
  const backupPowerReq = useWatch({ control: form.control, name: "backup_power_required" });
  const dgSet = useWatch({ control: form.control, name: "dg_set_required" });
  const ups = useWatch({ control: form.control, name: "ups_required" });
  const solarBackup = useWatch({ control: form.control, name: "solar_backup_proposed" });
  const waterSource = useWatch({ control: form.control, name: "water_source" });
  const waterYearRound = useWatch({ control: form.control, name: "water_available_year_round" });

  // Watched text/number inputs across A/B/D/G/H/I — all controlled now.
  const consumerNumber = useWatch({ control: form.control, name: "consumer_number" }) ?? "";
  const connectedLoadKw = useWatch({ control: form.control, name: "connected_load_kw" });
  const contractDemandKva = useWatch({ control: form.control, name: "contract_demand_kva" });
  const additionalLoadRequired = useWatch({ control: form.control, name: "additional_load_required" }) ?? "";
  const generatorCapacity = useWatch({ control: form.control, name: "generator_capacity" }) ?? "";
  const waterSourceOther = useWatch({ control: form.control, name: "water_source_other" }) ?? "";
  const dailyWaterReq = useWatch({ control: form.control, name: "daily_water_requirement" }) ?? "";
  const peakWaterReq = useWatch({ control: form.control, name: "peak_water_requirement" }) ?? "";
  const annualWaterReq = useWatch({ control: form.control, name: "annual_water_requirement" }) ?? "";
  const waterStorageCap = useWatch({ control: form.control, name: "water_storage_capacity" }) ?? "";
  const waterTreatmentRequired = useWatch({ control: form.control, name: "water_treatment_required" }) ?? "";
  const temperatureRange = useWatch({ control: form.control, name: "temperature_range" }) ?? "";
  const coolingCapacity = useWatch({ control: form.control, name: "cooling_capacity" }) ?? "";
  const coldRoomSize = useWatch({ control: form.control, name: "cold_room_size" }) ?? "";
  const numChambers = useWatch({ control: form.control, name: "num_chambers" });
  const refrigerantType = useWatch({ control: form.control, name: "refrigerant_type" }) ?? "";
  const refrigerationBackup = useWatch({ control: form.control, name: "refrigeration_backup_arrangement" }) ?? "";
  const effluentQuantity = useWatch({ control: form.control, name: "effluent_quantity" }) ?? "";
  const effluentTreatmentRequired = useWatch({ control: form.control, name: "effluent_treatment_required" }) ?? "";
  const effluentTreatmentMethod = useWatch({ control: form.control, name: "effluent_treatment_method" }) ?? "";
  const effluentDisposalMethod = useWatch({ control: form.control, name: "effluent_disposal_method" }) ?? "";
  const effluentReuseProposed = useWatch({ control: form.control, name: "effluent_reuse_proposed" }) ?? "";
  const commOther = useWatch({ control: form.control, name: "communication_other" }) ?? "";
  const fireSafetyOther = useWatch({ control: form.control, name: "fire_safety_other" }) ?? "";

  // Convenience setter — always includes shouldDirty: true.
  const setField = <K extends keyof Data>(name: K, value: Data[K]) =>
    form.setValue(name as never, value as never, { shouldDirty: true });

  const toggleField = (field: "communication_items" | "fire_safety_items", code: string, checked: boolean) => {
    const cur = form.getValues(field) ?? [];
    setField(field, checked ? [...cur, code] : cur.filter((c) => c !== code));
  };

  // Section-level live errors — mirror utilities_validators.py.
  const liveErrors: Record<string, string | undefined> = {};
  if (elReq && !electricitySupplyType) {
    liveErrors.electricity_supply_type = "Type of Supply shall be specified if electricity is required.";
  }
  if (waterReq && !waterSource) {
    liveErrors.water_source = "Source of Water shall be specified.";
  }
  if (waterSource === "other" && !String(waterSourceOther).trim()) {
    liveErrors.water_source_other = 'Please specify — "Others" was selected for water source.';
  }
  if (comm.includes("other") && !String(commOther).trim()) {
    liveErrors.communication_other = 'Please specify — "Others" in communication items.';
  }
  if (fireSafety.includes("other") && !String(fireSafetyOther).trim()) {
    liveErrors.fire_safety_other = 'Please specify — "Others" in fire & safety.';
  }
  const err = (name: string): string | undefined =>
    fieldErrors.get(name) ?? liveErrors[name];

  const loading = isLoading || fuelQuery.isLoading || wasteQuery.isLoading || renewableQuery.isLoading;

  // ── Reusable field renderers to shorten JSX ──
  const textInput = (
    watchedValue: string,
    key: keyof Data,
    label: string,
    max: number = MAX_TEXT_CHARS,
    placeholder?: string,
  ) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        value={watchedValue}
        maxLength={max}
        placeholder={placeholder}
        onChange={(e) => setField(key, e.target.value.slice(0, max) as Data[keyof Data])}
      />
    </div>
  );

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="utilities"
      loading={loading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
      help={
        <SectionHelp
          title="Utilities & Support Services"
          purpose="Capture every utility + support service the project needs — electricity, water, fuel, refrigeration, process utilities (compressed air / steam / boiler / hot water), waste management, effluent treatment, communication + digital infrastructure, fire & safety, and renewable-energy initiatives. Each utility drives its own line-item in Project Cost or Operating Cost."
          whatToFill={[
            "A — Electricity. Tick 'Electricity required' to reveal all fields. Type of supply (single/three phase, HT/LT) is required if ticked. Consumer number, connected load (kW), contract demand (kVA), additional load required, generator capacity, DG set / UPS / solar toggles all optional.",
            "B — Water. Tick 'Water required' to reveal fields. Source is required if ticked (borewell, panchayat, municipal, river, canal, tank, RWH, private, other). 'Others' reveals a specify field. Daily / peak / annual requirement + storage + treatment all optional.",
            "C — Fuels (add ≥ 1 row if any fuel is used). Fuel FK (master data, 10 types) is required per row. 'Others' fuel reveals a specify field. Purpose, daily/annual consumption, estimated annual cost all optional.",
            "D — Refrigeration & Cooling. Tick 'Refrigeration required' to reveal 6 fields. All optional — temperature range, cooling capacity, cold-room size, chambers count, refrigerant type, backup arrangement.",
            "E — Process Utilities (add rows for compressed air / steam / boiler / hot water). Utility type required per row; purpose, capacity, source optional. DB enforces unique-per-type — can't add 'Steam' twice.",
            "F — Waste Management (add ≥ 1 row per waste type). Waste FK + disposal method are required per row (backend enforces both). Utilisation method + revenue from by-products optional.",
            "G — Effluent. Tick 'Project generates effluent' to reveal 5 fields. All optional — quantity, treatment required/method, disposal, reuse proposed.",
            "H — Communication & Digital (multi-select 14 items). Tick everything the project will use — broadband, mobile, Wi-Fi, CCTV, fibre, ERP, accounting SW, inventory SW, barcode, QR, digital weighing, biometric, cloud backup. 'Others' reveals specify field (required if ticked).",
            "I — Fire & Safety (multi-select 10 items). Tick everything already or planned — extinguishers, first aid, PPE, emergency exit, fire alarm, hydrant, smoke detector, emergency lighting, safety signage. 'Others' reveals specify field (required if ticked).",
            "J — Renewable Initiatives (add rows if applicable). Initiative FK required per row. Capacity, estimated cost, annual savings all optional. Solar rooftop / biogas / etc.",
          ]}
          tips={[
            "Electricity supply type + Water source are the only two truly mandatory fields on this page. Everything else is per-KAU 'strongly recommended but not blocking'. Fill what you have with confidence; leave blanks blank rather than guess.",
            "DG set + UPS + Solar backup are independent toggles — a project can have all three (routine mains + DG for peak season + UPS for computers + solar for daytime load).",
            "Daily / Peak / Annual water requirement are free text so you can add units — '800 L/day', '1200 L peak season', '~250,000 L/year' all valid.",
            "Waste disposal method is the only per-row required field on this page. A DPR that fails to explain how coconut cake / fish scale / rice husk is disposed reads as environmentally naive.",
            "Communication + Fire & Safety are quick checklist tick-boxes. Overshoot rather than undershoot — even simple projects need extinguishers + first aid + PPE + emergency exit + signage as a minimum.",
            "Renewable initiatives get preferential loan terms from most banks. A 10 kWp rooftop solar with 4-year payback is worth documenting even if you plan it for Phase 2.",
          ]}
          downstream={[
            "Utilities chapter in the DPR PDF — full A-J profile renders there",
            "Project Cost — DG set, UPS, solar backup, refrigeration, boiler, renewable initiatives all sum into their respective machinery / infrastructure lines",
            "Operating Cost — fuel annual cost + electricity load × tariff + water charges feed the annual opex line",
            "Environmental Compliance chapter — waste disposal method + effluent treatment + renewable initiatives all render there",
            "Risk Analysis chapter — power outage risk mitigated by DG/UPS/solar; water scarcity risk mitigated by RWH + storage",
            "AI narrative — utility profile + renewable initiatives feed the Utilities Selection paragraph and the sustainability angle",
          ]}
        />
      }
    >
      <div className="space-y-4">
        {/* A. Electricity — id enables readiness-panel deep-link scroll */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">A. Electricity Requirement</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={elReq} onCheckedChange={(c) => setField("electricity_required", !!c)} />
            Electricity required
          </label>
          {elReq && (
            <div className="space-y-3 border-l-2 border-primary/30 pl-4">
              <div id="dpr-field-electricity_supply_type" className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className={err("electricity_supply_type") ? "text-xs text-destructive" : "text-xs"}>
                    Type of supply *
                  </Label>
                  <SearchableSelect
                    value={electricitySupplyType ?? ""}
                    options={ELECTRICITY_SUPPLY}
                    onChange={(v: string) => setField("electricity_supply_type", v)}
                    placeholder="Type to search…"
                  />
                  {err("electricity_supply_type") && (
                    <p className="text-xs text-destructive">{err("electricity_supply_type")}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={existingElConn === true} onCheckedChange={(c) => setField("existing_electricity_connection", !!c)} />
                    Existing connection
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={backupPowerReq === true} onCheckedChange={(c) => setField("backup_power_required", !!c)} />
                    Backup power required
                  </label>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Consumer number</Label>
                  <Input
                    value={consumerNumber as string}
                    maxLength={MAX_SHORT_CHARS}
                    onChange={(e) => setField("consumer_number", e.target.value.slice(0, MAX_SHORT_CHARS))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Connected load (kW)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    maxLength={12}
                    placeholder="e.g. 25"
                    value={connectedLoadKw !== null && connectedLoadKw !== undefined ? String(connectedLoadKw) : ""}
                    onChange={(e) => {
                      const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_LOAD_KW, maxDecimals: 2 });
                      setField("connected_load_kw", (cleaned === "" ? null : cleaned) as Data["connected_load_kw"]);
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Contract demand (kVA)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    maxLength={12}
                    placeholder="e.g. 30"
                    value={contractDemandKva !== null && contractDemandKva !== undefined ? String(contractDemandKva) : ""}
                    onChange={(e) => {
                      const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_LOAD_KW, maxDecimals: 2 });
                      setField("contract_demand_kva", (cleaned === "" ? null : cleaned) as Data["contract_demand_kva"]);
                    }}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {textInput(additionalLoadRequired as string, "additional_load_required", "Additional load required")}
                {textInput(generatorCapacity as string, "generator_capacity", "Generator capacity")}
              </div>
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={dgSet} onCheckedChange={(c) => setField("dg_set_required", !!c)} /> DG set
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={ups} onCheckedChange={(c) => setField("ups_required", !!c)} /> UPS
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={solarBackup} onCheckedChange={(c) => setField("solar_backup_proposed", !!c)} /> Solar backup
                </label>
              </div>
            </div>
          )}
        </CardContent></Card>

        {/* B. Water */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">B. Water Requirement</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={waterReq} onCheckedChange={(c) => setField("water_required", !!c)} />
            Water required
          </label>
          {waterReq && (
            <div className="space-y-3 border-l-2 border-primary/30 pl-4">
              <div id="dpr-field-water_source" className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className={err("water_source") ? "text-xs text-destructive" : "text-xs"}>
                    Source of water *
                  </Label>
                  <SearchableSelect
                    value={waterSource ?? ""}
                    options={WATER_SOURCES}
                    onChange={(v: string) => setField("water_source", v)}
                    placeholder="Type to search source…"
                  />
                  {err("water_source") && (
                    <p className="text-xs text-destructive">{err("water_source")}</p>
                  )}
                </div>
                <label className="flex cursor-pointer items-center gap-2 pt-6 text-sm">
                  <Checkbox checked={waterYearRound === true} onCheckedChange={(c) => setField("water_available_year_round", !!c)} />
                  Available year-round
                </label>
              </div>
              {waterSource === "other" && (
                <div id="dpr-field-water_source_other" className="space-y-1.5">
                  <Label className={err("water_source_other") ? "text-xs text-destructive" : "text-xs"}>
                    Please specify (Others) *
                  </Label>
                  <Input
                    value={waterSourceOther as string}
                    maxLength={MAX_OTHER_TEXT_CHARS}
                    onChange={(e) => setField("water_source_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
                  />
                  {err("water_source_other") && (
                    <p className="text-xs text-destructive">{err("water_source_other")}</p>
                  )}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {textInput(dailyWaterReq as string, "daily_water_requirement", "Daily requirement")}
                {textInput(peakWaterReq as string, "peak_water_requirement", "Peak requirement")}
                {textInput(annualWaterReq as string, "annual_water_requirement", "Annual requirement")}
                {textInput(waterStorageCap as string, "water_storage_capacity", "Storage capacity")}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Water treatment required</Label>
                <CountedTextarea
                  rows={2}
                  maxChars={MAX_LONG_TEXT_CHARS}
                  value={waterTreatmentRequired as string}
                  onChange={(v) => setField("water_treatment_required", v)}
                />
              </div>
            </div>
          )}
        </CardContent></Card>

        {/* C. Fuels */}
        <NestedListCard<Fuel>
          title="C. Fuel Requirement"
          items={fuels}
          onChange={(next) => form.setValue("fuels", next, { shouldDirty: true })}
          warning={fieldWarnings.get("fuels")}
          emptyRow={{ fuel: null, fuel_other: "", purpose: "", daily_consumption: "", annual_consumption: "", estimated_annual_cost: null }}
          columns={[
            { key: "fuel", label: "Fuel", render: (v) => (fuelQuery.data?.find((r) => r.id === v)?.label as string) ?? "—" },
            { key: "purpose", label: "Purpose" },
            { key: "estimated_annual_cost", label: "Annual cost (₹)" },
          ]}
          isValid={(row) => Object.keys(validateFuel(row)).length === 0}
          addLabel="Add fuel"
          editLabel="Edit fuel"
          renderModal={(row, set) => {
            const fErr = validateFuel(row);
            const isOtherFuel = fuelQuery.data?.find((r) => r.id === row.fuel)?.code === "other";
            return (
              <>
                <ModalField label="Fuel *" error={fErr.fuel}>
                  <MasterSearchableSelect
                    value={row.fuel}
                    options={fuelQuery.data ?? []}
                    onChange={(v) => set("fuel", v)}
                    placeholder="Type to search fuel…"
                  />
                </ModalField>
                {isOtherFuel && (
                  <ModalField label="Please specify (Others)">
                    <Input
                      value={row.fuel_other}
                      maxLength={MAX_OTHER_TEXT_CHARS}
                      onChange={(e) => set("fuel_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
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
                  <ModalField label="Daily consumption">
                    <Input
                      value={row.daily_consumption}
                      maxLength={MAX_TEXT_CHARS}
                      onChange={(e) => set("daily_consumption", e.target.value.slice(0, MAX_TEXT_CHARS))}
                    />
                  </ModalField>
                  <ModalField label="Annual consumption">
                    <Input
                      value={row.annual_consumption}
                      maxLength={MAX_TEXT_CHARS}
                      onChange={(e) => set("annual_consumption", e.target.value.slice(0, MAX_TEXT_CHARS))}
                    />
                  </ModalField>
                </ModalRow>
                <ModalField label="Estimated annual cost (₹)">
                  <Input
                    type="text"
                    inputMode="decimal"
                    maxLength={16}
                    placeholder="e.g. 50000"
                    value={row.estimated_annual_cost !== null && row.estimated_annual_cost !== undefined ? String(row.estimated_annual_cost) : ""}
                    onChange={(e) => {
                      const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_COST_INR, maxDecimals: 2 });
                      set("estimated_annual_cost", cleaned === "" ? null : cleaned);
                    }}
                  />
                </ModalField>
              </>
            );
          }}
        />

        {/* D. Refrigeration */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">D. Refrigeration & Cooling</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={refrReq} onCheckedChange={(c) => setField("refrigeration_required", !!c)} />
            Refrigeration required
          </label>
          {refrReq && (
            <div className="grid gap-3 border-l-2 border-primary/30 pl-4 sm:grid-cols-2">
              {textInput(temperatureRange as string, "temperature_range", "Temperature range")}
              {textInput(coolingCapacity as string, "cooling_capacity", "Cooling capacity")}
              {textInput(coldRoomSize as string, "cold_room_size", "Cold room size")}
              {textInput(refrigerantType as string, "refrigerant_type", "Refrigerant type")}
              {textInput(refrigerationBackup as string, "refrigeration_backup_arrangement", "Backup arrangement")}
              <div className="space-y-1.5">
                <Label className="text-xs">Number of chambers</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  placeholder="e.g. 2"
                  value={numChambers !== null && numChambers !== undefined ? String(numChambers) : ""}
                  onChange={(e) => {
                    const cleaned = normaliseIntegerInput(e.target.value, { max: MAX_CHAMBERS, min: 1 });
                    setField("num_chambers", (cleaned === "" ? null : cleaned) as Data["num_chambers"]);
                  }}
                />
              </div>
            </div>
          )}
        </CardContent></Card>

        {/* E. Process Utilities */}
        <NestedListCard<Process>
          title="E. Compressed Air, Steam & Boilers"
          items={processUtils}
          onChange={(next) => form.setValue("process_utilities", next, { shouldDirty: true })}
          warning={fieldWarnings.get("process_utilities")}
          emptyRow={{ utility_type: "", purpose: "", capacity: "", source: "" }}
          columns={[
            { key: "utility_type", label: "Type", render: (v) => PROCESS_TYPES.find((o) => o.value === v)?.label ?? "—" },
            { key: "purpose", label: "Purpose" },
          ]}
          isValid={(row) => Object.keys(validateProcess(row)).length === 0}
          addLabel="Add utility"
          editLabel="Edit utility"
          renderModal={(row, set) => {
            const pErr = validateProcess(row);
            return (
              <>
                <ModalField label="Utility type *" error={pErr.utility_type}>
                  <SearchableSelect
                    value={row.utility_type}
                    options={PROCESS_TYPES}
                    onChange={(v: string) => set("utility_type", v)}
                    placeholder="Type to search…"
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
                  <ModalField label="Capacity">
                    <Input
                      value={row.capacity}
                      maxLength={MAX_TEXT_CHARS}
                      onChange={(e) => set("capacity", e.target.value.slice(0, MAX_TEXT_CHARS))}
                    />
                  </ModalField>
                  <ModalField label="Source">
                    <Input
                      value={row.source}
                      maxLength={MAX_TEXT_CHARS}
                      onChange={(e) => set("source", e.target.value.slice(0, MAX_TEXT_CHARS))}
                    />
                  </ModalField>
                </ModalRow>
              </>
            );
          }}
        />

        {/* F. Waste Management — id enables readiness-panel deep-link scroll */}
        <div id="dpr-field-wastes" />
        <NestedListCard<Waste>
          title="F. Waste Management"
          items={wastes}
          onChange={(next) => form.setValue("wastes", next, { shouldDirty: true })}
          warning={fieldWarnings.get("wastes")}
          emptyRow={{ waste: null, waste_other: "", disposal_method: "", estimated_quantity: "", utilisation_method: "", revenue_from_byproducts: null }}
          columns={[
            { key: "waste", label: "Waste", render: (v) => (wasteQuery.data?.find((r) => r.id === v)?.label as string) ?? "—" },
            { key: "disposal_method", label: "Disposal", render: (v) => ((v as string)?.slice(0, 30) ?? "") + ((v as string)?.length > 30 ? "…" : "") },
          ]}
          isValid={(row) => Object.keys(validateWaste(row)).length === 0}
          addLabel="Add waste"
          editLabel="Edit waste"
          renderModal={(row, set) => {
            const wErr = validateWaste(row);
            const isOtherWaste = wasteQuery.data?.find((r) => r.id === row.waste)?.code === "other";
            return (
              <>
                <ModalField label="Waste type *" error={wErr.waste}>
                  <MasterSearchableSelect
                    value={row.waste}
                    options={wasteQuery.data ?? []}
                    onChange={(v) => set("waste", v)}
                    placeholder="Type to search waste…"
                  />
                </ModalField>
                {isOtherWaste && (
                  <ModalField label="Please specify (Others)">
                    <Input
                      value={row.waste_other}
                      maxLength={MAX_OTHER_TEXT_CHARS}
                      onChange={(e) => set("waste_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
                    />
                  </ModalField>
                )}
                <ModalField label="Disposal method *" error={wErr.disposal_method}>
                  <CountedTextarea
                    rows={2}
                    maxChars={MAX_LONG_TEXT_CHARS}
                    value={row.disposal_method}
                    onChange={(v) => set("disposal_method", v)}
                    error={Boolean(wErr.disposal_method)}
                  />
                </ModalField>
                <ModalRow>
                  <ModalField label="Estimated quantity">
                    <Input
                      value={row.estimated_quantity}
                      maxLength={MAX_TEXT_CHARS}
                      onChange={(e) => set("estimated_quantity", e.target.value.slice(0, MAX_TEXT_CHARS))}
                    />
                  </ModalField>
                  <ModalField label="Revenue from by-products (₹)">
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={16}
                      placeholder="e.g. 500000"
                      value={row.revenue_from_byproducts !== null && row.revenue_from_byproducts !== undefined ? String(row.revenue_from_byproducts) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_COST_INR, maxDecimals: 2 });
                        set("revenue_from_byproducts", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                </ModalRow>
                <ModalField label="Utilisation method">
                  <CountedTextarea
                    rows={2}
                    maxChars={MAX_LONG_TEXT_CHARS}
                    value={row.utilisation_method}
                    onChange={(v) => set("utilisation_method", v)}
                  />
                </ModalField>
              </>
            );
          }}
        />

        {/* G. Effluent */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">G. Effluent Management</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={effluent} onCheckedChange={(c) => setField("generates_effluent", !!c)} />
            Project generates effluent
          </label>
          {effluent && (
            <div className="space-y-3 border-l-2 border-primary/30 pl-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {textInput(effluentQuantity as string, "effluent_quantity", "Estimated quantity")}
                {textInput(effluentTreatmentRequired as string, "effluent_treatment_required", "Treatment required")}
                {textInput(effluentDisposalMethod as string, "effluent_disposal_method", "Final disposal method")}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Treatment method</Label>
                <CountedTextarea
                  rows={2}
                  maxChars={MAX_LONG_TEXT_CHARS}
                  value={effluentTreatmentMethod as string}
                  onChange={(v) => setField("effluent_treatment_method", v)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reuse proposed</Label>
                <CountedTextarea
                  rows={2}
                  maxChars={MAX_LONG_TEXT_CHARS}
                  value={effluentReuseProposed as string}
                  onChange={(v) => setField("effluent_reuse_proposed", v)}
                />
              </div>
            </div>
          )}
        </CardContent></Card>

        {/* H. Communication */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">H. Communication & Digital Infrastructure</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {COMMUNICATION.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={comm.includes(o.value)} onCheckedChange={(c) => toggleField("communication_items", o.value, !!c)} />
                {o.label}
              </label>
            ))}
          </div>
          {comm.includes("other") && (
            <div id="dpr-field-communication_other" className="space-y-1.5">
              <Label className={err("communication_other") ? "text-xs text-destructive" : "text-xs"}>
                Please specify (Others) *
              </Label>
              <Input
                value={commOther as string}
                maxLength={MAX_OTHER_TEXT_CHARS}
                onChange={(e) => setField("communication_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
              />
              {err("communication_other") && (
                <p className="text-xs text-destructive">{err("communication_other")}</p>
              )}
            </div>
          )}
        </CardContent></Card>

        {/* I. Fire & Safety */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">I. Fire & Safety</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {FIRE_SAFETY.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={fireSafety.includes(o.value)} onCheckedChange={(c) => toggleField("fire_safety_items", o.value, !!c)} />
                {o.label}
              </label>
            ))}
          </div>
          {fireSafety.includes("other") && (
            <div id="dpr-field-fire_safety_other" className="space-y-1.5">
              <Label className={err("fire_safety_other") ? "text-xs text-destructive" : "text-xs"}>
                Please specify (Others) *
              </Label>
              <Input
                value={fireSafetyOther as string}
                maxLength={MAX_OTHER_TEXT_CHARS}
                onChange={(e) => setField("fire_safety_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
              />
              {err("fire_safety_other") && (
                <p className="text-xs text-destructive">{err("fire_safety_other")}</p>
              )}
            </div>
          )}
        </CardContent></Card>

        {/* J. Renewable Energy */}
        <NestedListCard<Renewable>
          title="J. Renewable Energy Initiatives"
          items={renewables}
          onChange={(next) => form.setValue("renewable_initiatives", next, { shouldDirty: true })}
          warning={fieldWarnings.get("renewable_initiatives")}
          emptyRow={{ initiative: null, initiative_other: "", capacity: "", estimated_cost: null, expected_annual_savings: null }}
          columns={[
            { key: "initiative", label: "Initiative", render: (v) => (renewableQuery.data?.find((r) => r.id === v)?.label as string) ?? "—" },
            { key: "capacity", label: "Capacity" },
            { key: "estimated_cost", label: "Cost (₹)" },
          ]}
          isValid={(row) => Object.keys(validateRenewable(row)).length === 0}
          addLabel="Add initiative"
          editLabel="Edit initiative"
          renderModal={(row, set) => {
            const rErr = validateRenewable(row);
            const isOtherInit = renewableQuery.data?.find((r) => r.id === row.initiative)?.code === "other";
            return (
              <>
                <ModalField label="Initiative *" error={rErr.initiative}>
                  <MasterSearchableSelect
                    value={row.initiative}
                    options={renewableQuery.data ?? []}
                    onChange={(v) => set("initiative", v)}
                    placeholder="Type to search initiative…"
                  />
                </ModalField>
                {isOtherInit && (
                  <ModalField label="Please specify (Others)">
                    <Input
                      value={row.initiative_other}
                      maxLength={MAX_OTHER_TEXT_CHARS}
                      onChange={(e) => set("initiative_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
                    />
                  </ModalField>
                )}
                <ModalField label="Capacity">
                  <Input
                    value={row.capacity}
                    maxLength={MAX_TEXT_CHARS}
                    onChange={(e) => set("capacity", e.target.value.slice(0, MAX_TEXT_CHARS))}
                  />
                </ModalField>
                <ModalRow>
                  <ModalField label="Estimated cost (₹)">
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={16}
                      placeholder="e.g. 500000"
                      value={row.estimated_cost !== null && row.estimated_cost !== undefined ? String(row.estimated_cost) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_COST_INR, maxDecimals: 2 });
                        set("estimated_cost", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                  <ModalField label="Expected annual savings (₹)">
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={16}
                      placeholder="e.g. 90000"
                      value={row.expected_annual_savings !== null && row.expected_annual_savings !== undefined ? String(row.expected_annual_savings) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_COST_INR, maxDecimals: 2 });
                        set("expected_annual_savings", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                </ModalRow>
              </>
            );
          }}
        />
      </div>
    </SectionShell>
  );
}
