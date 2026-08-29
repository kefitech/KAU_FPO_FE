"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useWatch } from "react-hook-form";
import { z } from "zod";

import type { LatLng } from "@/app/fpo/(wizard)/register/_components/map-pin-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDprSectionForm } from "@/hooks/use-dpr-section-form";
import { dprMasterApi } from "@/lib/api/dpr-master";

import { SectionShell } from "./section-shell";

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

function toDecimalString(v: string | number | null): string | null {
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? String(n) : null;
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
    >
      <div className="space-y-4">
        {/* ─── A. Administrative ─── */}
        <SubCard title="A. Administrative Details">
          <FieldRow>
            <F label="State" error={fieldErrors.get("state")}>
              <Input {...form.register("state")} />
            </F>
            <F label="District *" error={fieldErrors.get("district")}>
              <Input {...form.register("district")} />
            </F>
          </FieldRow>
          <FieldRow>
            <F label="Taluk"><Input {...form.register("taluk")} /></F>
            <F label="Block Panchayat"><Input {...form.register("block_panchayat")} /></F>
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
            <F label="Local body name *" error={fieldErrors.get("local_body_name")}>
              <Input {...form.register("local_body_name")} />
            </F>
          </FieldRow>
          <FieldRow>
            <F label="Village"><Input {...form.register("village")} /></F>
            <F label="Ward number"><Input {...form.register("ward_number")} /></F>
          </FieldRow>
          <F label="Survey number(s)"><Input {...form.register("survey_number")} /></F>
        </SubCard>

        {/* ─── B. Location Details ─── */}
        <SubCard title="B. Location & Map">
          <F label="Project address" error={fieldErrors.get("project_address")}>
            <Textarea rows={2} {...form.register("project_address")} />
          </F>
          <FieldRow>
            <F label="Landmark"><Input {...form.register("landmark")} /></F>
            <F label="PIN code"><Input {...form.register("pin_code")} /></F>
          </FieldRow>
          <F label="Pin project location on map">
            <MapPinPickerField uuid={uuid} form={form} />
          </F>
          <F label="Google Map URL (optional)">
            <Input type="url" placeholder="https://…" {...form.register("google_map_url")} />
          </F>
        </SubCard>

        {/* ─── C. Land Ownership ─── */}
        <SubCard title="C. Land Ownership Status *">
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
          {hasOwnershipOther && (
            <F label="Please specify (Others)">
              <Input {...form.register("land_ownership_other")} />
            </F>
          )}
        </SubCard>

        {/* ─── D. Site Status ─── */}
        <SubCard title="D. Site Status *">
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
          {hasSiteOther && (
            <F label="Please specify (Others)">
              <Input {...form.register("site_status_other")} />
            </F>
          )}
        </SubCard>

        {/* ─── E. Accessibility ─── */}
        <SubCard title="E. Accessibility (distances in km)">
          <FieldRow>
            <F label="Nearest main road"><Input type="number" step="0.01" {...form.register("dist_nearest_main_road_km")} /></F>
            <F label="Nearest market"><Input type="number" step="0.01" {...form.register("dist_nearest_market_km")} /></F>
          </FieldRow>
          <FieldRow>
            <F label="Nearest collection centre"><Input type="number" step="0.01" {...form.register("dist_nearest_collection_centre_km")} /></F>
            <F label="Railway station"><Input type="number" step="0.01" {...form.register("dist_railway_station_km")} /></F>
          </FieldRow>
          <FieldRow>
            <F label="Airport"><Input type="number" step="0.01" {...form.register("dist_airport_km")} /></F>
            <F label="Seaport"><Input type="number" step="0.01" {...form.register("dist_seaport_km")} /></F>
          </FieldRow>
        </SubCard>

        {/* ─── F. Connectivity ─── */}
        <SubCard title="F. Connectivity">
          <F label="Road connectivity">
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
}: {
  label: string;
  children: React.ReactNode;
  /** Backend-driven inline error (from `fieldErrors.get(name)`). */
  error?: string;
  /** Backend-driven inline warning (from `fieldWarnings.get(name)`). */
  warning?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      {!error && warning && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">{warning}</p>
      )}
    </div>
  );
}

// ── Map pin picker wrapper ────────────────────────────────────────────────
// Bridges the shared MapPinPicker component to the location section form.
// Watches lat/long via `useWatch` for reliable re-render on server hydration.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MapPinPickerField({ form }: { uuid: string; form: any }) {
  const latRaw = useWatch({ control: form.control, name: "latitude" });
  const lngRaw = useWatch({ control: form.control, name: "longitude" });

  const lat =
    latRaw !== null && latRaw !== undefined && latRaw !== "" ? Number(latRaw) : null;
  const lng =
    lngRaw !== null && lngRaw !== undefined && lngRaw !== "" ? Number(lngRaw) : null;
  const mapValue: LatLng | null =
    lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng }
      : null;

  function handleChange(coords: LatLng | null) {
    if (coords) {
      form.setValue("latitude", String(coords.lat), { shouldDirty: true });
      form.setValue("longitude", String(coords.lng), { shouldDirty: true });
    } else {
      form.setValue("latitude", null, { shouldDirty: true });
      form.setValue("longitude", null, { shouldDirty: true });
    }
  }

  return <MapPinPicker value={mapValue} onChange={handleChange} />;
}
