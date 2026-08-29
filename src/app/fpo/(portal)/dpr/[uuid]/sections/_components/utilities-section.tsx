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
  ChoiceSelect,
  MasterSelect,
  ModalField,
  ModalRow,
  NestedListCard,
} from "./nested-list";
import { SectionShell } from "./section-shell";

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

const FuelSchema = z.object({
  id: z.number().optional(),
  fuel: z.number(),
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
  waste: z.number(),
  waste_other: z.string(),
  disposal_method: z.string(),
  estimated_quantity: z.string(),
  utilisation_method: z.string(),
  revenue_from_byproducts: z.union([z.string(), z.number()]).nullable(),
});
type Waste = z.infer<typeof WasteSchema>;

const RenewableSchema = z.object({
  id: z.number().optional(),
  initiative: z.number(),
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

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, save, discard } = useDprSectionForm<Data>({
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

  const toggleField = (field: "communication_items" | "fire_safety_items", code: string, checked: boolean) => {
    const cur = form.getValues(field) ?? [];
    form.setValue(field, checked ? [...cur, code] : cur.filter((c) => c !== code), { shouldDirty: true });
  };

  const loading = isLoading || fuelQuery.isLoading || wasteQuery.isLoading || renewableQuery.isLoading;

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
    >
      <div className="space-y-4">
        {/* A. Electricity */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">A. Electricity Requirement</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={elReq} onCheckedChange={(c) => form.setValue("electricity_required", !!c, { shouldDirty: true })} />
            Electricity required
          </label>
          {elReq && (
            <div className="space-y-3 border-l-2 border-primary/30 pl-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label className="text-xs">Type of supply *</Label><ChoiceSelect value={electricitySupplyType ?? ""} options={ELECTRICITY_SUPPLY} onChange={(v) => form.setValue("electricity_supply_type", v, { shouldDirty: true })} /></div>
                <div className="flex flex-col gap-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={existingElConn === true} onCheckedChange={(c) => form.setValue("existing_electricity_connection", !!c, { shouldDirty: true })} />
                    Existing connection
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={backupPowerReq === true} onCheckedChange={(c) => form.setValue("backup_power_required", !!c, { shouldDirty: true })} />
                    Backup power required
                  </label>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5"><Label className="text-xs">Consumer number</Label><Input {...form.register("consumer_number")} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Connected load (kW)</Label><Input type="number" step="0.01" {...form.register("connected_load_kw")} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Contract demand (kVA)</Label><Input type="number" step="0.01" {...form.register("contract_demand_kva")} /></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label className="text-xs">Additional load required</Label><Input {...form.register("additional_load_required")} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Generator capacity</Label><Input {...form.register("generator_capacity")} /></div>
              </div>
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={dgSet} onCheckedChange={(c) => form.setValue("dg_set_required", !!c, { shouldDirty: true })} /> DG set</label>
                <label className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={ups} onCheckedChange={(c) => form.setValue("ups_required", !!c, { shouldDirty: true })} /> UPS</label>
                <label className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={solarBackup} onCheckedChange={(c) => form.setValue("solar_backup_proposed", !!c, { shouldDirty: true })} /> Solar backup</label>
              </div>
            </div>
          )}
        </CardContent></Card>

        {/* B. Water */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">B. Water Requirement</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={waterReq} onCheckedChange={(c) => form.setValue("water_required", !!c, { shouldDirty: true })} />
            Water required
          </label>
          {waterReq && (
            <div className="space-y-3 border-l-2 border-primary/30 pl-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label className="text-xs">Source of water *</Label><ChoiceSelect value={waterSource ?? ""} options={WATER_SOURCES} onChange={(v) => form.setValue("water_source", v, { shouldDirty: true })} /></div>
                <label className="flex cursor-pointer items-center gap-2 pt-6 text-sm">
                  <Checkbox checked={waterYearRound === true} onCheckedChange={(c) => form.setValue("water_available_year_round", !!c, { shouldDirty: true })} />
                  Available year-round
                </label>
              </div>
              {waterSource === "other" && (
                <div className="space-y-1.5"><Label className="text-xs">Specify</Label><Input {...form.register("water_source_other")} /></div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {[["daily_water_requirement","Daily requirement"],["peak_water_requirement","Peak requirement"],["annual_water_requirement","Annual requirement"],["water_storage_capacity","Storage capacity"]].map(([k,l]) => (
                  <div key={k} className="space-y-1.5"><Label className="text-xs">{l}</Label><Input {...form.register(k as keyof Data)} /></div>
                ))}
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Water treatment required</Label><Textarea rows={2} {...form.register("water_treatment_required")} /></div>
            </div>
          )}
        </CardContent></Card>

        {/* C. Fuels */}
        <NestedListCard<Fuel>
          title="C. Fuel Requirement"
          items={fuels}
          onChange={(next) => form.setValue("fuels", next, { shouldDirty: true })}
          emptyRow={{ fuel: 0, fuel_other: "", purpose: "", daily_consumption: "", annual_consumption: "", estimated_annual_cost: null }}
          columns={[
            { key: "fuel", label: "Fuel", render: (v) => (fuelQuery.data?.find((r) => r.id === v)?.label as string) ?? "—" },
            { key: "purpose", label: "Purpose" },
            { key: "estimated_annual_cost", label: "Annual cost (₹)" },
          ]}
          isValid={(row) => row.fuel > 0}
          addLabel="Add fuel"
          editLabel="Edit fuel"
          renderModal={(row, set) => (
            <>
              <ModalField label="Fuel *"><MasterSelect value={row.fuel === 0 ? null : row.fuel} options={fuelQuery.data ?? []} onChange={(v) => set("fuel", (v ?? 0) as number)} /></ModalField>
              {fuelQuery.data?.find((r) => r.id === row.fuel)?.code === "other" && (
                <ModalField label="Specify"><Input value={row.fuel_other} onChange={(e) => set("fuel_other", e.target.value)} /></ModalField>
              )}
              <ModalField label="Purpose"><Input value={row.purpose} onChange={(e) => set("purpose", e.target.value)} /></ModalField>
              <ModalRow>
                <ModalField label="Daily consumption"><Input value={row.daily_consumption} onChange={(e) => set("daily_consumption", e.target.value)} /></ModalField>
                <ModalField label="Annual consumption"><Input value={row.annual_consumption} onChange={(e) => set("annual_consumption", e.target.value)} /></ModalField>
              </ModalRow>
              <ModalField label="Estimated annual cost (₹)"><Input type="number" step="0.01" value={row.estimated_annual_cost ?? ""} onChange={(e) => set("estimated_annual_cost", e.target.value || null)} /></ModalField>
            </>
          )}
        />

        {/* D. Refrigeration */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">D. Refrigeration & Cooling</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={refrReq} onCheckedChange={(c) => form.setValue("refrigeration_required", !!c, { shouldDirty: true })} />
            Refrigeration required
          </label>
          {refrReq && (
            <div className="grid gap-3 border-l-2 border-primary/30 pl-4 sm:grid-cols-2">
              {[["temperature_range","Temperature range"],["cooling_capacity","Cooling capacity"],["cold_room_size","Cold room size"],["refrigerant_type","Refrigerant type"],["refrigeration_backup_arrangement","Backup arrangement"]].map(([k,l]) => (
                <div key={k} className="space-y-1.5"><Label className="text-xs">{l}</Label><Input {...form.register(k as keyof Data)} /></div>
              ))}
              <div className="space-y-1.5"><Label className="text-xs">Number of chambers</Label><Input type="number" min="1" {...form.register("num_chambers")} /></div>
            </div>
          )}
        </CardContent></Card>

        {/* E. Process Utilities */}
        <NestedListCard<Process>
          title="E. Compressed Air, Steam & Boilers"
          items={processUtils}
          onChange={(next) => form.setValue("process_utilities", next, { shouldDirty: true })}
          emptyRow={{ utility_type: "", purpose: "", capacity: "", source: "" }}
          columns={[
            { key: "utility_type", label: "Type", render: (v) => PROCESS_TYPES.find((o) => o.value === v)?.label ?? "—" },
            { key: "purpose", label: "Purpose" },
          ]}
          isValid={(row) => !!row.utility_type}
          addLabel="Add utility"
          editLabel="Edit utility"
          renderModal={(row, set) => (
            <>
              <ModalField label="Utility type *"><ChoiceSelect value={row.utility_type} options={PROCESS_TYPES} onChange={(v) => set("utility_type", v)} /></ModalField>
              <ModalField label="Purpose"><Input value={row.purpose} onChange={(e) => set("purpose", e.target.value)} /></ModalField>
              <ModalRow>
                <ModalField label="Capacity"><Input value={row.capacity} onChange={(e) => set("capacity", e.target.value)} /></ModalField>
                <ModalField label="Source"><Input value={row.source} onChange={(e) => set("source", e.target.value)} /></ModalField>
              </ModalRow>
            </>
          )}
        />

        {/* F. Waste Management */}
        <NestedListCard<Waste>
          title="F. Waste Management"
          items={wastes}
          onChange={(next) => form.setValue("wastes", next, { shouldDirty: true })}
          emptyRow={{ waste: 0, waste_other: "", disposal_method: "", estimated_quantity: "", utilisation_method: "", revenue_from_byproducts: null }}
          columns={[
            { key: "waste", label: "Waste", render: (v) => (wasteQuery.data?.find((r) => r.id === v)?.label as string) ?? "—" },
            { key: "disposal_method", label: "Disposal", render: (v) => ((v as string)?.slice(0, 30) ?? "") + ((v as string)?.length > 30 ? "…" : "") },
          ]}
          isValid={(row) => row.waste > 0 && row.disposal_method.trim().length > 0}
          addLabel="Add waste"
          editLabel="Edit waste"
          renderModal={(row, set) => (
            <>
              <ModalField label="Waste type *"><MasterSelect value={row.waste === 0 ? null : row.waste} options={wasteQuery.data ?? []} onChange={(v) => set("waste", (v ?? 0) as number)} /></ModalField>
              {wasteQuery.data?.find((r) => r.id === row.waste)?.code === "other" && (
                <ModalField label="Specify"><Input value={row.waste_other} onChange={(e) => set("waste_other", e.target.value)} /></ModalField>
              )}
              <ModalField label="Disposal method *"><Textarea rows={2} value={row.disposal_method} onChange={(e) => set("disposal_method", e.target.value)} /></ModalField>
              <ModalRow>
                <ModalField label="Estimated quantity"><Input value={row.estimated_quantity} onChange={(e) => set("estimated_quantity", e.target.value)} /></ModalField>
                <ModalField label="Revenue from by-products (₹)"><Input type="number" step="0.01" value={row.revenue_from_byproducts ?? ""} onChange={(e) => set("revenue_from_byproducts", e.target.value || null)} /></ModalField>
              </ModalRow>
              <ModalField label="Utilisation method"><Textarea rows={2} value={row.utilisation_method} onChange={(e) => set("utilisation_method", e.target.value)} /></ModalField>
            </>
          )}
        />

        {/* G. Effluent */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">G. Effluent Management</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={effluent} onCheckedChange={(c) => form.setValue("generates_effluent", !!c, { shouldDirty: true })} />
            Project generates effluent
          </label>
          {effluent && (
            <div className="space-y-3 border-l-2 border-primary/30 pl-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {[["effluent_quantity","Estimated quantity"],["effluent_treatment_required","Treatment required"],["effluent_disposal_method","Final disposal method"]].map(([k,l]) => (
                  <div key={k} className="space-y-1.5"><Label className="text-xs">{l}</Label><Input {...form.register(k as keyof Data)} /></div>
                ))}
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Treatment method</Label><Textarea rows={2} {...form.register("effluent_treatment_method")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Reuse proposed</Label><Textarea rows={2} {...form.register("effluent_reuse_proposed")} /></div>
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
            <div className="space-y-1.5"><Label className="text-xs">Specify</Label><Input {...form.register("communication_other")} /></div>
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
            <div className="space-y-1.5"><Label className="text-xs">Specify</Label><Input {...form.register("fire_safety_other")} /></div>
          )}
        </CardContent></Card>

        {/* J. Renewable Energy */}
        <NestedListCard<Renewable>
          title="J. Renewable Energy Initiatives"
          items={renewables}
          onChange={(next) => form.setValue("renewable_initiatives", next, { shouldDirty: true })}
          emptyRow={{ initiative: 0, initiative_other: "", capacity: "", estimated_cost: null, expected_annual_savings: null }}
          columns={[
            { key: "initiative", label: "Initiative", render: (v) => (renewableQuery.data?.find((r) => r.id === v)?.label as string) ?? "—" },
            { key: "capacity", label: "Capacity" },
            { key: "estimated_cost", label: "Cost (₹)" },
          ]}
          isValid={(row) => row.initiative > 0}
          addLabel="Add initiative"
          editLabel="Edit initiative"
          renderModal={(row, set) => (
            <>
              <ModalField label="Initiative *"><MasterSelect value={row.initiative === 0 ? null : row.initiative} options={renewableQuery.data ?? []} onChange={(v) => set("initiative", (v ?? 0) as number)} /></ModalField>
              {renewableQuery.data?.find((r) => r.id === row.initiative)?.code === "other" && (
                <ModalField label="Specify"><Input value={row.initiative_other} onChange={(e) => set("initiative_other", e.target.value)} /></ModalField>
              )}
              <ModalField label="Capacity"><Input value={row.capacity} onChange={(e) => set("capacity", e.target.value)} /></ModalField>
              <ModalRow>
                <ModalField label="Estimated cost (₹)"><Input type="number" step="0.01" value={row.estimated_cost ?? ""} onChange={(e) => set("estimated_cost", e.target.value || null)} /></ModalField>
                <ModalField label="Expected annual savings (₹)"><Input type="number" step="0.01" value={row.expected_annual_savings ?? ""} onChange={(e) => set("expected_annual_savings", e.target.value || null)} /></ModalField>
              </ModalRow>
            </>
          )}
        />
      </div>
    </SectionShell>
  );
}
