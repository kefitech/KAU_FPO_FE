"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWatch } from "react-hook-form";

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

// ── Choices ────────────────────────────────────────────────────────────────

const TERRAIN = [
  { value: "plain", label: "Plain" },
  { value: "undulating", label: "Undulating" },
  { value: "hilly", label: "Hilly" },
  { value: "coastal", label: "Coastal" },
  { value: "river_basin", label: "River Basin" },
  { value: "other", label: "Others" },
];
const ELECTRICITY = [
  { value: "available", label: "Available" },
  { value: "proposed", label: "Proposed" },
  { value: "not_available", label: "Not Available" },
];
const WATER_AVAIL = [
  { value: "available", label: "Available" },
  { value: "not_available", label: "Not Available" },
];
const ROAD = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];
const WATER_SOURCES = [
  { value: "borewell", label: "Borewell" },
  { value: "open_well", label: "Open Well" },
  { value: "panchayat_supply", label: "Panchayat Supply" },
  { value: "river", label: "River" },
  { value: "canal", label: "Canal" },
  { value: "tank", label: "Tank" },
  { value: "other", label: "Others" },
];
const STATUTORY_APPROVALS = [
  { value: "land_conversion", label: "Land Conversion" },
  { value: "building_permit", label: "Building Permit" },
  { value: "factory_licence", label: "Factory Licence" },
  { value: "pollution_clearance", label: "Pollution Control Clearance" },
  { value: "fire_safety", label: "Fire & Safety Approval" },
  { value: "electrical_approval", label: "Electrical Approval" },
  { value: "ground_water_permit", label: "Ground Water Permission" },
  { value: "panchayat_approval", label: "Panchayat Approval" },
  { value: "municipality_approval", label: "Municipality Approval" },
  { value: "environmental_clearance", label: "Environmental Clearance" },
  { value: "other", label: "Others (Specify)" },
];
const INFRA_TYPES = [
  { value: "approach_road", label: "Approach Road" },
  { value: "office_building", label: "Office Building" },
  { value: "storage_building", label: "Storage Building" },
  { value: "processing_shed", label: "Processing Shed" },
  { value: "electricity", label: "Electricity" },
  { value: "drinking_water", label: "Drinking Water" },
  { value: "toilets", label: "Toilets" },
  { value: "drainage", label: "Drainage" },
  { value: "other", label: "Others (Specify)" },
];
const CONSTRAINT_TYPES = [
  { value: "flooding", label: "Flooding" },
  { value: "water_scarcity", label: "Water Scarcity" },
  { value: "power_shortage", label: "Power Shortage" },
  { value: "poor_road_access", label: "Poor Road Access" },
  { value: "land_dispute", label: "Land Dispute" },
  { value: "env_restriction", label: "Environmental Restriction" },
  { value: "wildlife_restriction", label: "Wildlife Restriction" },
  { value: "crz_restriction", label: "CRZ Restriction" },
  { value: "forest_land", label: "Forest Land" },
  { value: "high_transport_cost", label: "High Transportation Cost" },
  { value: "labour_shortage", label: "Labour Shortage" },
  { value: "other", label: "Others (Specify)" },
];

// ── Schemas ────────────────────────────────────────────────────────────────

const ParcelSchema = z.object({
  id: z.number().optional(),
  order: z.number(),
  total_land_available: z.union([z.string(), z.number()]).nullable(),
  land_proposed_for_project: z.union([z.string(), z.number()]).nullable(),
  unit: z.number().nullable(),
  village: z.string(),
  taluk: z.string(),
  district: z.string(),
  ownership: z.number().nullable(),
  ownership_other: z.string(),
  survey_number: z.string(),
  resurvey_number: z.string(),
  date_of_acquisition: z.string().nullable(),
  present_land_use: z.string(),
  previous_land_use: z.string(),
});
type Parcel = z.infer<typeof ParcelSchema>;

const InfraSchema = z.object({
  id: z.number().optional(),
  order: z.number(),
  infrastructure_type: z.string(),
  infrastructure_type_other: z.string(),
  condition: z.string(),
  approximate_area: z.union([z.string(), z.number()]).nullable(),
  year_of_construction: z.union([z.string(), z.number()]).nullable(),
  renovation_required: z.boolean().nullable(),
});
type Infra = z.infer<typeof InfraSchema>;

const ConstraintSchema = z.object({
  id: z.number().optional(),
  constraint_type: z.string(),
  constraint_type_other: z.string(),
  mitigation_measure: z.string(),
  existing_situation: z.string(),
});
type Constraint = z.infer<typeof ConstraintSchema>;

const Schema = z.object({
  // B
  terrain: z.string(),
  terrain_other: z.string(),
  is_flood_prone: z.boolean().nullable(),
  water_available_year_round: z.boolean().nullable(),
  topography: z.string(),
  soil_type: z.string(),
  soil_bearing_capacity: z.string(),
  water_logging: z.string(),
  drainage_condition: z.string(),
  slope: z.string(),
  ground_water_level: z.string(),
  // D — distances
  dist_major_market_km: z.union([z.string(), z.number()]).nullable(),
  dist_major_raw_material_source_km: z.union([z.string(), z.number()]).nullable(),
  dist_all_weather_road_km: z.union([z.string(), z.number()]).nullable(),
  dist_state_highway_km: z.union([z.string(), z.number()]).nullable(),
  dist_national_highway_km: z.union([z.string(), z.number()]).nullable(),
  dist_railway_station_km: z.union([z.string(), z.number()]).nullable(),
  dist_airport_km: z.union([z.string(), z.number()]).nullable(),
  dist_seaport_km: z.union([z.string(), z.number()]).nullable(),
  dist_collection_centre_km: z.union([z.string(), z.number()]).nullable(),
  dist_processing_centre_km: z.union([z.string(), z.number()]).nullable(),
  // E
  electricity_availability: z.string(),
  water_availability: z.string(),
  road_connectivity: z.string(),
  water_sources: z.array(z.string()),
  water_source_other: z.string(),
  has_fibre: z.boolean(),
  has_broadband: z.boolean(),
  has_mobile_network: z.boolean(),
  internet_unavailable: z.boolean(),
  // F
  approvals_available: z.array(z.string()),
  approvals_other: z.string(),
  pending_approvals_remarks: z.string(),
  // G
  has_future_expansion: z.boolean(),
  additional_land_available: z.string(),
  area_reserved_for_expansion: z.string(),
  future_buildings_planned: z.string(),
  utility_expansion_feasibility: z.string(),
  // Nested
  parcels: z.array(ParcelSchema),
  existing_infrastructure: z.array(InfraSchema),
  constraints: z.array(ConstraintSchema),
});
type Data = z.infer<typeof Schema>;

function toDecStr(v: string | number | null): string | null {
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? String(n) : null;
}
function toInt(v: string | number | null): number | null {
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

const DIST_KEYS = [
  "dist_major_market_km", "dist_major_raw_material_source_km", "dist_all_weather_road_km",
  "dist_state_highway_km", "dist_national_highway_km", "dist_railway_station_km",
  "dist_airport_km", "dist_seaport_km", "dist_collection_centre_km", "dist_processing_centre_km",
] as const;

function serializePayload(v: Data): Record<string, unknown> {
  const out: Record<string, unknown> = { ...v };
  for (const k of DIST_KEYS) out[k] = toDecStr(v[k]);
  out.parcels = v.parcels.map((p, i) => ({
    ...p,
    order: i,
    total_land_available: toDecStr(p.total_land_available),
    land_proposed_for_project: toDecStr(p.land_proposed_for_project),
    date_of_acquisition: p.date_of_acquisition || null,
  }));
  out.existing_infrastructure = v.existing_infrastructure.map((it, i) => ({
    ...it,
    order: i,
    approximate_area: toDecStr(it.approximate_area),
    year_of_construction: toInt(it.year_of_construction),
  }));
  return out;
}

export function SiteSection({ uuid }: { uuid: string }) {
  const unitQuery = useQuery({
    queryKey: ["dpr-master", "capacity-units"],
    queryFn: () => dprMasterApi.list("capacity-units"),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const ownershipQuery = useQuery({
    queryKey: ["dpr-master", "land-ownership-types"],
    queryFn: () => dprMasterApi.list("land-ownership-types"),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, save, discard } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "site",
    schema: Schema,
    defaultValues: {
      terrain: "", terrain_other: "",
      is_flood_prone: null, water_available_year_round: null,
      topography: "", soil_type: "", soil_bearing_capacity: "", water_logging: "",
      drainage_condition: "", slope: "", ground_water_level: "",
      dist_major_market_km: null, dist_major_raw_material_source_km: null,
      dist_all_weather_road_km: null, dist_state_highway_km: null, dist_national_highway_km: null,
      dist_railway_station_km: null, dist_airport_km: null, dist_seaport_km: null,
      dist_collection_centre_km: null, dist_processing_centre_km: null,
      electricity_availability: "", water_availability: "", road_connectivity: "",
      water_sources: [], water_source_other: "",
      has_fibre: false, has_broadband: false, has_mobile_network: false, internet_unavailable: false,
      approvals_available: [], approvals_other: "", pending_approvals_remarks: "",
      has_future_expansion: false, additional_land_available: "", area_reserved_for_expansion: "",
      future_buildings_planned: "", utility_expansion_feasibility: "",
      parcels: [], existing_infrastructure: [], constraints: [],
    },
    serializePayload,
  });

  // useWatch — reactive subscriptions that reliably re-render after form.reset()
  // from server data (form.watch is stale for arrays/checkboxes/selects there).
  const parcels = useWatch({ control: form.control, name: "parcels" }) ?? [];
  const infra = useWatch({ control: form.control, name: "existing_infrastructure" }) ?? [];
  const constraints = useWatch({ control: form.control, name: "constraints" }) ?? [];
  const waterSources = useWatch({ control: form.control, name: "water_sources" }) ?? [];
  const approvals = useWatch({ control: form.control, name: "approvals_available" }) ?? [];
  const hasExpansion = useWatch({ control: form.control, name: "has_future_expansion" });
  const terrain = useWatch({ control: form.control, name: "terrain" });
  const isFloodProne = useWatch({ control: form.control, name: "is_flood_prone" });
  const waterYearRound = useWatch({ control: form.control, name: "water_available_year_round" });
  const electricity = useWatch({ control: form.control, name: "electricity_availability" });
  const waterAvail = useWatch({ control: form.control, name: "water_availability" });
  const roadConnectivity = useWatch({ control: form.control, name: "road_connectivity" });
  const hasFibre = useWatch({ control: form.control, name: "has_fibre" });
  const hasBroadband = useWatch({ control: form.control, name: "has_broadband" });
  const hasMobile = useWatch({ control: form.control, name: "has_mobile_network" });
  const internetUnavailable = useWatch({ control: form.control, name: "internet_unavailable" });
  const internetChecks: Record<string, unknown> = {
    has_fibre: hasFibre,
    has_broadband: hasBroadband,
    has_mobile_network: hasMobile,
    internet_unavailable: internetUnavailable,
  };

  const toggleWaterSource = (code: string, checked: boolean) => {
    const cur = form.getValues("water_sources") ?? [];
    form.setValue("water_sources", checked ? [...cur, code] : cur.filter((c) => c !== code), { shouldDirty: true });
  };
  const toggleApproval = (code: string, checked: boolean) => {
    const cur = form.getValues("approvals_available") ?? [];
    form.setValue("approvals_available", checked ? [...cur, code] : cur.filter((c) => c !== code), { shouldDirty: true });
  };

  const loading = isLoading || unitQuery.isLoading || ownershipQuery.isLoading;

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="site"
      loading={loading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
    >
      <div className="space-y-4">
        {/* A. Land Parcels */}
        <NestedListCard<Parcel>
          title="A. Land Parcels"
          items={parcels}
          onChange={(next) => form.setValue("parcels", next, { shouldDirty: true })}
          emptyRow={{
            order: 0, total_land_available: null, land_proposed_for_project: null,
            unit: null, village: "", taluk: "", district: "",
            ownership: null, ownership_other: "",
            survey_number: "", resurvey_number: "", date_of_acquisition: null,
            present_land_use: "", previous_land_use: "",
          }}
          columns={[
            { key: "village", label: "Village" },
            { key: "total_land_available", label: "Total" },
            { key: "land_proposed_for_project", label: "Proposed" },
            {
              key: "ownership",
              label: "Ownership",
              render: (v) => (ownershipQuery.data?.find((r) => r.id === v)?.label as string) ?? "—",
            },
          ]}
          isValid={(row) => row.total_land_available !== null && row.total_land_available !== "" && !!row.district}
          addLabel="Add parcel"
          editLabel="Edit parcel"
          renderModal={(row, set) => (
            <>
              <ModalRow>
                <ModalField label="Total land available *">
                  <Input type="number" step="0.0001" value={row.total_land_available ?? ""} onChange={(e) => set("total_land_available", e.target.value || null)} />
                </ModalField>
                <ModalField label="Land proposed for project">
                  <Input type="number" step="0.0001" value={row.land_proposed_for_project ?? ""} onChange={(e) => set("land_proposed_for_project", e.target.value || null)} />
                </ModalField>
              </ModalRow>
              <ModalField label="Unit">
                <MasterSelect value={row.unit} options={unitQuery.data ?? []} onChange={(v) => set("unit", v)} />
              </ModalField>
              <ModalRow>
                <ModalField label="Village"><Input value={row.village} onChange={(e) => set("village", e.target.value)} /></ModalField>
                <ModalField label="Taluk"><Input value={row.taluk} onChange={(e) => set("taluk", e.target.value)} /></ModalField>
              </ModalRow>
              <ModalField label="District *"><Input value={row.district} onChange={(e) => set("district", e.target.value)} /></ModalField>
              <ModalField label="Ownership">
                <MasterSelect value={row.ownership} options={ownershipQuery.data ?? []} onChange={(v) => set("ownership", v)} />
              </ModalField>
              {ownershipQuery.data?.find((r) => r.id === row.ownership)?.code === "other" && (
                <ModalField label="Specify (Others)"><Input value={row.ownership_other} onChange={(e) => set("ownership_other", e.target.value)} /></ModalField>
              )}
              <ModalRow>
                <ModalField label="Survey number(s)"><Input value={row.survey_number} onChange={(e) => set("survey_number", e.target.value)} /></ModalField>
                <ModalField label="Re-survey number(s)"><Input value={row.resurvey_number} onChange={(e) => set("resurvey_number", e.target.value)} /></ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Date of acquisition">
                  <Input type="date" value={row.date_of_acquisition ?? ""} onChange={(e) => set("date_of_acquisition", e.target.value || null)} />
                </ModalField>
                <ModalField label="Present land use"><Input value={row.present_land_use} onChange={(e) => set("present_land_use", e.target.value)} /></ModalField>
              </ModalRow>
              <ModalField label="Previous land use"><Input value={row.previous_land_use} onChange={(e) => set("previous_land_use", e.target.value)} /></ModalField>
            </>
          )}
        />

        {/* B. Site Characteristics */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">B. Site Characteristics</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Terrain *</Label>
              <ChoiceSelect value={terrain ?? ""} options={TERRAIN} onChange={(v) => form.setValue("terrain", v, { shouldDirty: true })} />
            </div>
            {terrain === "other" && (
              <div className="space-y-1.5">
                <Label>Specify (Others)</Label>
                <Input {...form.register("terrain_other")} />
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={isFloodProne === true} onCheckedChange={(c) => form.setValue("is_flood_prone", !!c, { shouldDirty: true })} />
              Flood-prone
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={waterYearRound === true} onCheckedChange={(c) => form.setValue("water_available_year_round", !!c, { shouldDirty: true })} />
              Water available year-round
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[["topography","Topography"],["soil_type","Soil type"],["soil_bearing_capacity","Soil bearing capacity"],["water_logging","Water logging"],["drainage_condition","Drainage condition"],["slope","Slope"],["ground_water_level","Ground water level"]].map(([k,l]) => (
              <div key={k} className="space-y-1.5">
                <Label className="text-xs">{l}</Label>
                <Input {...form.register(k as keyof Data)} />
              </div>
            ))}
          </div>
        </CardContent></Card>

        {/* C. Existing Infrastructure */}
        <NestedListCard<Infra>
          title="C. Existing Infrastructure"
          items={infra}
          onChange={(next) => form.setValue("existing_infrastructure", next, { shouldDirty: true })}
          emptyRow={{ order: 0, infrastructure_type: "", infrastructure_type_other: "", condition: "", approximate_area: null, year_of_construction: null, renovation_required: null }}
          columns={[
            { key: "infrastructure_type", label: "Type", render: (v) => INFRA_TYPES.find((o) => o.value === v)?.label ?? "—" },
            { key: "condition", label: "Condition" },
            { key: "approximate_area", label: "Area" },
          ]}
          isValid={(row) => !!row.infrastructure_type}
          addLabel="Add infrastructure"
          editLabel="Edit infrastructure"
          renderModal={(row, set) => (
            <>
              <ModalField label="Type *">
                <ChoiceSelect value={row.infrastructure_type} options={INFRA_TYPES} onChange={(v) => set("infrastructure_type", v)} />
              </ModalField>
              {row.infrastructure_type === "other" && (
                <ModalField label="Specify"><Input value={row.infrastructure_type_other} onChange={(e) => set("infrastructure_type_other", e.target.value)} /></ModalField>
              )}
              <ModalField label="Condition"><Input value={row.condition} onChange={(e) => set("condition", e.target.value)} /></ModalField>
              <ModalRow>
                <ModalField label="Approximate area"><Input type="number" step="0.01" value={row.approximate_area ?? ""} onChange={(e) => set("approximate_area", e.target.value || null)} /></ModalField>
                <ModalField label="Year of construction"><Input type="number" value={row.year_of_construction ?? ""} onChange={(e) => set("year_of_construction", e.target.value || null)} /></ModalField>
              </ModalRow>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={!!row.renovation_required} onCheckedChange={(c) => set("renovation_required", !!c)} />
                Renovation required
              </label>
            </>
          )}
        />

        {/* D. Accessibility */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">D. Site Accessibility (distances in km)</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {[["dist_major_market_km","Major market"],["dist_major_raw_material_source_km","Major raw material source"],["dist_all_weather_road_km","All-weather road"],["dist_state_highway_km","State highway"],["dist_national_highway_km","National highway"],["dist_railway_station_km","Railway station"],["dist_airport_km","Airport"],["dist_seaport_km","Seaport"],["dist_collection_centre_km","Collection centre"],["dist_processing_centre_km","Processing centre"]].map(([k,l]) => (
              <div key={k} className="space-y-1.5">
                <Label className="text-xs">{l}</Label>
                <Input type="number" step="0.01" {...form.register(k as keyof Data)} />
              </div>
            ))}
          </div>
        </CardContent></Card>

        {/* E. Utilities */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">E. Utility Availability</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Electricity</Label>
              <ChoiceSelect value={electricity ?? ""} options={ELECTRICITY} onChange={(v) => form.setValue("electricity_availability", v, { shouldDirty: true })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Water</Label>
              <ChoiceSelect value={waterAvail ?? ""} options={WATER_AVAIL} onChange={(v) => form.setValue("water_availability", v, { shouldDirty: true })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Road connectivity</Label>
              <ChoiceSelect value={roadConnectivity ?? ""} options={ROAD} onChange={(v) => form.setValue("road_connectivity", v, { shouldDirty: true })} />
            </div>
          </div>
          <div>
            <Label>Water sources</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {WATER_SOURCES.map((o) => (
                <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={waterSources.includes(o.value)} onCheckedChange={(c) => toggleWaterSource(o.value, !!c)} />
                  {o.label}
                </label>
              ))}
            </div>
            {waterSources.includes("other") && (
              <div className="mt-2 space-y-1.5">
                <Label className="text-xs">Specify (Others)</Label>
                <Input {...form.register("water_source_other")} />
              </div>
            )}
          </div>
          <div>
            <Label>Internet (check all applicable)</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-4">
              {[["has_fibre","Fibre"],["has_broadband","Broadband"],["has_mobile_network","Mobile"],["internet_unavailable","Not available"]].map(([k,l]) => (
                <label key={k} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={!!internetChecks[k]} onCheckedChange={(c) => form.setValue(k as keyof Data, !!c as never, { shouldDirty: true })} />
                  {l}
                </label>
              ))}
            </div>
          </div>
        </CardContent></Card>

        {/* F. Statutory Approvals */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">F. Statutory Approvals Already Obtained</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {STATUTORY_APPROVALS.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={approvals.includes(o.value)} onCheckedChange={(c) => toggleApproval(o.value, !!c)} />
                {o.label}
              </label>
            ))}
          </div>
          {approvals.includes("other") && (
            <div className="space-y-1.5">
              <Label className="text-xs">Specify (Others)</Label>
              <Input {...form.register("approvals_other")} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Remarks regarding pending approvals</Label>
            <Textarea rows={2} {...form.register("pending_approvals_remarks")} />
          </div>
        </CardContent></Card>

        {/* G. Future Expansion */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">G. Future Expansion</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={hasExpansion} onCheckedChange={(c) => form.setValue("has_future_expansion", !!c, { shouldDirty: true })} />
            Future expansion planned
          </label>
          {hasExpansion && (
            <div className="space-y-3 border-l-2 border-primary/30 pl-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label className="text-xs">Additional land available</Label><Input {...form.register("additional_land_available")} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Area reserved for expansion</Label><Input {...form.register("area_reserved_for_expansion")} /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Future buildings planned</Label><Textarea rows={2} {...form.register("future_buildings_planned")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Utility expansion feasibility</Label><Textarea rows={2} {...form.register("utility_expansion_feasibility")} /></div>
            </div>
          )}
        </CardContent></Card>

        {/* H. Site Constraints */}
        <NestedListCard<Constraint>
          title="H. Site Constraints & Mitigation"
          items={constraints}
          onChange={(next) => form.setValue("constraints", next, { shouldDirty: true })}
          emptyRow={{ constraint_type: "", constraint_type_other: "", mitigation_measure: "", existing_situation: "" }}
          columns={[
            { key: "constraint_type", label: "Constraint", render: (v) => CONSTRAINT_TYPES.find((o) => o.value === v)?.label ?? "—" },
            { key: "mitigation_measure", label: "Mitigation", render: (v) => ((v as string)?.slice(0, 60) ?? "") + ((v as string)?.length > 60 ? "…" : "") },
          ]}
          isValid={(row) => !!row.constraint_type && row.mitigation_measure.trim().length > 0}
          addLabel="Add constraint"
          editLabel="Edit constraint"
          renderModal={(row, set) => (
            <>
              <ModalField label="Constraint type *">
                <ChoiceSelect value={row.constraint_type} options={CONSTRAINT_TYPES} onChange={(v) => set("constraint_type", v)} />
              </ModalField>
              {row.constraint_type === "other" && (
                <ModalField label="Specify"><Input value={row.constraint_type_other} onChange={(e) => set("constraint_type_other", e.target.value)} /></ModalField>
              )}
              <ModalField label="Proposed mitigation measure *">
                <Textarea rows={3} value={row.mitigation_measure} onChange={(e) => set("mitigation_measure", e.target.value)} />
              </ModalField>
              <ModalField label="Existing situation (optional)">
                <Textarea rows={2} value={row.existing_situation} onChange={(e) => set("existing_situation", e.target.value)} />
              </ModalField>
            </>
          )}
        />
      </div>
    </SectionShell>
  );
}
