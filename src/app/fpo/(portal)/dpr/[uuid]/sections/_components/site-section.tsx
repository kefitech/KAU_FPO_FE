"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { KERALA_DISTRICT_OPTIONS } from "@/lib/kerala-districts";
import { LAND_UNIT_OPTIONS } from "@/lib/land-area";
import { useWatch } from "react-hook-form";

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

// ── Input caps — mirror backend DPRSectionSite + DPRLandParcel columns ──
const MAX_TEXT_CHARS = 200;             // most CharField widths
const MAX_SHORT_CHARS = 100;            // village, taluk, district
const MAX_OTHER_TEXT_CHARS = 200;       // *_other companion fields
const MAX_APPROVALS_OTHER_CHARS = 300;  // approvals_other is CharField(300)
const MAX_LONG_TEXT_CHARS = 2000;       // TextField defensive cap
// Distances — Decimal(8, 2). 10,000 km is more than Earth's circumference,
// safe upper bound for any distance on this planet.
const MAX_DISTANCE_KM = 10_000;
// Land area — Decimal(15, 4). Cap at 1,000,000 (any unit) — an FPO with 1M
// acres would be a country, not a farmer co-op.
const MAX_LAND_AREA = 1_000_000;
// Year for infrastructure construction — realistic 1900 to current+5.
const MAX_INFRA_YEAR = new Date().getFullYear() + 5;

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
  // Legacy `unit` FK (points to DPRCapacityUnit — kg/mt/litres/etc) is now
  // excluded from backend serialiser output (deprecated 2026-09-02).
  // Kept as optional in the schema for one release cycle so any in-flight
  // FE responses that still carry it don't fail Zod parsing.
  unit: z.number().nullable().optional(),
  // Per KAU RCD B.3 (2026-09-02) — 5 fixed land-area units. See src/lib/land-area.ts.
  land_unit: z.enum(["acre", "cent", "are", "hectare", "sqm"]),
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
  // KAU RCD B.8 — per-parcel component mapping. Array of DPRComponent IDs.
  components: z.array(z.number()),
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

// ── Per-row validators (mirror site_validators.py) ──────────────────────
type ParcelErrors = Partial<Record<
  "total_land_available" | "ownership" | "ownership_other" | "components" | "proposed_exceeds_total"
, string>>;

function validateParcel(
  row: Parcel,
  ownershipOtherCode: (id: number | null) => boolean,
): ParcelErrors {
  const e: ParcelErrors = {};
  const total = row.total_land_available;
  const totalNum = total !== null && total !== undefined && total !== "" ? Number(total) : null;
  if (totalNum === null || !Number.isFinite(totalNum) || totalNum <= 0) {
    e.total_land_available = "Land area shall be greater than zero.";
  }
  if (!row.ownership) e.ownership = "Land ownership status shall be specified.";
  if (row.ownership && ownershipOtherCode(row.ownership) && !(row.ownership_other ?? "").trim()) {
    e.ownership_other = 'Please specify — "Others" was selected for ownership.';
  }
  if (!row.components || row.components.length === 0) {
    e.components = "At least one project component shall be mapped to this parcel.";
  }
  // Advisory sanity check — proposed > total is nonsensical (F6).
  const proposed = row.land_proposed_for_project;
  const proposedNum = proposed !== null && proposed !== undefined && proposed !== "" ? Number(proposed) : null;
  if (proposedNum !== null && totalNum !== null && proposedNum > totalNum) {
    e.proposed_exceeds_total = `Land proposed for project (${proposedNum}) cannot exceed total land available (${totalNum}).`;
  }
  return e;
}

type ConstraintErrors = Partial<Record<
  "constraint_type" | "constraint_type_other" | "mitigation_measure"
, string>>;
function validateConstraint(row: Constraint): ConstraintErrors {
  const e: ConstraintErrors = {};
  if (!row.constraint_type) e.constraint_type = "Constraint type is required.";
  if (row.constraint_type === "other" && !(row.constraint_type_other ?? "").trim()) {
    e.constraint_type_other = 'Please specify — "Others" was selected in constraint type.';
  }
  if (!(row.mitigation_measure ?? "").trim()) {
    e.mitigation_measure = "Mitigation Measure is required for each site constraint.";
  }
  return e;
}

function validateInfra(row: Infra) {
  const e: Partial<Record<"infrastructure_type" | "infrastructure_type_other", string>> = {};
  if (!row.infrastructure_type) e.infrastructure_type = "Infrastructure type is required.";
  if (row.infrastructure_type === "other" && !(row.infrastructure_type_other ?? "").trim()) {
    e.infrastructure_type_other = 'Please specify — "Others" was selected in infrastructure type.';
  }
  return e;
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
  // KAU RCD B.8 — per-parcel component picker. Full master list; ideally we'd
  // narrow to just the project's selected components (from the Components
  // section) but that requires an extra fetch. Full list is fine for now.
  const componentsQuery = useQuery({
    queryKey: ["dpr-master", "components"],
    queryFn: () => dprMasterApi.list("components"),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, fieldErrors, fieldWarnings, save, discard } = useDprSectionForm<Data>({
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
  // Section-level text/textarea watched values — converted from register()
  // to controlled so Save button + autosave fire reliably (Location F3 fix).
  const pendingApprovalsRemarks = useWatch({ control: form.control, name: "pending_approvals_remarks" }) ?? "";
  const futureBuildingsPlanned = useWatch({ control: form.control, name: "future_buildings_planned" }) ?? "";
  const utilityExpansionFeasibility = useWatch({ control: form.control, name: "utility_expansion_feasibility" }) ?? "";

  // B. Site characteristics — 7 CharField(200) text inputs
  const topography = useWatch({ control: form.control, name: "topography" }) ?? "";
  const soilType = useWatch({ control: form.control, name: "soil_type" }) ?? "";
  const soilBearingCapacity = useWatch({ control: form.control, name: "soil_bearing_capacity" }) ?? "";
  const waterLogging = useWatch({ control: form.control, name: "water_logging" }) ?? "";
  const drainageCondition = useWatch({ control: form.control, name: "drainage_condition" }) ?? "";
  const slope = useWatch({ control: form.control, name: "slope" }) ?? "";
  const groundWaterLevel = useWatch({ control: form.control, name: "ground_water_level" }) ?? "";

  // D. Distance inputs (Decimal 8,2 each)
  const distances = {
    dist_major_market_km: useWatch({ control: form.control, name: "dist_major_market_km" }),
    dist_major_raw_material_source_km: useWatch({ control: form.control, name: "dist_major_raw_material_source_km" }),
    dist_all_weather_road_km: useWatch({ control: form.control, name: "dist_all_weather_road_km" }),
    dist_state_highway_km: useWatch({ control: form.control, name: "dist_state_highway_km" }),
    dist_national_highway_km: useWatch({ control: form.control, name: "dist_national_highway_km" }),
    dist_railway_station_km: useWatch({ control: form.control, name: "dist_railway_station_km" }),
    dist_airport_km: useWatch({ control: form.control, name: "dist_airport_km" }),
    dist_seaport_km: useWatch({ control: form.control, name: "dist_seaport_km" }),
    dist_collection_centre_km: useWatch({ control: form.control, name: "dist_collection_centre_km" }),
    dist_processing_centre_km: useWatch({ control: form.control, name: "dist_processing_centre_km" }),
  } as const;

  // E/F/G — remaining register-based text inputs
  const waterSourceOther = useWatch({ control: form.control, name: "water_source_other" }) ?? "";
  const approvalsOther = useWatch({ control: form.control, name: "approvals_other" }) ?? "";
  const additionalLandAvailable = useWatch({ control: form.control, name: "additional_land_available" }) ?? "";
  const areaReservedForExpansion = useWatch({ control: form.control, name: "area_reserved_for_expansion" }) ?? "";

  // Convenience setter — always includes shouldDirty: true.
  const setField = <K extends keyof Data>(name: K, value: Data[K]) =>
    form.setValue(name as never, value as never, { shouldDirty: true });

  const toggleWaterSource = (code: string, checked: boolean) => {
    const cur = form.getValues("water_sources") ?? [];
    setField("water_sources", checked ? [...cur, code] : cur.filter((c) => c !== code));
  };
  const toggleApproval = (code: string, checked: boolean) => {
    const cur = form.getValues("approvals_available") ?? [];
    setField("approvals_available", checked ? [...cur, code] : cur.filter((c) => c !== code));
  };

  /**
   * Internet-availability mutex — "Not available" is mutually exclusive with
   * Fibre / Broadband / Mobile. Same pattern applied on Location F2. Ticking
   * "Not available" auto-unchecks the other three; ticking any of the other
   * three auto-unchecks "Not available". No spec rule enforces this — it's
   * pure data-integrity (a site can't simultaneously have and not-have
   * connectivity).
   */
  const toggleInternet = (key: "has_fibre" | "has_broadband" | "has_mobile_network" | "internet_unavailable", checked: boolean) => {
    setField(key, checked as never);
    if (!checked) return;
    if (key === "internet_unavailable") {
      // Ticking "Not available" clears the other three.
      if (hasFibre) setField("has_fibre", false as never);
      if (hasBroadband) setField("has_broadband", false as never);
      if (hasMobile) setField("has_mobile_network", false as never);
    } else if (internetUnavailable) {
      // Ticking any of Fibre/Broadband/Mobile clears "Not available".
      setField("internet_unavailable", false as never);
    }
  };

  // Section-level live errors — mirror site_validators.py.
  const liveErrors: Record<string, string | undefined> = {};
  if (parcels.length === 0) {
    liveErrors.parcels = "At least one land parcel shall be specified.";
  }
  if (!terrain) {
    liveErrors.terrain = "Terrain shall be specified.";
  }
  const terrainOtherWatch = useWatch({ control: form.control, name: "terrain_other" }) ?? "";
  if (terrain === "other" && !String(terrainOtherWatch).trim()) {
    liveErrors.terrain_other = 'Please specify — "Others" was selected for terrain.';
  }
  const err = (name: string): string | undefined =>
    fieldErrors.get(name) ?? liveErrors[name];

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
      help={
        <SectionHelp
          title="Land, Site Suitability & Infrastructure Readiness"
          purpose="Capture the physical land + site story — how many parcels, ownership + terrain + soil, distances to markets/highways/ports, utility availability, statutory approvals status, future expansion room, and site constraints with mitigations. Each parcel must be mapped to the project components (processing / storage / marketing / etc.) that will use it. This section feeds the Land & Infrastructure chapter of the DPR PDF and informs civil-works, utilities, and risk sections downstream."
          whatToFill={[
            "A — Land Parcels. Click 'Add parcel' to open the modal. Required per parcel: total area available, ownership (FK), land unit (acre / cent / are / hectare / sqm), district, and at least one component the parcel will host. If ownership is 'Others', the specify text becomes required. Add one parcel per contiguous plot — split rows if plots are non-contiguous.",
            "B — Site Characteristics. Terrain is required (plain / hilly / sloping / valley / mixed / other). If 'Others', specify text is required. Fill soil type, bearing capacity, water logging, drainage, slope, ground-water level as free-text — all optional but strongly recommended for bankability.",
            "C — Existing Infrastructure. Optional list. Click 'Add infrastructure' to record what's already built on the parcel (approach road, electricity, water tank, boundary wall, etc.). Type is required per row.",
            "D — Distances (km). All optional. Enter distances to major market, raw-material source, all-weather road, state highway, national highway, railway station, airport, seaport, collection centre, processing centre. Numeric-only; caps at 10000 km.",
            "E — Utilities. Tick availability of Electricity / Water / Road / Internet. Water sources and internet options are multi-select from master data. 'Not available' internet option is mutually exclusive with Fibre / Broadband / Mobile.",
            "F — Statutory Approvals. Tick which approvals are already obtained (Land Conversion, Panchayat NOC, Pollution Board NOC, etc.). Remarks field (max 300 chars) for approvals still pending.",
            "G — Future Expansion. Tick 'Future expansion planned' to reveal fields: additional land available adjacent, area reserved for expansion, planned buildings, utility expansion feasibility. All optional.",
            "H — Site Constraints. At least one constraint recommended (water scarcity, flood risk, soil issues, etc.). Mitigation measure is required per row. 'Others' constraint type requires specify text.",
          ]}
          tips={[
            "Component mapping in parcel modal is a KAU RCD requirement (B.8). Tick every component the parcel will host — Processing, Storage, Marketing, Cold Storage, etc. A parcel with 0 components blocks Save.",
            "Land unit is fixed to 5 options (acre / cent / are / hectare / sqm) per KAU RCD B.3. If your land is measured in something else, convert first — 1 cent = 40.47 sqm, 1 acre = 40.47 are, 1 hectare = 100 are.",
            "Distances feed the market-linkage scoring downstream. A processing unit > 50 km from the raw-material source is a red flag for logistics viability — the AI narrative flags this automatically.",
            "GPS coordinates for the parcel go on the Location section (§2.3.2), not here. This section is about area + ownership + characteristics.",
            "'Land proposed for project' should be ≤ 'Total land available' per parcel — the FE surfaces a soft warning if you violate this, backend accepts either.",
            "Add at least 1 constraint. A DPR with 0 site constraints reads as either unrealistic or under-prepared to a bank appraiser — water scarcity, flood risk, or approach road width are all worth documenting.",
          ]}
          downstream={[
            "Land & Infrastructure chapter in the DPR PDF — parcel table + distances table + utilities checklist all render there",
            "Civil Works section — parcel area and terrain inform civil-works estimate (levelling, foundation, boundary wall)",
            "Utilities section — infrastructure availability + distance to nearest grid line inform utility connection costs",
            "Risk Analysis chapter — constraints + mitigations appear alongside technical / market / financial risks",
            "AI narrative — terrain + soil + distances + constraints feed the Site Suitability paragraph",
            "Statutory checklist — pending approvals surface in the Compliance chapter as action items",
          ]}
        />
      }
    >
      <div className="space-y-4">
        {/* A. Land Parcels — id enables readiness-panel deep-link scroll */}
        <div id="dpr-field-parcels" />
        <NestedListCard<Parcel>
          title="A. Land Parcels"
          items={parcels}
          onChange={(next) => form.setValue("parcels", next, { shouldDirty: true })}
          error={err("parcels")}
          warning={fieldWarnings.get("parcels")}
          emptyRow={{
            order: 0, total_land_available: null, land_proposed_for_project: null,
            unit: null, land_unit: "acre",
            village: "", taluk: "", district: "",
            ownership: null, ownership_other: "",
            survey_number: "", resurvey_number: "", date_of_acquisition: null,
            present_land_use: "", previous_land_use: "",
            components: [],
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
          isValid={(row) =>
            Object.keys(
              validateParcel(row, (id) => {
                if (!id) return false;
                const opt = ownershipQuery.data?.find((r) => r.id === id);
                return Boolean(opt && (opt.code === "other" || opt.code?.endsWith?.("_other")));
              }),
            ).length === 0
          }
          addLabel="Add parcel"
          editLabel="Edit parcel"
          renderModal={(row, set) => {
            const isOtherOwnership = (id: number | null) => {
              if (!id) return false;
              const opt = ownershipQuery.data?.find((r) => r.id === id);
              return Boolean(opt && (opt.code === "other" || opt.code?.endsWith?.("_other")));
            };
            const pErr = validateParcel(row, isOtherOwnership);
            return (
            <>
              <ModalRow>
                <ModalField label="Total land available *" error={pErr.total_land_available}>
                  <Input
                    type="text"
                    inputMode="decimal"
                    maxLength={12}
                    placeholder="e.g. 0.75"
                    value={row.total_land_available !== null && row.total_land_available !== undefined ? String(row.total_land_available) : ""}
                    onChange={(e) => {
                      const cleaned = normaliseDecimalInput(e.target.value, {
                        max: MAX_LAND_AREA,
                        maxDecimals: 4,
                      });
                      set("total_land_available", cleaned === "" ? null : cleaned);
                    }}
                  />
                </ModalField>
                <ModalField label="Land proposed for project" error={pErr.proposed_exceeds_total}>
                  <Input
                    type="text"
                    inputMode="decimal"
                    maxLength={12}
                    placeholder="e.g. 0.5"
                    value={row.land_proposed_for_project !== null && row.land_proposed_for_project !== undefined ? String(row.land_proposed_for_project) : ""}
                    onChange={(e) => {
                      const cleaned = normaliseDecimalInput(e.target.value, {
                        max: MAX_LAND_AREA,
                        maxDecimals: 4,
                      });
                      set("land_proposed_for_project", cleaned === "" ? null : cleaned);
                    }}
                  />
                </ModalField>
              </ModalRow>
              {/* KAU RCD B.3 (2026-09-02) — land unit is a fixed 5-option list
                  (acre/cent/are/hectare/sqm). Old FK to DPRCapacityUnit stayed
                  because it showed kg/mt/litres for land parcels — nonsense.
                  Backend stores this as a CharField on DPRLandParcel.land_unit;
                  canonical acre conversion is available via land-area helper. */}
              <ModalField label="Land unit *">
                <SearchableSelect
                  value={row.land_unit}
                  options={LAND_UNIT_OPTIONS}
                  onChange={(v) => set("land_unit", (v as Parcel["land_unit"]) || "acre")}
                  placeholder="Type to search unit…"
                />
              </ModalField>
              <ModalRow>
                <ModalField label="Village">
                  <Input
                    value={row.village}
                    maxLength={MAX_SHORT_CHARS}
                    onChange={(e) => set("village", e.target.value.slice(0, MAX_SHORT_CHARS))}
                  />
                </ModalField>
                <ModalField label="Taluk">
                  <Input
                    value={row.taluk}
                    maxLength={MAX_SHORT_CHARS}
                    onChange={(e) => set("taluk", e.target.value.slice(0, MAX_SHORT_CHARS))}
                  />
                </ModalField>
              </ModalRow>
              <ModalField label="District *">
                <SearchableSelect
                  value={row.district}
                  options={KERALA_DISTRICT_OPTIONS}
                  onChange={(v) => set("district", v)}
                  placeholder="Type to search district…"
                />
              </ModalField>
              <ModalField label="Ownership *" error={pErr.ownership}>
                <MasterSearchableSelect
                  value={row.ownership}
                  options={ownershipQuery.data ?? []}
                  onChange={(v) => set("ownership", v)}
                  placeholder="Type to search ownership…"
                />
              </ModalField>
              {isOtherOwnership(row.ownership) && (
                <ModalField label="Please specify (Others) *" error={pErr.ownership_other}>
                  <Input
                    value={row.ownership_other}
                    maxLength={MAX_OTHER_TEXT_CHARS}
                    onChange={(e) => set("ownership_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
                  />
                </ModalField>
              )}
              <ModalRow>
                <ModalField label="Survey number(s)">
                  <Input
                    value={row.survey_number}
                    maxLength={MAX_TEXT_CHARS}
                    onChange={(e) => set("survey_number", e.target.value.slice(0, MAX_TEXT_CHARS))}
                  />
                </ModalField>
                <ModalField label="Re-survey number(s)">
                  <Input
                    value={row.resurvey_number}
                    maxLength={MAX_TEXT_CHARS}
                    onChange={(e) => set("resurvey_number", e.target.value.slice(0, MAX_TEXT_CHARS))}
                  />
                </ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Date of acquisition">
                  <Input type="date" value={row.date_of_acquisition ?? ""} onChange={(e) => set("date_of_acquisition", e.target.value || null)} />
                </ModalField>
                <ModalField label="Present land use">
                  <Input
                    value={row.present_land_use}
                    maxLength={MAX_TEXT_CHARS}
                    onChange={(e) => set("present_land_use", e.target.value.slice(0, MAX_TEXT_CHARS))}
                  />
                </ModalField>
              </ModalRow>
              <ModalField label="Previous land use">
                <Input
                  value={row.previous_land_use}
                  maxLength={MAX_TEXT_CHARS}
                  onChange={(e) => set("previous_land_use", e.target.value.slice(0, MAX_TEXT_CHARS))}
                />
              </ModalField>

              {/* KAU RCD B.8 — per-parcel component mapping. Backend rejects
                  parcels with 0 components. Multi-select checkbox grid. */}
              <ModalField label="Project components on this parcel *">
                <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
                  {(componentsQuery.data ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Loading components…</p>
                  ) : (
                    (componentsQuery.data ?? []).map((c) => {
                      const checked = row.components.includes(c.id);
                      return (
                        <label key={c.id} className="flex cursor-pointer items-center gap-2 text-xs">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              const next = v
                                ? [...row.components, c.id]
                                : row.components.filter((id) => id !== c.id);
                              set("components", next);
                            }}
                          />
                          <span>{c.label}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                {pErr.components && (
                  <p className="mt-1 text-xs text-destructive">
                    {pErr.components}
                  </p>
                )}
              </ModalField>
            </>
            );
          }}
        />

        {/* B. Site Characteristics */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">B. Site Characteristics</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div id="dpr-field-terrain" className="space-y-1.5">
              <Label className={err("terrain") ? "text-destructive" : undefined}>Terrain *</Label>
              <SearchableSelect value={terrain ?? ""} options={TERRAIN} onChange={(v) => setField("terrain", v)} placeholder="Type to search terrain…" />
              {err("terrain") && (
                <p className="text-xs text-destructive">{err("terrain")}</p>
              )}
            </div>
            {terrain === "other" && (
              <div className="space-y-1.5">
                <Label className={err("terrain_other") ? "text-destructive" : undefined}>Please specify (Others) *</Label>
                <Input
                  value={terrainOtherWatch as string}
                  maxLength={MAX_OTHER_TEXT_CHARS}
                  onChange={(e) => setField("terrain_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
                />
                {err("terrain_other") && (
                  <p className="text-xs text-destructive">{err("terrain_other")}</p>
                )}
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
            {(() => {
              const bFields: Array<[keyof Data, string, string]> = [
                ["topography", "Topography", topography as string],
                ["soil_type", "Soil type", soilType as string],
                ["soil_bearing_capacity", "Soil bearing capacity", soilBearingCapacity as string],
                ["water_logging", "Water logging", waterLogging as string],
                ["drainage_condition", "Drainage condition", drainageCondition as string],
                ["slope", "Slope", slope as string],
                ["ground_water_level", "Ground water level", groundWaterLevel as string],
              ];
              return bFields.map(([key, label, value]) => (
                <div key={key as string} className="space-y-1.5">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    value={value}
                    maxLength={MAX_TEXT_CHARS}
                    onChange={(e) => setField(key, e.target.value.slice(0, MAX_TEXT_CHARS) as Data[typeof key])}
                  />
                </div>
              ));
            })()}
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
          isValid={(row) => Object.keys(validateInfra(row)).length === 0}
          addLabel="Add infrastructure"
          editLabel="Edit infrastructure"
          renderModal={(row, set) => (
            <>
              <ModalField label="Type *" error={validateInfra(row).infrastructure_type}>
                <SearchableSelect value={row.infrastructure_type} options={INFRA_TYPES} onChange={(v: string) => set("infrastructure_type", v)} placeholder="Type to search…" />
              </ModalField>
              {row.infrastructure_type === "other" && (
                <ModalField label="Please specify (Others)">
                  <Input
                    value={row.infrastructure_type_other}
                    maxLength={MAX_OTHER_TEXT_CHARS}
                    onChange={(e) => set("infrastructure_type_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
                  />
                </ModalField>
              )}
              <ModalField label="Condition">
                <Input
                  value={row.condition}
                  maxLength={MAX_TEXT_CHARS}
                  onChange={(e) => set("condition", e.target.value.slice(0, MAX_TEXT_CHARS))}
                />
              </ModalField>
              <ModalRow>
                <ModalField label="Approximate area">
                  <Input
                    type="text"
                    inputMode="decimal"
                    maxLength={12}
                    placeholder="sq m"
                    value={row.approximate_area !== null && row.approximate_area !== undefined ? String(row.approximate_area) : ""}
                    onChange={(e) => {
                      const cleaned = normaliseDecimalInput(e.target.value, {
                        max: MAX_LAND_AREA,
                        maxDecimals: 2,
                      });
                      set("approximate_area", cleaned === "" ? null : cleaned);
                    }}
                  />
                </ModalField>
                <ModalField label="Year of construction">
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="e.g. 2022"
                    value={row.year_of_construction !== null && row.year_of_construction !== undefined ? String(row.year_of_construction) : ""}
                    onChange={(e) => {
                      // Cap at reasonable upper bound (current year + 5) — a
                      // building "constructed" in 2200 is invalid input.
                      const cleaned = normaliseIntegerInput(e.target.value, {
                        max: MAX_INFRA_YEAR,
                        min: 1900,
                      });
                      set("year_of_construction", cleaned === "" ? null : cleaned);
                    }}
                  />
                </ModalField>
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
            {(() => {
              const distFields: Array<[keyof typeof distances, string]> = [
                ["dist_major_market_km", "Major market"],
                ["dist_major_raw_material_source_km", "Major raw material source"],
                ["dist_all_weather_road_km", "All-weather road"],
                ["dist_state_highway_km", "State highway"],
                ["dist_national_highway_km", "National highway"],
                ["dist_railway_station_km", "Railway station"],
                ["dist_airport_km", "Airport"],
                ["dist_seaport_km", "Seaport"],
                ["dist_collection_centre_km", "Collection centre"],
                ["dist_processing_centre_km", "Processing centre"],
              ];
              return distFields.map(([key, label]) => {
                const value = distances[key];
                return (
                  <div key={key as string} className="space-y-1.5">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={10}
                      placeholder="km"
                      value={value !== null && value !== undefined ? String(value) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, {
                          max: MAX_DISTANCE_KM,
                          maxDecimals: 2,
                        });
                        setField(key as keyof Data, (cleaned === "" ? null : cleaned) as Data[keyof Data]);
                      }}
                    />
                  </div>
                );
              });
            })()}
          </div>
        </CardContent></Card>

        {/* E. Utilities */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">E. Utility Availability</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Electricity</Label>
              <SearchableSelect value={electricity ?? ""} options={ELECTRICITY} onChange={(v) => form.setValue("electricity_availability", v, { shouldDirty: true })} placeholder="Type to search…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Water</Label>
              <SearchableSelect value={waterAvail ?? ""} options={WATER_AVAIL} onChange={(v) => form.setValue("water_availability", v, { shouldDirty: true })} placeholder="Type to search…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Road connectivity</Label>
              <SearchableSelect value={roadConnectivity ?? ""} options={ROAD} onChange={(v) => form.setValue("road_connectivity", v, { shouldDirty: true })} placeholder="Type to search…" />
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
                <Label className="text-xs">Please specify (Others)</Label>
                <Input
                  value={waterSourceOther as string}
                  maxLength={MAX_OTHER_TEXT_CHARS}
                  onChange={(e) => setField("water_source_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
                />
              </div>
            )}
          </div>
          <div>
            <Label>Internet (check all applicable)</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-4">
              {([
                ["has_fibre","Fibre"],
                ["has_broadband","Broadband"],
                ["has_mobile_network","Mobile"],
                ["internet_unavailable","Not available"],
              ] as const).map(([k,l]) => (
                <label key={k} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={!!internetChecks[k]}
                    onCheckedChange={(c) => toggleInternet(k, !!c)}
                  />
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
              <Label className="text-xs">Please specify (Others)</Label>
              <Input
                value={approvalsOther as string}
                maxLength={MAX_APPROVALS_OTHER_CHARS}
                onChange={(e) => setField("approvals_other", e.target.value.slice(0, MAX_APPROVALS_OTHER_CHARS))}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Remarks regarding pending approvals</Label>
            <CountedTextarea
              rows={2}
              maxChars={MAX_LONG_TEXT_CHARS}
              value={pendingApprovalsRemarks as string}
              onChange={(v) => setField("pending_approvals_remarks", v)}
            />
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
                <div className="space-y-1.5">
                  <Label className="text-xs">Additional land available</Label>
                  <Input
                    value={additionalLandAvailable as string}
                    maxLength={MAX_TEXT_CHARS}
                    placeholder="e.g. ~0.25 acre adjacent"
                    onChange={(e) => setField("additional_land_available", e.target.value.slice(0, MAX_TEXT_CHARS))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Area reserved for expansion</Label>
                  <Input
                    value={areaReservedForExpansion as string}
                    maxLength={MAX_TEXT_CHARS}
                    placeholder="e.g. 0.15 acre within existing plot"
                    onChange={(e) => setField("area_reserved_for_expansion", e.target.value.slice(0, MAX_TEXT_CHARS))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Future buildings planned</Label>
                <CountedTextarea
                  rows={2}
                  maxChars={MAX_LONG_TEXT_CHARS}
                  value={futureBuildingsPlanned as string}
                  onChange={(v) => setField("future_buildings_planned", v)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Utility expansion feasibility</Label>
                <CountedTextarea
                  rows={2}
                  maxChars={MAX_LONG_TEXT_CHARS}
                  value={utilityExpansionFeasibility as string}
                  onChange={(v) => setField("utility_expansion_feasibility", v)}
                />
              </div>
            </div>
          )}
        </CardContent></Card>

        {/* H. Site Constraints — id enables readiness-panel deep-link scroll */}
        <div id="dpr-field-constraints" />
        <NestedListCard<Constraint>
          title="H. Site Constraints & Mitigation"
          items={constraints}
          onChange={(next) => form.setValue("constraints", next, { shouldDirty: true })}
          emptyRow={{ constraint_type: "", constraint_type_other: "", mitigation_measure: "", existing_situation: "" }}
          columns={[
            { key: "constraint_type", label: "Constraint", render: (v) => CONSTRAINT_TYPES.find((o) => o.value === v)?.label ?? "—" },
            { key: "mitigation_measure", label: "Mitigation", render: (v) => ((v as string)?.slice(0, 60) ?? "") + ((v as string)?.length > 60 ? "…" : "") },
          ]}
          isValid={(row) => Object.keys(validateConstraint(row)).length === 0}
          addLabel="Add constraint"
          editLabel="Edit constraint"
          renderModal={(row, set) => (
            <>
              {(() => {
                const cErr = validateConstraint(row);
                return (<>
                  <ModalField label="Constraint type *" error={cErr.constraint_type}>
                    <SearchableSelect value={row.constraint_type} options={CONSTRAINT_TYPES} onChange={(v: string) => set("constraint_type", v)} placeholder="Type to search…" />
                  </ModalField>
                  {row.constraint_type === "other" && (
                    <ModalField label='Please specify (Others) *' error={cErr.constraint_type_other}>
                      <Input
                        value={row.constraint_type_other}
                        maxLength={MAX_OTHER_TEXT_CHARS}
                        onChange={(e) => set("constraint_type_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
                      />
                    </ModalField>
                  )}
                  <ModalField label="Proposed mitigation measure *" error={cErr.mitigation_measure}>
                    <CountedTextarea
                      rows={3}
                      maxChars={MAX_LONG_TEXT_CHARS}
                      value={row.mitigation_measure}
                      onChange={(v) => set("mitigation_measure", v)}
                      error={Boolean(cErr.mitigation_measure)}
                    />
                  </ModalField>
                  <ModalField label="Existing situation (optional)">
                    <CountedTextarea
                      rows={2}
                      maxChars={MAX_LONG_TEXT_CHARS}
                      value={row.existing_situation}
                      onChange={(v) => set("existing_situation", v)}
                    />
                  </ModalField>
                </>);
              })()}
            </>
          )}
        />
      </div>
    </SectionShell>
  );
}
