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
  ChoiceSelect,
  MasterSearchableSelect,
  ModalField,
  ModalRow,
  NestedListCard,
} from "./nested-list";
import { SectionHelp } from "./section-help";
import { SectionShell } from "./section-shell";

// ── Input caps — mirror backend DPRSectionCivil / DPRExistingBuilding /
//    DPRProposedBuilding / DPRSiteDevelopmentItem columns ──
const MAX_TEXT_CHARS = 200;            // most CharField widths
const MAX_PURPOSE_CHARS = 500;         // purpose CharField(500)
const MAX_LOCATION_CHARS = 300;        // proposed_location_within_site CharField(300)
const MAX_COMPLETION_CHARS = 100;      // estimated_completion_period CharField(100)
const MAX_OTHER_TEXT_CHARS = 200;      // *_other companions
const MAX_LONG_TEXT_CHARS = 2000;      // TextField defensive cap
// Cost fields — Decimal(18, 2). Cap at ₹1000 crore (1e10) per prior sections.
const MAX_COST_INR = 10_000_000_000;
// Floor area — Decimal(12, 2). 1M sq. units is a soft ceiling (bigger than any
// single FPO project realistically needs).
const MAX_FLOOR_AREA = 1_000_000;
// Year for existing-building construction — realistic 1900 to current+5.
const MAX_INFRA_YEAR = new Date().getFullYear() + 5;
// Floors — a small integer cap prevents typos like 100 floors.
const MAX_FLOORS = 20;

// ── Choices ────────────────────────────────────────────────────────────────

const AREA_UNITS = [
  { value: "sqft", label: "sq. ft." },
  { value: "sqm", label: "sq. m." },
];

const OWNERSHIP_CHOICES = [
  { value: "fpo_owned", label: "FPO Owned" },
  { value: "member_owned", label: "Member Owned" },
  { value: "leased", label: "Leased" },
  { value: "rented", label: "Rented" },
  { value: "govt_allotted", label: "Government Allotted" },
  { value: "other", label: "Others" },
];

const PROPOSED_ACTIONS = [
  { value: "continue", label: "Continue as Existing" },
  { value: "renovate", label: "Renovate" },
  { value: "expand", label: "Expand" },
  { value: "demolish", label: "Demolish" },
  { value: "convert_use", label: "Convert to Different Use" },
];

const COST_BASIS = [
  { value: "engineer", label: "Engineer's Estimate" },
  { value: "contractor", label: "Contractor Quotation" },
  { value: "similar", label: "Previous Similar Project" },
  { value: "consultant", label: "Consultant Estimate" },
  { value: "other", label: "Others (Specify)" },
];

// ── Schemas ────────────────────────────────────────────────────────────────

const ExistingBuildingSchema = z.object({
  id: z.number().optional(),
  order: z.number(),
  building_name: z.string(),
  purpose: z.string(),
  floor_area: z.union([z.string(), z.number()]).nullable(),
  area_unit: z.string(),
  present_condition: z.string(),
  ownership_status: z.string(),
  proposed_action: z.string(),
  year_of_construction: z.union([z.string(), z.number()]).nullable(),
  num_floors: z.union([z.string(), z.number()]).nullable(),
  current_utilisation: z.string(),
});
type ExistingBuilding = z.infer<typeof ExistingBuildingSchema>;

const ProposedBuildingSchema = z.object({
  id: z.number().optional(),
  order: z.number(),
  building_type: z.number().nullable(),
  building_type_other: z.string(),
  purpose: z.string(),
  floor_area: z.union([z.string(), z.number()]).nullable(),
  area_unit: z.string(),
  proposed_location_within_site: z.string(),
  num_floors: z.union([z.string(), z.number()]).nullable(),
  estimated_construction_cost: z.union([z.string(), z.number()]).nullable(),
  estimated_completion_period: z.string(),
});
type ProposedBuilding = z.infer<typeof ProposedBuildingSchema>;

const SiteDevItemSchema = z.object({
  id: z.number().optional(),
  order: z.number(),
  category: z.number().nullable(),
  category_other: z.string(),
  estimated_quantity: z.string(),
  estimated_cost: z.union([z.string(), z.number()]).nullable(),
  remarks: z.string(),
});
type SiteDevItem = z.infer<typeof SiteDevItemSchema>;

const Schema = z.object({
  has_civil_cost_estimate: z.boolean(),
  cost_site_development: z.union([z.string(), z.number()]).nullable(),
  cost_building_construction: z.union([z.string(), z.number()]).nullable(),
  cost_internal_roads: z.union([z.string(), z.number()]).nullable(),
  cost_compound_wall: z.union([z.string(), z.number()]).nullable(),
  cost_drainage: z.union([z.string(), z.number()]).nullable(),
  cost_water_supply: z.union([z.string(), z.number()]).nullable(),
  cost_sanitation: z.union([z.string(), z.number()]).nullable(),
  cost_electrical: z.union([z.string(), z.number()]).nullable(),
  cost_fire_protection: z.union([z.string(), z.number()]).nullable(),
  cost_landscaping: z.union([z.string(), z.number()]).nullable(),
  cost_other_civil: z.union([z.string(), z.number()]).nullable(),
  basis_of_estimate: z.string(),
  basis_of_estimate_other: z.string(),

  has_future_expansion: z.boolean(),
  space_reserved_for_expansion: z.string(),
  future_buildings_planned: z.string(),
  future_civil_works_required: z.string(),
  estimated_future_investment: z.union([z.string(), z.number()]).nullable(),

  existing_buildings: z.array(ExistingBuildingSchema),
  proposed_buildings: z.array(ProposedBuildingSchema),
  site_development_items: z.array(SiteDevItemSchema),
});
type Data = z.infer<typeof Schema>;

// ── Utilities ──────────────────────────────────────────────────────────────

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

const COST_KEYS = [
  "cost_site_development", "cost_building_construction", "cost_internal_roads",
  "cost_compound_wall", "cost_drainage", "cost_water_supply", "cost_sanitation",
  "cost_electrical", "cost_fire_protection", "cost_landscaping", "cost_other_civil",
  "estimated_future_investment",
] as const;

// ── Per-row validators (mirror civil_validators.py) ──────────────────────

type ExistingBuildingErrors = Partial<Record<"building_name" | "floor_area", string>>;
function validateExistingBuilding(row: ExistingBuilding): ExistingBuildingErrors {
  const e: ExistingBuildingErrors = {};
  if (!(row.building_name ?? "").trim()) {
    e.building_name = "Building Name shall be specified.";
  }
  const fa = row.floor_area;
  const faNum = fa !== null && fa !== undefined && fa !== "" ? Number(fa) : null;
  if (faNum === null || !Number.isFinite(faNum) || faNum <= 0) {
    e.floor_area = "Floor Area shall be greater than zero.";
  }
  return e;
}

type ProposedBuildingErrors = Partial<Record<"building_type" | "floor_area", string>>;
function validateProposedBuilding(row: ProposedBuilding): ProposedBuildingErrors {
  const e: ProposedBuildingErrors = {};
  if (!row.building_type) e.building_type = "Building Type shall be specified.";
  const fa = row.floor_area;
  const faNum = fa !== null && fa !== undefined && fa !== "" ? Number(fa) : null;
  if (faNum === null || !Number.isFinite(faNum) || faNum <= 0) {
    e.floor_area = "Floor Area shall be greater than zero.";
  }
  return e;
}

type SiteDevErrors = Partial<Record<"category", string>>;
function validateSiteDev(row: SiteDevItem): SiteDevErrors {
  const e: SiteDevErrors = {};
  if (!row.category) e.category = "Category is required.";
  return e;
}

function serializePayload(v: Data): Record<string, unknown> {
  const out: Record<string, unknown> = { ...v };
  for (const k of COST_KEYS) out[k] = toDecStr(v[k]);
  out.existing_buildings = v.existing_buildings.map((b, i) => ({
    ...b,
    order: i,
    floor_area: toDecStr(b.floor_area),
    year_of_construction: toInt(b.year_of_construction),
    num_floors: toInt(b.num_floors),
  }));
  out.proposed_buildings = v.proposed_buildings.map((b, i) => ({
    ...b,
    order: i,
    floor_area: toDecStr(b.floor_area),
    num_floors: toInt(b.num_floors),
    estimated_construction_cost: toDecStr(b.estimated_construction_cost),
  }));
  out.site_development_items = v.site_development_items.map((s, i) => ({
    ...s,
    order: i,
    estimated_cost: toDecStr(s.estimated_cost),
  }));
  return out;
}

// ── Section component ─────────────────────────────────────────────────────

export function CivilSection({ uuid }: { uuid: string }) {
  const buildingTypeQuery = useQuery({
    queryKey: ["dpr-master", "building-types"],
    queryFn: () => dprMasterApi.list("building-types"),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const civilCategoryQuery = useQuery({
    queryKey: ["dpr-master", "civil-categories"],
    queryFn: () => dprMasterApi.list("civil-categories"),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, fieldErrors, fieldWarnings, save, discard } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "civil",
    schema: Schema,
    defaultValues: {
      has_civil_cost_estimate: false,
      cost_site_development: null,
      cost_building_construction: null,
      cost_internal_roads: null,
      cost_compound_wall: null,
      cost_drainage: null,
      cost_water_supply: null,
      cost_sanitation: null,
      cost_electrical: null,
      cost_fire_protection: null,
      cost_landscaping: null,
      cost_other_civil: null,
      basis_of_estimate: "",
      basis_of_estimate_other: "",
      has_future_expansion: false,
      space_reserved_for_expansion: "",
      future_buildings_planned: "",
      future_civil_works_required: "",
      estimated_future_investment: null,
      existing_buildings: [],
      proposed_buildings: [],
      site_development_items: [],
    },
    serializePayload,
  });

  // useWatch — reactive subscriptions (form.watch is stale after form.reset).
  const existing = useWatch({ control: form.control, name: "existing_buildings" }) ?? [];
  const proposed = useWatch({ control: form.control, name: "proposed_buildings" }) ?? [];
  const siteDev = useWatch({ control: form.control, name: "site_development_items" }) ?? [];
  const hasCost = useWatch({ control: form.control, name: "has_civil_cost_estimate" });
  const hasExpansion = useWatch({ control: form.control, name: "has_future_expansion" });
  const basisOfEstimate = useWatch({ control: form.control, name: "basis_of_estimate" });
  const basisOfEstimateOther = useWatch({ control: form.control, name: "basis_of_estimate_other" }) ?? "";

  // D card cost inputs — watched values
  const costs = {
    cost_site_development: useWatch({ control: form.control, name: "cost_site_development" }),
    cost_building_construction: useWatch({ control: form.control, name: "cost_building_construction" }),
    cost_internal_roads: useWatch({ control: form.control, name: "cost_internal_roads" }),
    cost_compound_wall: useWatch({ control: form.control, name: "cost_compound_wall" }),
    cost_drainage: useWatch({ control: form.control, name: "cost_drainage" }),
    cost_water_supply: useWatch({ control: form.control, name: "cost_water_supply" }),
    cost_sanitation: useWatch({ control: form.control, name: "cost_sanitation" }),
    cost_electrical: useWatch({ control: form.control, name: "cost_electrical" }),
    cost_fire_protection: useWatch({ control: form.control, name: "cost_fire_protection" }),
    cost_landscaping: useWatch({ control: form.control, name: "cost_landscaping" }),
    cost_other_civil: useWatch({ control: form.control, name: "cost_other_civil" }),
  } as const;

  // E card — watched values
  const spaceReservedForExpansion = useWatch({ control: form.control, name: "space_reserved_for_expansion" }) ?? "";
  const futureBuildingsPlanned = useWatch({ control: form.control, name: "future_buildings_planned" }) ?? "";
  const futureCivilWorksRequired = useWatch({ control: form.control, name: "future_civil_works_required" }) ?? "";
  const estimatedFutureInvestment = useWatch({ control: form.control, name: "estimated_future_investment" });

  // Convenience setter — always includes shouldDirty: true.
  const setField = <K extends keyof Data>(name: K, value: Data[K]) =>
    form.setValue(name as never, value as never, { shouldDirty: true });

  // Section-level live errors — mirror civil_validators.py.
  const liveErrors: Record<string, string | undefined> = {};
  if (basisOfEstimate === "other" && !String(basisOfEstimateOther).trim()) {
    liveErrors.basis_of_estimate_other = 'Please specify — "Others" was selected for cost estimation basis.';
  }
  const err = (name: string): string | undefined =>
    fieldErrors.get(name) ?? liveErrors[name];

  const loading = isLoading || buildingTypeQuery.isLoading || civilCategoryQuery.isLoading;

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="civil"
      loading={loading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
      help={
        <SectionHelp
          title="Building, Civil Works & Physical Infrastructure"
          purpose="Capture the built-environment picture of the project — existing buildings on site, new buildings proposed, site development works (drainage / roads / boundary / etc.), an itemised civil-infrastructure cost estimate, and provisions for future expansion. This feeds the Civil Works chapter of the DPR PDF and drives the civil-works cost line in the Investment summary."
          whatToFill={[
            "A — Existing Buildings (optional list). Click 'Add existing building' for each pre-existing structure on the parcel. Building name + floor area are required per row. Purpose, ownership, present condition, proposed action (continue/renovate/expand/demolish), year of construction, and number of floors are all optional but help the site plan.",
            "B — Proposed Buildings (add ≥ 1 for any construction project). Building type (FK from master data — 18 types like processing hall, storage warehouse, cold storage, etc.) + floor area are required. Purpose, area unit (sq. ft. / sq. m.), location within site, floors, estimated cost + completion period are all optional.",
            "C — Site Development Works (optional list). Non-building civil works — boundary wall, drainage, internal roads, landscaping, etc. Category (FK from master data) is required per row; qty, cost, and remarks are optional. 'Others' category reveals a specify field.",
            "D — Civil Infrastructure Cost. Tick 'Estimated civil infrastructure cost available' to reveal the 11 cost line-items (site dev, buildings, roads, wall, drainage, water, sanitation, electrical, fire, landscaping, other). All 11 are optional. Basis of estimate (engineer / contractor / consultant / prev project / other) is a dropdown; if 'Others' → specify text becomes required.",
            "E — Future Expansion Provision (optional). Tick 'Future expansion planned' to reveal 4 fields: space reserved (free text), future buildings planned (textarea), future civil works required (textarea), estimated future investment (₹).",
          ]}
          tips={[
            "Split existing vs proposed carefully. Existing = already built; Proposed = will be built as part of this project. Rebuilding on the same footprint = 1 existing row (proposed_action=demolish) + 1 proposed row.",
            "Floor area is required per row for both A and B. Use the same area_unit (sq. m. or sq. ft.) across all rows in one project — mixing units makes the totals hard to audit.",
            "Number of floors caps at 20 — for anything taller, this DPR module is the wrong tool.",
            "D card cost line-items add up to the civil-works line in the Investment section. Don't leave everything blank if you ticked 'available' — that's confusing.",
            "'Basis of estimate' matters for bankers. 'Contractor Quotation' + 'Engineer's Estimate' carry the most weight; 'Previous Similar Project' is acceptable for early-stage DPR; 'Others' needs an explanation.",
            "Existing buildings without a defined proposed_action (continue/renovate/expand/demolish/convert) read as untouched in the PDF — banker may ask what you plan to do with them.",
          ]}
          downstream={[
            "Civil Works chapter in the DPR PDF — all 3 nested lists + D cost table + E expansion section all render there",
            "Investment section — 11 D cost line-items sum into the civil-works line under 'Project Cost'",
            "Machinery section — proposed buildings' floor area constrains machinery layout options",
            "Site section — proposed_location_within_site cross-references the parcel layout on Site card A",
            "Risk Analysis chapter — buildings with proposed_action=demolish or in poor condition flag as project risks",
            "AI narrative — building profile + cost estimation basis feed the Civil Works paragraph",
          ]}
        />
      }
    >
      <div className="space-y-4">
        {/* A. Existing Buildings — id enables readiness-panel deep-link scroll */}
        <div id="dpr-field-existing_buildings" />
        <NestedListCard<ExistingBuilding>
          title="A. Existing Buildings"
          items={existing}
          onChange={(next) => form.setValue("existing_buildings", next, { shouldDirty: true })}
          warning={fieldWarnings.get("existing_buildings")}
          emptyRow={{
            order: 0, building_name: "", purpose: "", floor_area: null, area_unit: "",
            present_condition: "", ownership_status: "", proposed_action: "",
            year_of_construction: null, num_floors: null, current_utilisation: "",
          }}
          columns={[
            { key: "building_name", label: "Name" },
            { key: "floor_area", label: "Floor area" },
            { key: "ownership_status", label: "Ownership", render: (v) => OWNERSHIP_CHOICES.find((o) => o.value === v)?.label ?? "—" },
            { key: "proposed_action", label: "Action", render: (v) => PROPOSED_ACTIONS.find((o) => o.value === v)?.label ?? "—" },
          ]}
          isValid={(row) => Object.keys(validateExistingBuilding(row)).length === 0}
          addLabel="Add existing building"
          editLabel="Edit existing building"
          renderModal={(row, set) => {
            const eErr = validateExistingBuilding(row);
            return (
              <>
                <ModalField label="Building name *" error={eErr.building_name}>
                  <Input
                    value={row.building_name}
                    maxLength={MAX_TEXT_CHARS}
                    onChange={(e) => set("building_name", e.target.value.slice(0, MAX_TEXT_CHARS))}
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
                  <ModalField label="Floor area *" error={eErr.floor_area}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={12}
                      placeholder="e.g. 40"
                      value={row.floor_area !== null && row.floor_area !== undefined ? String(row.floor_area) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, {
                          max: MAX_FLOOR_AREA,
                          maxDecimals: 2,
                        });
                        set("floor_area", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                  <ModalField label="Area unit">
                    <ChoiceSelect value={row.area_unit} options={AREA_UNITS} onChange={(v) => set("area_unit", v)} />
                  </ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Present condition">
                    <Input
                      value={row.present_condition}
                      maxLength={MAX_TEXT_CHARS}
                      onChange={(e) => set("present_condition", e.target.value.slice(0, MAX_TEXT_CHARS))}
                    />
                  </ModalField>
                  <ModalField label="Ownership status">
                    <SearchableSelect
                      value={row.ownership_status}
                      options={OWNERSHIP_CHOICES}
                      onChange={(v: string) => set("ownership_status", v)}
                      placeholder="Type to search…"
                    />
                  </ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Proposed action">
                    <SearchableSelect
                      value={row.proposed_action}
                      options={PROPOSED_ACTIONS}
                      onChange={(v: string) => set("proposed_action", v)}
                      placeholder="Type to search…"
                    />
                  </ModalField>
                  <ModalField label="Year of construction">
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="e.g. 2015"
                      value={row.year_of_construction !== null && row.year_of_construction !== undefined ? String(row.year_of_construction) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseIntegerInput(e.target.value, {
                          max: MAX_INFRA_YEAR,
                          min: 1900,
                        });
                        set("year_of_construction", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Number of floors">
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={3}
                      placeholder="e.g. 1"
                      value={row.num_floors !== null && row.num_floors !== undefined ? String(row.num_floors) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseIntegerInput(e.target.value, {
                          max: MAX_FLOORS,
                          min: 1,
                        });
                        set("num_floors", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                  <ModalField label="Current utilisation">
                    <Input
                      value={row.current_utilisation}
                      maxLength={MAX_TEXT_CHARS}
                      onChange={(e) => set("current_utilisation", e.target.value.slice(0, MAX_TEXT_CHARS))}
                    />
                  </ModalField>
                </ModalRow>
              </>
            );
          }}
        />

        {/* B. Proposed Buildings — id enables readiness-panel deep-link scroll */}
        <div id="dpr-field-proposed_buildings" />
        <NestedListCard<ProposedBuilding>
          title="B. Proposed Buildings"
          items={proposed}
          onChange={(next) => form.setValue("proposed_buildings", next, { shouldDirty: true })}
          warning={fieldWarnings.get("proposed_buildings")}
          emptyRow={{
            order: 0, building_type: null, building_type_other: "", purpose: "",
            floor_area: null, area_unit: "", proposed_location_within_site: "",
            num_floors: null, estimated_construction_cost: null, estimated_completion_period: "",
          }}
          columns={[
            {
              key: "building_type",
              label: "Type",
              render: (v) => (buildingTypeQuery.data?.find((r) => r.id === v)?.label as string) ?? "—",
            },
            { key: "floor_area", label: "Floor area" },
            { key: "estimated_construction_cost", label: "Est. cost" },
          ]}
          isValid={(row) => Object.keys(validateProposedBuilding(row)).length === 0}
          addLabel="Add proposed building"
          editLabel="Edit proposed building"
          renderModal={(row, set) => {
            const pErr = validateProposedBuilding(row);
            const isOtherType = buildingTypeQuery.data?.find((r) => r.id === row.building_type)?.code === "other";
            return (
              <>
                <ModalField label="Building type *" error={pErr.building_type}>
                  <MasterSearchableSelect
                    value={row.building_type}
                    options={buildingTypeQuery.data ?? []}
                    onChange={(v) => set("building_type", v)}
                    placeholder="Type to search building type…"
                  />
                </ModalField>
                {isOtherType && (
                  <ModalField label="Please specify (Others)">
                    <Input
                      value={row.building_type_other}
                      maxLength={MAX_OTHER_TEXT_CHARS}
                      onChange={(e) => set("building_type_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
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
                  <ModalField label="Floor area *" error={pErr.floor_area}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={12}
                      placeholder="e.g. 120"
                      value={row.floor_area !== null && row.floor_area !== undefined ? String(row.floor_area) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, {
                          max: MAX_FLOOR_AREA,
                          maxDecimals: 2,
                        });
                        set("floor_area", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                  <ModalField label="Area unit">
                    <ChoiceSelect value={row.area_unit} options={AREA_UNITS} onChange={(v) => set("area_unit", v)} />
                  </ModalField>
                </ModalRow>
                <ModalField label="Proposed location within site">
                  <Input
                    value={row.proposed_location_within_site}
                    maxLength={MAX_LOCATION_CHARS}
                    onChange={(e) => set("proposed_location_within_site", e.target.value.slice(0, MAX_LOCATION_CHARS))}
                  />
                </ModalField>
                <ModalRow>
                  <ModalField label="Number of floors">
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={3}
                      placeholder="e.g. 1"
                      value={row.num_floors !== null && row.num_floors !== undefined ? String(row.num_floors) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseIntegerInput(e.target.value, {
                          max: MAX_FLOORS,
                          min: 1,
                        });
                        set("num_floors", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                  <ModalField label="Estimated construction cost (₹)">
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={16}
                      placeholder="e.g. 1500000"
                      value={row.estimated_construction_cost !== null && row.estimated_construction_cost !== undefined ? String(row.estimated_construction_cost) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, {
                          max: MAX_COST_INR,
                          maxDecimals: 2,
                        });
                        set("estimated_construction_cost", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                </ModalRow>
                <ModalField label="Estimated completion period">
                  <Input
                    placeholder="e.g. 6 months"
                    value={row.estimated_completion_period}
                    maxLength={MAX_COMPLETION_CHARS}
                    onChange={(e) => set("estimated_completion_period", e.target.value.slice(0, MAX_COMPLETION_CHARS))}
                  />
                </ModalField>
              </>
            );
          }}
        />

        {/* C. Site Development Works — id enables readiness-panel deep-link scroll */}
        <div id="dpr-field-site_development_items" />
        <NestedListCard<SiteDevItem>
          title="C. Site Development Works"
          items={siteDev}
          onChange={(next) => form.setValue("site_development_items", next, { shouldDirty: true })}
          warning={fieldWarnings.get("site_development_items")}
          emptyRow={{
            order: 0, category: null, category_other: "", estimated_quantity: "",
            estimated_cost: null, remarks: "",
          }}
          columns={[
            {
              key: "category",
              label: "Category",
              render: (v) => (civilCategoryQuery.data?.find((r) => r.id === v)?.label as string) ?? "—",
            },
            { key: "estimated_quantity", label: "Qty" },
            { key: "estimated_cost", label: "Cost" },
          ]}
          isValid={(row) => Object.keys(validateSiteDev(row)).length === 0}
          addLabel="Add site development work"
          editLabel="Edit site development work"
          renderModal={(row, set) => {
            const sErr = validateSiteDev(row);
            const isOtherCategory = civilCategoryQuery.data?.find((r) => r.id === row.category)?.code === "other";
            return (
              <>
                <ModalField label="Category *" error={sErr.category}>
                  <MasterSearchableSelect
                    value={row.category}
                    options={civilCategoryQuery.data ?? []}
                    onChange={(v) => set("category", v)}
                    placeholder="Type to search category…"
                  />
                </ModalField>
                {isOtherCategory && (
                  <ModalField label="Please specify (Others)">
                    <Input
                      value={row.category_other}
                      maxLength={MAX_OTHER_TEXT_CHARS}
                      onChange={(e) => set("category_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
                    />
                  </ModalField>
                )}
                <ModalRow>
                  <ModalField label="Estimated quantity">
                    <Input
                      placeholder="e.g. 500 m"
                      value={row.estimated_quantity}
                      maxLength={MAX_TEXT_CHARS}
                      onChange={(e) => set("estimated_quantity", e.target.value.slice(0, MAX_TEXT_CHARS))}
                    />
                  </ModalField>
                  <ModalField label="Estimated cost (₹)">
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={16}
                      placeholder="e.g. 240000"
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
                <ModalField label="Remarks">
                  <CountedTextarea
                    rows={2}
                    maxChars={MAX_LONG_TEXT_CHARS}
                    value={row.remarks}
                    onChange={(v) => set("remarks", v)}
                  />
                </ModalField>
              </>
            );
          }}
        />

        {/* D. Costs */}
        <Card>
          <CardContent className="space-y-4 p-6">
            <h3 className="text-sm font-semibold">D. Civil Infrastructure Cost</h3>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={hasCost}
                onCheckedChange={(c) => form.setValue("has_civil_cost_estimate", !!c, { shouldDirty: true })}
              />
              <span>Estimated civil infrastructure cost available</span>
            </label>
            {hasCost && (
              <div className="space-y-3 border-l-2 border-primary/30 pl-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {(() => {
                    const costFields: Array<[keyof typeof costs, string]> = [
                      ["cost_site_development", "Site development"],
                      ["cost_building_construction", "Building construction"],
                      ["cost_internal_roads", "Internal roads"],
                      ["cost_compound_wall", "Compound wall"],
                      ["cost_drainage", "Drainage"],
                      ["cost_water_supply", "Water supply"],
                      ["cost_sanitation", "Sanitation"],
                      ["cost_electrical", "Electrical"],
                      ["cost_fire_protection", "Fire protection"],
                      ["cost_landscaping", "Landscaping"],
                      ["cost_other_civil", "Other civil"],
                    ];
                    return costFields.map(([key, label]) => {
                      const value = costs[key];
                      return (
                        <div key={key as string} className="space-y-1.5">
                          <Label className="text-xs">{label} (₹)</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            maxLength={16}
                            placeholder="₹"
                            value={value !== null && value !== undefined ? String(value) : ""}
                            onChange={(e) => {
                              const cleaned = normaliseDecimalInput(e.target.value, {
                                max: MAX_COST_INR,
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
                <div className="space-y-1.5">
                  <Label>Basis of cost estimation</Label>
                  <SearchableSelect
                    value={basisOfEstimate ?? ""}
                    options={COST_BASIS}
                    onChange={(v: string) => setField("basis_of_estimate", v)}
                    placeholder="Type to search basis…"
                  />
                </div>
                {basisOfEstimate === "other" && (
                  <div id="dpr-field-basis_of_estimate_other" className="space-y-1.5">
                    <Label className={err("basis_of_estimate_other") ? "text-destructive" : undefined}>
                      Please specify (Others) *
                    </Label>
                    <Input
                      value={basisOfEstimateOther as string}
                      maxLength={MAX_OTHER_TEXT_CHARS}
                      onChange={(e) => setField("basis_of_estimate_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
                    />
                    {err("basis_of_estimate_other") && (
                      <p className="text-xs text-destructive">{err("basis_of_estimate_other")}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* E. Future Expansion */}
        <Card>
          <CardContent className="space-y-4 p-6">
            <h3 className="text-sm font-semibold">E. Future Expansion Provision</h3>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={hasExpansion}
                onCheckedChange={(c) => form.setValue("has_future_expansion", !!c, { shouldDirty: true })}
              />
              <span>Future expansion planned</span>
            </label>
            {hasExpansion && (
              <div className="space-y-3 border-l-2 border-primary/30 pl-4">
                <div className="space-y-1.5">
                  <Label>Space reserved for expansion</Label>
                  <Input
                    value={spaceReservedForExpansion as string}
                    maxLength={MAX_TEXT_CHARS}
                    onChange={(e) => setField("space_reserved_for_expansion", e.target.value.slice(0, MAX_TEXT_CHARS))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Future buildings planned</Label>
                  <CountedTextarea
                    rows={2}
                    maxChars={MAX_LONG_TEXT_CHARS}
                    value={futureBuildingsPlanned as string}
                    onChange={(v) => setField("future_buildings_planned", v)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Future civil works required</Label>
                  <CountedTextarea
                    rows={2}
                    maxChars={MAX_LONG_TEXT_CHARS}
                    value={futureCivilWorksRequired as string}
                    onChange={(v) => setField("future_civil_works_required", v)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Estimated future investment (₹)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    maxLength={16}
                    placeholder="₹"
                    value={estimatedFutureInvestment !== null && estimatedFutureInvestment !== undefined ? String(estimatedFutureInvestment) : ""}
                    onChange={(e) => {
                      const cleaned = normaliseDecimalInput(e.target.value, {
                        max: MAX_COST_INR,
                        maxDecimals: 2,
                      });
                      setField("estimated_future_investment", (cleaned === "" ? null : cleaned) as Data["estimated_future_investment"]);
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SectionShell>
  );
}
