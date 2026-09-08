"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useWatch } from "react-hook-form";
import { z } from "zod";

import type { LatLng } from "@/app/fpo/(wizard)/register/_components/map-pin-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDprSectionForm } from "@/hooks/use-dpr-section-form";
import { api } from "@/lib/api/client";
import { dprMasterApi } from "@/lib/api/dpr-master";

import { MapErrorBoundary } from "@/components/common/map-error-boundary";

import { SectionHelp } from "./section-help";
import { SectionShell } from "./section-shell";

// Kerala's 14 districts — matches the backend `District` constants enum.
// Store + send the full name (backend field is a plain CharField). Code is
// derived on-the-fly only when we need to filter blocks by district.
const KERALA_DISTRICTS: ReadonlyArray<{ code: string; name: string }> = [
  { code: "TVM", name: "Thiruvananthapuram" }, { code: "KLM", name: "Kollam" },
  { code: "PTA", name: "Pathanamthitta" },    { code: "ALP", name: "Alappuzha" },
  { code: "KTM", name: "Kottayam" },          { code: "IDK", name: "Idukki" },
  { code: "EKM", name: "Ernakulam" },         { code: "TSR", name: "Thrissur" },
  { code: "PKD", name: "Palakkad" },          { code: "MLP", name: "Malappuram" },
  { code: "KZD", name: "Kozhikode" },         { code: "WYD", name: "Wayanad" },
  { code: "KNR", name: "Kannur" },            { code: "KSD", name: "Kasaragod" },
];

// Sentinel value chosen for the dropdown to trigger the "Other — type it"
// input. Never leaves the FE; on save we send whatever the user typed
// in the accompanying text input instead.
const OTHER = "__other__";

type MasterDataItem = { id: number; code: string; name: string };
type MasterDataResponse = { category: string; count: number; results: MasterDataItem[] };
async function fetchBlocksForDistrict(districtCode: string): Promise<MasterDataItem[]> {
  if (!districtCode) return [];
  const r = await api.get<MasterDataResponse>("/public/master-data/", {
    params: { category: "block", district: districtCode },
  });
  return r.data.results ?? [];
}

// Leaflet touches `window` — must be SSR-disabled dynamic import.
// Reuses the same MapPinPicker component used in the FPO registration wizard.
const MapPinPicker = dynamic(
  () =>
    import("@/app/fpo/(wizard)/register/_components/map-pin-picker").then(
      (m) => ({ default: m.MapPinPicker }),
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 items-center justify-center rounded-lg border bg-muted/30">
        <p className="text-muted-foreground text-sm">Loading map…</p>
      </div>
    ),
  },
);

const Schema = z.object({
  // Cat A
  state: z.string(),
  district: z.string(),
  taluk: z.string(),
  block_panchayat: z.string(),
  local_body_type: z.string(),
  local_body_name: z.string(),
  village: z.string(),
  ward_number: z.string(),
  survey_number: z.string(),
  // Cat B
  project_address: z.string(),
  landmark: z.string(),
  pin_code: z.string(),
  latitude: z.union([z.string(), z.number()]).nullable(),
  longitude: z.union([z.string(), z.number()]).nullable(),
  google_map_url: z.string(),
  // Cat C+D M2M
  land_ownership_types: z.array(z.number()),
  land_ownership_other: z.string(),
  site_statuses: z.array(z.number()),
  site_status_other: z.string(),
  // Cat E — distances
  dist_nearest_main_road_km: z.union([z.string(), z.number()]).nullable(),
  dist_nearest_market_km: z.union([z.string(), z.number()]).nullable(),
  dist_nearest_collection_centre_km: z.union([z.string(), z.number()]).nullable(),
  dist_railway_station_km: z.union([z.string(), z.number()]).nullable(),
  dist_airport_km: z.union([z.string(), z.number()]).nullable(),
  dist_seaport_km: z.union([z.string(), z.number()]).nullable(),
  // Cat F
  road_connectivity: z.string(),
  has_fibre: z.boolean(),
  has_broadband: z.boolean(),
  has_mobile_network: z.boolean(),
  internet_unavailable: z.boolean(),
});
type Data = z.infer<typeof Schema>;

const LOCAL_BODY_OPTIONS = [
  { value: "grama_panchayat", label: "Grama Panchayat" },
  { value: "municipality", label: "Municipality" },
  { value: "corporation", label: "Corporation" },
];

const ROAD_OPTIONS = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

const DECIMAL_KEYS = [
  "latitude",
  "longitude",
  "dist_nearest_main_road_km",
  "dist_nearest_market_km",
  "dist_nearest_collection_centre_km",
  "dist_railway_station_km",
  "dist_airport_km",
  "dist_seaport_km",
] as const;

// ── Input caps — mirror backend column widths on DPRSectionLocation ─────
// All match `apps/database/models/dpr/location.py`. Prevents pastes beyond
// the column limit from silently 400-ing at save time.
const MAX_STATE_CHARS = 100;
const MAX_DISTRICT_CHARS = 100;      // "Other" text input reuses this
const MAX_TALUK_CHARS = 100;
const MAX_BLOCK_CHARS = 100;         // "Other" text input reuses this
const MAX_LOCAL_BODY_NAME_CHARS = 200;
const MAX_VILLAGE_CHARS = 100;
const MAX_WARD_CHARS = 50;
const MAX_SURVEY_CHARS = 100;
const MAX_LANDMARK_CHARS = 200;
const MAX_URL_CHARS = 200;
const MAX_OTHER_TEXT_CHARS = 200;    // land_ownership_other, site_status_other
// Backend `project_address` is TextField (no cap). 2000 chars = ~½ page —
// matches investment.remarks + products.description. Third occurrence of
// this pattern; when a 4th section needs it, extract to a shared component.
const MAX_ADDRESS_CHARS = 2000;
// Indian PIN codes are exactly 6 digits. Backend column allows 10 chars
// but no format check — enforce 6-digit numeric on the FE.
const PIN_CODE_LENGTH = 6;
// Distances — Decimal(8, 2) allows up to 999,999.99 km. Even the Earth's
// diameter is only ~12,700 km, so any distance beyond a few thousand km
// from a Kerala project site is almost certainly a mistyped or pasted
// garbage number. Cap at 10,000 km.
const MAX_DISTANCE_KM = 10_000;

function toDecimalString(v: string | number | null): string | null {
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? String(n) : null;
}

/**
 * Normalise a raw string from a decimal input so it:
 *   1. Keeps only digits + one decimal point
 *   2. Trims to at most `maxDecimals` decimal places
 *   3. Clips at `max` — silently caps runaway values pasted from anywhere
 * Third occurrence of this helper (investment, products, now location) —
 * next section that needs it should promote this to a shared util file.
 */
function normaliseDecimalInput(
  raw: string,
  { max, maxDecimals }: { max: number; maxDecimals: number },
): string {
  if (raw === "" || raw == null) return "";
  const cleaned = raw.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  const withOneDot =
    parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;
  const [intPart = "", decPart] = withOneDot.split(".");
  const trimmedDec = decPart !== undefined ? decPart.slice(0, maxDecimals) : undefined;
  const finalStr =
    trimmedDec !== undefined ? `${intPart}.${trimmedDec}` : intPart;
  if (finalStr === "" || finalStr === ".") return finalStr;
  const n = Number(finalStr);
  if (Number.isFinite(n) && n > max) return String(max);
  return finalStr;
}

function serializePayload(v: Data): Record<string, unknown> {
  const out: Record<string, unknown> = { ...v };
  for (const k of DECIMAL_KEYS) out[k] = toDecimalString(v[k]);
  return out;
}

export function LocationSection({ uuid }: { uuid: string }) {
  const ownershipQuery = useQuery({
    queryKey: ["dpr-master", "land-ownership-types"],
    queryFn: () => dprMasterApi.list("land-ownership-types"),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const siteStatusQuery = useQuery({
    queryKey: ["dpr-master", "site-statuses"],
    queryFn: () => dprMasterApi.list("site-statuses"),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, fieldErrors, fieldWarnings, save, discard } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "location",
    schema: Schema,
    defaultValues: {
      state: "Kerala",
      district: "",
      taluk: "",
      block_panchayat: "",
      local_body_type: "",
      local_body_name: "",
      village: "",
      ward_number: "",
      survey_number: "",
      project_address: "",
      landmark: "",
      pin_code: "",
      latitude: null,
      longitude: null,
      google_map_url: "",
      land_ownership_types: [],
      land_ownership_other: "",
      site_statuses: [],
      site_status_other: "",
      dist_nearest_main_road_km: null,
      dist_nearest_market_km: null,
      dist_nearest_collection_centre_km: null,
      dist_railway_station_km: null,
      dist_airport_km: null,
      dist_seaport_km: null,
      road_connectivity: "",
      has_fibre: false,
      has_broadband: false,
      has_mobile_network: false,
      internet_unavailable: false,
    },
    serializePayload,
  });

  // Use `useWatch` (not `form.watch`) — reactive subscription so checkboxes /
  // selects reflect server-loaded values after form.reset() on initial page load.
  const ownershipIds = useWatch({ control: form.control, name: "land_ownership_types" }) ?? [];
  const siteStatusIds = useWatch({ control: form.control, name: "site_statuses" }) ?? [];
  const localBodyType = useWatch({ control: form.control, name: "local_body_type" }) ?? "";
  const roadConnectivity = useWatch({ control: form.control, name: "road_connectivity" }) ?? "";
  const districtValue = useWatch({ control: form.control, name: "district" }) ?? "";
  const blockValue = useWatch({ control: form.control, name: "block_panchayat" }) ?? "";
  const localBodyName = useWatch({ control: form.control, name: "local_body_name" }) ?? "";

  // Derive the district's 3-letter code from its display name — used only
  // for the block-filter query. Backend never sees the code.
  const districtCode =
    KERALA_DISTRICTS.find((d) => d.name === districtValue)?.code ?? "";

  // Fetch blocks for the currently-selected district. Cached 24h; refetches
  // when the district changes; skipped entirely if no district picked yet.
  const blocksQuery = useQuery({
    queryKey: ["public-master", "block", districtCode],
    queryFn: () => fetchBlocksForDistrict(districtCode),
    enabled: !!districtCode,
    staleTime: 24 * 60 * 60 * 1000,
  });
  const blockOptions = blocksQuery.data ?? [];

  // Explicit "user picked Other" state — we can't rely on the stored value
  // alone because "" (empty) is ambiguous (could be pre-fill or Other-with-blank).
  // Also sync from server data: when reloading a saved DPR whose district is
  // NOT one of the 14, mark Other picked so the text input appears pre-filled.
  const [districtOtherPicked, setDistrictOtherPicked] = useState(false);
  const [blockOtherPicked, setBlockOtherPicked] = useState(false);

  const districtIsKnownName = KERALA_DISTRICTS.some((d) => d.name === districtValue);
  const blockIsKnownName = blockOptions.some((b) => b.name === blockValue);

  useEffect(() => {
    // Reload case: value present but not in the known list → Other
    if (districtValue && !districtIsKnownName) setDistrictOtherPicked(true);
  }, [districtValue, districtIsKnownName]);
  useEffect(() => {
    if (blockValue && !blockIsKnownName && blockOptions.length > 0) setBlockOtherPicked(true);
  }, [blockValue, blockIsKnownName, blockOptions.length]);

  const showDistrictOther = districtOtherPicked;
  const showBlockOther = blockOtherPicked;
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

  function toggleOwnership(id: number, checked: boolean) {
    const cur = form.getValues("land_ownership_types") ?? [];
    form.setValue("land_ownership_types", checked ? [...cur, id] : cur.filter((i) => i !== id), { shouldDirty: true });
  }
  function toggleSite(id: number, checked: boolean) {
    const cur = form.getValues("site_statuses") ?? [];
    form.setValue("site_statuses", checked ? [...cur, id] : cur.filter((i) => i !== id), { shouldDirty: true });
  }

  const hasOwnershipOther = (ownershipQuery.data ?? []).some((r) => (r.code as string).endsWith("_other") && ownershipIds.includes(r.id));
  const hasSiteOther = (siteStatusQuery.data ?? []).some((r) => (r.code as string).endsWith("_other") && siteStatusIds.includes(r.id));

  // ── Watched values for every text/decimal field ────────────────────────
  // Every input now runs as a controlled input (value = watched, onChange =
  // form.setValue with `shouldDirty: true`) rather than uncontrolled via
  // form.register(). This guarantees the Save button enables on every
  // keystroke — RHF's register-based dirty tracking was inconsistent in this
  // section (typing in optional CharField-backed inputs like taluk / village
  // wasn't flipping formState.isDirty reliably, so the button stayed grey).
  // Controlled + explicit `shouldDirty: true` matches the reliable pattern
  // used in products, investment, and every section built after them.
  const stateVal = useWatch({ control: form.control, name: "state" }) ?? "";
  const talukVal = useWatch({ control: form.control, name: "taluk" }) ?? "";
  const villageVal = useWatch({ control: form.control, name: "village" }) ?? "";
  const wardVal = useWatch({ control: form.control, name: "ward_number" }) ?? "";
  const surveyVal = useWatch({ control: form.control, name: "survey_number" }) ?? "";
  const projectAddress = useWatch({ control: form.control, name: "project_address" }) ?? "";
  const landmarkVal = useWatch({ control: form.control, name: "landmark" }) ?? "";
  const pinCodeVal = useWatch({ control: form.control, name: "pin_code" }) ?? "";
  const googleMapUrl = useWatch({ control: form.control, name: "google_map_url" }) ?? "";
  const latitude = useWatch({ control: form.control, name: "latitude" });
  const longitude = useWatch({ control: form.control, name: "longitude" });
  const ownershipOther = useWatch({ control: form.control, name: "land_ownership_other" }) ?? "";
  const siteStatusOther = useWatch({ control: form.control, name: "site_status_other" }) ?? "";
  const distMainRoad = useWatch({ control: form.control, name: "dist_nearest_main_road_km" });
  const distMarket = useWatch({ control: form.control, name: "dist_nearest_market_km" });
  const distCollection = useWatch({ control: form.control, name: "dist_nearest_collection_centre_km" });
  const distRailway = useWatch({ control: form.control, name: "dist_railway_station_km" });
  const distAirport = useWatch({ control: form.control, name: "dist_airport_km" });
  const distSeaport = useWatch({ control: form.control, name: "dist_seaport_km" });

  // Convenience setter — every controlled input funnels through here so we
  // never forget the `shouldDirty: true` flag. The `as never` cast is the
  // idiomatic escape from RHF v7's overly-strict Path/PathValue generics
  // when the caller already knows the field name and type match.
  const setField = <K extends keyof Data>(name: K, value: Data[K]) =>
    form.setValue(name as never, value as never, { shouldDirty: true });

  // ── Live required-field validation ─────────────────────────────────────
  // Mirrors `apps/fpo/services/dpr/location_validators.py` exactly so the
  // user sees red immediately as they clear a required field — without
  // waiting for the ~5s autosave + readiness fetch round-trip. Same pattern
  // as products-section's `validateRow`. Backend `fieldErrors` still wins
  // when it has an entry (covers server-only rules like format checks).

  const liveErrors: Record<string, string | undefined> = {};
  if (!String(stateVal).trim()) liveErrors.state = "State is required.";
  if (!String(districtValue).trim()) liveErrors.district = "District is required.";
  if (!String(localBodyType).trim() || !String(localBodyName).trim()) {
    liveErrors.local_body_name =
      "Local Body (Grama Panchayat / Municipality / Corporation) is required.";
  }
  const hasAddress = String(projectAddress).trim().length > 0;
  const hasCoords = latitude !== null && latitude !== undefined && latitude !== ""
    && longitude !== null && longitude !== undefined && longitude !== "";
  if (!hasAddress && !hasCoords) {
    liveErrors.project_address =
      "Project location shall be identified either through address or map selection (lat/long).";
  }
  if (ownershipIds.length === 0) {
    liveErrors.land_ownership_types = "At least one land ownership type shall be specified.";
  }
  if (siteStatusIds.length === 0) {
    liveErrors.site_statuses = "At least one site status shall be specified.";
  }
  if (hasOwnershipOther && !String(ownershipOther).trim()) {
    liveErrors.land_ownership_other =
      'Please specify — "Others" was selected but no description provided.';
  }
  if (hasSiteOther && !String(siteStatusOther).trim()) {
    liveErrors.site_status_other =
      'Please specify — "Others" was selected but no description provided.';
  }

  /**
   * Merge live client error with backend field error for a given field.
   * Backend wins when it has a message (covers server-only rules); otherwise
   * fall back to the live rule so the user sees red immediately.
   */
  const err = (name: string): string | undefined =>
    fieldErrors.get(name) ?? liveErrors[name];

  const loading = isLoading || ownershipQuery.isLoading || siteStatusQuery.isLoading;

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="location"
      loading={loading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
      help={
        <SectionHelp
          title="Project Location"
          purpose="Capture where the project is physically located — administrative address, map pin, land ownership, current site condition, distances to key infrastructure, and connectivity. This is one of the most information-dense sections; the details you enter here feed the DPR PDF's location map, the market analysis distances, the land parcel breakdown in the Site section, and the utilities / implementation planning downstream."
          whatToFill={[
            "A. Administrative — District, Local body type, and Local body name are required. State pre-fills to Kerala. Taluk, Block Panchayat, Village, Ward number and Survey number are optional but recommended.",
            "B. Location & Map — Either type the full postal address OR drop a pin on the map (at least one is required). If you can, do both — the address goes on the PDF cover page, the pin drives the location map. PIN code is 6 digits; Landmark is a short description of what's nearby ('opposite Panchayat office').",
            "C. Land Ownership Status — Tick every ownership type that applies (Owned by FPO / Leased / Government-allotted / etc.). At least one is required. If none of the pre-defined options fit, tick 'Others' and describe it in the text field that appears.",
            "D. Site Status — Tick the current condition of the site (Vacant / Partially built / Under construction / etc.). At least one is required. 'Others' works the same way as ownership.",
            "E. Accessibility — Distances in kilometres to the nearest main road, market, collection centre, railway station, airport and seaport. Main road and market distances are recommended (yellow suggestions). Enter 0 if the site is directly on the road.",
            "F. Connectivity — Road quality rating (Excellent / Good / Fair / Poor) is recommended. Internet availability is a multi-select — tick Fibre, Broadband, Mobile network as applicable, or 'Not available' if there's no coverage at all.",
          ]}
          tips={[
            "The map pin picker uses OpenStreetMap. Drag the pin to fine-tune once you've dropped it; the lat/long updates automatically and gets used on the PDF.",
            "District → Block cascade — pick your district first and the Block Panchayat dropdown will filter to just the blocks in that district. If your district isn't in the 14 Kerala list, pick 'Other (specify)' and type it.",
            "Address OR map pin is enough for the required check — but the DPR reads better when both are present. The address becomes the postal reference on the PDF cover; the map pin drives the location visualisation.",
            "Distance realism matters. The Market Analysis chapter uses your nearest-market distance to reason about logistics costs. A market 3 km away vs 30 km away changes the story significantly.",
            "PIN code is exactly 6 digits — the input silently strips anything non-numeric and caps at 6 characters, so you can safely paste from anywhere.",
          ]}
          downstream={[
            "PDF cover page location map + postal address block",
            "Market Analysis chapter — logistics distances (to market, collection centre, transport hubs)",
            "Site section — ownership + status feeds the per-parcel breakdown",
            "Utilities + Implementation chapters — connectivity + road quality drive planning assumptions",
          ]}
        />
      }
    >
      <div className="space-y-4">
        {/* ─── A. Administrative ─── */}
        <SubCard title="A. Administrative Details">
          <FieldRow>
            <F label="State *" fieldId="state" error={err("state")}>
              <Input
                value={stateVal as string}
                maxLength={MAX_STATE_CHARS}
                onChange={(e) => setField("state", e.target.value.slice(0, MAX_STATE_CHARS))}
              />
            </F>
            <F label="District *" fieldId="district" error={err("district")}>
              {/* SearchableSelect — 14 Kerala districts + "Other (specify)"
                  sentinel option. Type-to-filter is the fastest way to pick
                  from a long list; the same OTHER sentinel value drives the
                  reveal of the inline text input below. */}
              <SearchableSelect
                value={showDistrictOther ? OTHER : districtValue}
                onChange={(v) => {
                  if (v === OTHER) {
                    setDistrictOtherPicked(true);
                    form.setValue("district", "", { shouldDirty: true });
                  } else {
                    setDistrictOtherPicked(false);
                    form.setValue("district", v, { shouldDirty: true });
                  }
                  // Clear block + reset its Other state when district changes.
                  setBlockOtherPicked(false);
                  form.setValue("block_panchayat", "", { shouldDirty: true });
                }}
                options={[
                  ...KERALA_DISTRICTS.map((d) => ({ value: d.name, label: d.name })),
                  { value: OTHER, label: "Other (specify)" },
                ]}
                placeholder="Type to search district…"
              />
              {showDistrictOther && (
                <Input
                  className="mt-2"
                  placeholder="Enter district name"
                  value={districtValue}
                  maxLength={MAX_DISTRICT_CHARS}
                  onChange={(e) =>
                    setField("district", e.target.value.slice(0, MAX_DISTRICT_CHARS))
                  }
                />
              )}
            </F>
          </FieldRow>
          <FieldRow>
            <F label="Taluk">
              <Input
                value={talukVal as string}
                maxLength={MAX_TALUK_CHARS}
                onChange={(e) => setField("taluk", e.target.value.slice(0, MAX_TALUK_CHARS))}
              />
            </F>
            <F label="Block Panchayat">
              {/* Cascaded from district — SearchableSelect with the fetched
                  block list + Other sentinel. Disabled until a district is
                  chosen (blocks are meaningless without district context). */}
              <SearchableSelect
                value={showBlockOther ? OTHER : blockValue}
                onChange={(v) => {
                  if (v === OTHER) {
                    setBlockOtherPicked(true);
                    form.setValue("block_panchayat", "", { shouldDirty: true });
                  } else {
                    setBlockOtherPicked(false);
                    form.setValue("block_panchayat", v, { shouldDirty: true });
                  }
                }}
                disabled={!districtCode}
                options={[
                  ...blockOptions.map((b) => ({ value: b.name, label: b.name })),
                  { value: OTHER, label: "Other (specify)" },
                ]}
                placeholder={districtCode ? "Type to search block…" : "Pick a district first"}
              />
              {showBlockOther && districtCode && (
                <Input
                  className="mt-2"
                  placeholder="Enter block name"
                  value={blockValue}
                  maxLength={MAX_BLOCK_CHARS}
                  onChange={(e) =>
                    setField("block_panchayat", e.target.value.slice(0, MAX_BLOCK_CHARS))
                  }
                />
              )}
            </F>
          </FieldRow>
          <FieldRow>
            <F label="Local body type *">
              <Select
                value={localBodyType}
                onValueChange={(v) => form.setValue("local_body_type", v, { shouldDirty: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {LOCAL_BODY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
            {/* Hide the "required" error the moment the user has typed
                something — backend readiness would still say required until
                the next save/refetch cycle, and that stale error is confusing. */}
            <F
              label="Local body name *"
              fieldId="local_body_name"
              error={err("local_body_name")}
            >
              <Input
                value={localBodyName as string}
                maxLength={MAX_LOCAL_BODY_NAME_CHARS}
                onChange={(e) =>
                  setField("local_body_name", e.target.value.slice(0, MAX_LOCAL_BODY_NAME_CHARS))
                }
              />
            </F>
          </FieldRow>
          <FieldRow>
            <F label="Village">
              <Input
                value={villageVal as string}
                maxLength={MAX_VILLAGE_CHARS}
                onChange={(e) => setField("village", e.target.value.slice(0, MAX_VILLAGE_CHARS))}
              />
            </F>
            <F label="Ward number">
              <Input
                value={wardVal as string}
                maxLength={MAX_WARD_CHARS}
                onChange={(e) => setField("ward_number", e.target.value.slice(0, MAX_WARD_CHARS))}
              />
            </F>
          </FieldRow>
          <F label="Survey number(s)">
            <Input
              value={surveyVal as string}
              maxLength={MAX_SURVEY_CHARS}
              onChange={(e) => setField("survey_number", e.target.value.slice(0, MAX_SURVEY_CHARS))}
            />
          </F>
        </SubCard>

        {/* ─── B. Location Details ─── */}
        <SubCard title="B. Location & Map">
          <F label="Project address *" fieldId="project_address" error={err("project_address")}>
            <div className="space-y-1">
              <Textarea
                rows={2}
                value={projectAddress as string}
                maxLength={MAX_ADDRESS_CHARS}
                onChange={(e) =>
                  setField("project_address", e.target.value.slice(0, MAX_ADDRESS_CHARS))
                }
              />
              {/* Character counter — mirrors the pattern used on
                  investment.remarks + products.description. Turns amber at
                  90% of cap, destructive at cap. */}
              {(() => {
                const len = String(projectAddress).length;
                const near = len > MAX_ADDRESS_CHARS * 0.9;
                const at = len >= MAX_ADDRESS_CHARS;
                return (
                  <div
                    className={
                      at
                        ? "text-right text-xs font-medium text-destructive"
                        : near
                          ? "text-right text-xs text-amber-600"
                          : "text-right text-xs text-muted-foreground"
                    }
                  >
                    {len} / {MAX_ADDRESS_CHARS} chars
                  </div>
                );
              })()}
            </div>
          </F>
          <FieldRow>
            <F label="Landmark">
              <Input
                value={landmarkVal as string}
                maxLength={MAX_LANDMARK_CHARS}
                onChange={(e) => setField("landmark", e.target.value.slice(0, MAX_LANDMARK_CHARS))}
              />
            </F>
            <F label="PIN code">
              {/* Indian PIN codes are exactly 6 digits — strip non-numeric
                  on input and cap length. inputMode="numeric" gives mobile
                  keypads the correct digits-only layout. */}
              <Input
                value={pinCodeVal as string}
                inputMode="numeric"
                maxLength={PIN_CODE_LENGTH}
                placeholder="6-digit PIN"
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, PIN_CODE_LENGTH);
                  setField("pin_code", digits);
                }}
              />
            </F>
          </FieldRow>
          <F label="Pin project location on map">
            <MapPinPickerField uuid={uuid} form={form} />
          </F>
          <F label="Google Map URL (optional)">
            <Input
              type="url"
              placeholder="https://…"
              value={googleMapUrl as string}
              maxLength={MAX_URL_CHARS}
              onChange={(e) =>
                setField("google_map_url", e.target.value.slice(0, MAX_URL_CHARS))
              }
            />
          </F>
        </SubCard>

        {/* ─── C. Land Ownership ─── */}
        <SubCard title="C. Land Ownership Status *">
          {/* Backend readiness error on `land_ownership_types` deep-links
              here — the M2M has no single input to attach the id to, so the
              anchor lives on the wrapping div above the checkbox grid. */}
          <div id="dpr-field-land_ownership_types">
            {err("land_ownership_types") && (
              <div className="mb-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {err("land_ownership_types")}
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {(ownershipQuery.data ?? []).map((item) => (
                <label key={item.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={ownershipIds.includes(item.id)}
                    onCheckedChange={(c) => toggleOwnership(item.id, !!c)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
          {hasOwnershipOther && (
            <F
              label="Please specify (Others) *"
              fieldId="land_ownership_other"
              error={err("land_ownership_other")}
            >
              <Input
                value={ownershipOther as string}
                maxLength={MAX_OTHER_TEXT_CHARS}
                onChange={(e) =>
                  setField("land_ownership_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))
                }
              />
            </F>
          )}
        </SubCard>

        {/* ─── D. Site Status ─── */}
        <SubCard title="D. Site Status *">
          {/* Anchor + banner mirrors the Ownership sub-card. Readiness
              deep-links target the same `dpr-field-site_statuses` id. */}
          <div id="dpr-field-site_statuses">
            {err("site_statuses") && (
              <div className="mb-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {err("site_statuses")}
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {(siteStatusQuery.data ?? []).map((item) => (
                <label key={item.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={siteStatusIds.includes(item.id)}
                    onCheckedChange={(c) => toggleSite(item.id, !!c)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
          {hasSiteOther && (
            <F
              label="Please specify (Others) *"
              fieldId="site_status_other"
              error={err("site_status_other")}
            >
              <Input
                value={siteStatusOther as string}
                maxLength={MAX_OTHER_TEXT_CHARS}
                onChange={(e) =>
                  setField("site_status_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))
                }
              />
            </F>
          )}
        </SubCard>

        {/* ─── E. Accessibility ─── */}
        <SubCard title="E. Accessibility (distances in km)">
          <FieldRow>
            <DistanceField
              label="Nearest main road"
              fieldId="dist_nearest_main_road_km"
              value={distMainRoad as string | number | null}
              onChange={(v) => setField("dist_nearest_main_road_km", v)}
              error={fieldErrors.get("dist_nearest_main_road_km")}
              warning={fieldWarnings.get("dist_nearest_main_road_km")}
            />
            <DistanceField
              label="Nearest market"
              fieldId="dist_nearest_market_km"
              value={distMarket as string | number | null}
              onChange={(v) => setField("dist_nearest_market_km", v)}
              error={fieldErrors.get("dist_nearest_market_km")}
              warning={fieldWarnings.get("dist_nearest_market_km")}
            />
          </FieldRow>
          <FieldRow>
            <DistanceField
              label="Nearest collection centre"
              value={distCollection as string | number | null}
              onChange={(v) => setField("dist_nearest_collection_centre_km", v)}
              error={fieldErrors.get("dist_nearest_collection_centre_km")}
              warning={fieldWarnings.get("dist_nearest_collection_centre_km")}
            />
            <DistanceField
              label="Railway station"
              value={distRailway as string | number | null}
              onChange={(v) => setField("dist_railway_station_km", v)}
              error={fieldErrors.get("dist_railway_station_km")}
              warning={fieldWarnings.get("dist_railway_station_km")}
            />
          </FieldRow>
          <FieldRow>
            <DistanceField
              label="Airport"
              value={distAirport as string | number | null}
              onChange={(v) => setField("dist_airport_km", v)}
              error={fieldErrors.get("dist_airport_km")}
              warning={fieldWarnings.get("dist_airport_km")}
            />
            <DistanceField
              label="Seaport"
              value={distSeaport as string | number | null}
              onChange={(v) => setField("dist_seaport_km", v)}
              error={fieldErrors.get("dist_seaport_km")}
              warning={fieldWarnings.get("dist_seaport_km")}
            />
          </FieldRow>
        </SubCard>

        {/* ─── F. Connectivity ─── */}
        <SubCard title="F. Connectivity">
          <F label="Road connectivity" fieldId="road_connectivity" error={fieldErrors.get("road_connectivity")} warning={fieldWarnings.get("road_connectivity")}>
            <Select
              value={roadConnectivity}
              onValueChange={(v) => form.setValue("road_connectivity", v, { shouldDirty: true })}
            >
              <SelectTrigger><SelectValue placeholder="Select quality" /></SelectTrigger>
              <SelectContent>
                {ROAD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>
          <div className="pt-1">
            <Label>Internet availability (check all applicable)</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {[
                ["has_fibre", "Fibre"],
                ["has_broadband", "Broadband"],
                ["has_mobile_network", "Mobile network"],
                ["internet_unavailable", "Not available"],
              ].map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={!!internetChecks[key as string]}
                    onCheckedChange={(c) =>
                      form.setValue(key as keyof Data, !!c as never, { shouldDirty: true })
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </SubCard>
      </div>
    </SectionShell>
  );
}

// ── Layout helpers ─────────────────────────────────────────────────────────

function SubCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <h3 className="text-sm font-semibold">{title}</h3>
        {children}
      </CardContent>
    </Card>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function F({
  label,
  children,
  error,
  warning,
  fieldId,
}: {
  label: string;
  children: React.ReactNode;
  /** Backend-driven inline error (from `fieldErrors.get(name)`). */
  error?: string;
  /** Backend-driven inline warning (from `fieldWarnings.get(name)`). */
  warning?: string;
  /**
   * When set, applies `id="dpr-field-<fieldId>"` on the wrapper div — this
   * is the anchor the readiness panel scrolls to when the user clicks a
   * field-level error. Same `dpr-field-<name>` naming convention used
   * across every DPR section.
   */
  fieldId?: string;
}) {
  return (
    <div
      id={fieldId ? `dpr-field-${fieldId}` : undefined}
      className="space-y-1.5"
    >
      {/* Label turns red on error so the field is visually flagged even before
          the tester reads the message underneath. */}
      <Label className={error ? "text-destructive" : undefined}>{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      {!error && warning && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">{warning}</p>
      )}
    </div>
  );
}

/**
 * DistanceField — shared control for all 6 distance-km inputs in section E.
 * Uses the safer type="text" + inputMode="decimal" pattern (same as
 * products qty/price and investment cost). `normaliseDecimalInput` strips
 * non-numeric chars, enforces 2 decimals (matches backend Decimal(8, 2))
 * and clips at MAX_DISTANCE_KM so a pasted 60-digit garbage number can't
 * sail through.
 */
function DistanceField({
  label,
  value,
  onChange,
  error,
  warning,
  fieldId,
}: {
  label: string;
  value: string | number | null;
  onChange: (v: string | null) => void;
  error?: string;
  warning?: string;
  fieldId?: string;
}) {
  return (
    <F label={label} fieldId={fieldId} error={error} warning={warning}>
      <Input
        type="text"
        inputMode="decimal"
        maxLength={10}
        placeholder="e.g. 3.5"
        value={value !== null && value !== undefined ? String(value) : ""}
        onChange={(e) => {
          const cleaned = normaliseDecimalInput(e.target.value, {
            max: MAX_DISTANCE_KM,
            maxDecimals: 2,
          });
          onChange(cleaned === "" ? null : cleaned);
        }}
      />
    </F>
  );
}

// ── Map pin picker wrapper ────────────────────────────────────────────────
// Bridges the shared MapPinPicker component to the location section form.
// Watches lat/long via `useWatch` for reliable re-render on server hydration.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MapPinPickerField = memo(function MapPinPickerField({ form }: { uuid: string; form: any }) {
  const latRaw = useWatch({ control: form.control, name: "latitude" });
  const lngRaw = useWatch({ control: form.control, name: "longitude" });

  // Memoise the {lat, lng} object so MapPinPicker doesn't see a "new" value
  // reference on every parent re-render. Without this, react-leaflet was
  // treating each parent tick as a value change → re-mounting internal
  // layers (Marker/TileLayer) → occasionally trying to attach to a
  // container that had just been torn down → "Cannot read properties of
  // undefined (reading 'appendChild')".
  const mapValue = useMemo<LatLng | null>(() => {
    const lat =
      latRaw !== null && latRaw !== undefined && latRaw !== "" ? Number(latRaw) : null;
    const lng =
      lngRaw !== null && lngRaw !== undefined && lngRaw !== "" ? Number(lngRaw) : null;
    if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    return { lat, lng };
  }, [latRaw, lngRaw]);

  const handleChange = useCallback(
    (coords: LatLng | null) => {
      if (coords) {
        form.setValue("latitude", String(coords.lat), { shouldDirty: true });
        form.setValue("longitude", String(coords.lng), { shouldDirty: true });
      } else {
        form.setValue("latitude", null, { shouldDirty: true });
        form.setValue("longitude", null, { shouldDirty: true });
      }
    },
    [form],
  );

  return (
    <MapErrorBoundary>
      <MapPinPicker value={mapValue} onChange={handleChange} />
    </MapErrorBoundary>
  );
});
