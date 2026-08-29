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
  asset: z.number(),
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

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, save, discard } = useDprSectionForm<Data>({
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

  const toggleApproval = (code: string, checked: boolean) => {
    const cur = form.getValues("statutory_approvals") ?? [];
    form.setValue("statutory_approvals", checked ? [...cur, code] : cur.filter((c) => c !== code), { shouldDirty: true });
  };

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
    >
      <div className="space-y-4">
        {/* Machinery Items */}
        <NestedListCard<Machine>
          title="A. Machinery, Equipment & Tools"
          items={items}
          onChange={(next) => form.setValue("items", next, { shouldDirty: true })}
          emptyRow={EMPTY_MACHINE}
          columns={[
            { key: "name", label: "Name" },
            { key: "machine_category", label: "Category", render: (v) => (machineryCatQuery.data?.find((r) => r.id === v)?.label as string) ?? "—" },
            { key: "quantity_required", label: "Qty" },
            { key: "unit_cost", label: "Unit cost (₹)" },
          ]}
          isValid={(row) => row.name.trim().length > 0 && row.project_component !== null}
          addLabel="Add machinery"
          editLabel="Edit machinery"
          renderModal={(row, set) => (
            <>
              <ModalField label="Machinery name *"><Input value={row.name} onChange={(e) => set("name", e.target.value)} /></ModalField>
              <ModalField label="Purpose"><Input value={row.purpose} onChange={(e) => set("purpose", e.target.value)} /></ModalField>
              <ModalRow>
                <ModalField label="Linked project component *">
                  <MasterSelect value={row.project_component} options={componentQuery.data ?? []} onChange={(v) => set("project_component", v)} />
                </ModalField>
                <ModalField label="Machine category">
                  <MasterSelect value={row.machine_category} options={machineryCatQuery.data ?? []} onChange={(v) => set("machine_category", v)} />
                </ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Quantity required">
                  <Input type="number" step="0.001" value={row.quantity_required ?? ""} onChange={(e) => set("quantity_required", e.target.value || null)} />
                </ModalField>
                <ModalField label="Unit">
                  <MasterSelect value={row.unit} options={unitQuery.data ?? []} onChange={(v) => set("unit", v)} />
                </ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Manufacturer"><Input value={row.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} /></ModalField>
                <ModalField label="Supplier"><Input value={row.supplier} onChange={(e) => set("supplier", e.target.value)} /></ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Model number"><Input value={row.model_number} onChange={(e) => set("model_number", e.target.value)} /></ModalField>
                <ModalField label="Country of manufacture"><Input value={row.country_of_manufacture} onChange={(e) => set("country_of_manufacture", e.target.value)} /></ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Rated capacity">
                  <Input type="number" step="0.001" value={row.rated_capacity ?? ""} onChange={(e) => set("rated_capacity", e.target.value || null)} />
                </ModalField>
                <ModalField label="Capacity unit">
                  <MasterSelect value={row.capacity_unit} options={unitQuery.data ?? []} onChange={(v) => set("capacity_unit", v)} />
                </ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Power source"><Input value={row.power_source} onChange={(e) => set("power_source", e.target.value)} /></ModalField>
                <ModalField label="Automation level">
                  <ChoiceSelect value={row.automation_level} options={AUTOMATION} onChange={(v) => set("automation_level", v)} />
                </ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Unit cost (₹)"><Input type="number" step="0.01" value={row.unit_cost ?? ""} onChange={(e) => set("unit_cost", e.target.value || null)} /></ModalField>
                <ModalField label="GST (₹)"><Input type="number" step="0.01" value={row.gst ?? ""} onChange={(e) => set("gst", e.target.value || null)} /></ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Useful life (years)"><Input type="number" min="1" value={row.useful_life_years ?? ""} onChange={(e) => set("useful_life_years", e.target.value || null)} /></ModalField>
                <ModalField label="Residual value (%)"><Input type="number" step="0.01" min="0" max="100" value={row.residual_value_pct ?? ""} onChange={(e) => set("residual_value_pct", e.target.value || null)} /></ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Spare parts availability"><ChoiceSelect value={row.spare_parts_availability} options={SPARE_PARTS} onChange={(v) => set("spare_parts_availability", v)} /></ModalField>
                <ModalField label="Warranty period"><Input value={row.warranty_period} onChange={(e) => set("warranty_period", e.target.value)} /></ModalField>
              </ModalRow>
            </>
          )}
        />

        {/* Supporting Assets */}
        <NestedListCard<Supporting>
          title="H. Supporting Assets"
          items={supporting}
          onChange={(next) => form.setValue("supporting_assets", next, { shouldDirty: true })}
          emptyRow={{ order: 0, asset: 0, asset_name_other: "", quantity: null, purpose: "", estimated_cost: null }}
          columns={[
            { key: "asset", label: "Asset", render: (v) => (supportingQuery.data?.find((r) => r.id === v)?.label as string) ?? "—" },
            { key: "quantity", label: "Qty" },
            { key: "estimated_cost", label: "Cost (₹)" },
          ]}
          isValid={(row) => row.asset > 0}
          addLabel="Add supporting asset"
          editLabel="Edit supporting asset"
          renderModal={(row, set) => (
            <>
              <ModalField label="Asset *">
                <MasterSelect
                  value={row.asset === 0 ? null : row.asset}
                  options={supportingQuery.data ?? []}
                  onChange={(v) => set("asset", (v ?? 0) as number)}
                />
              </ModalField>
              {supportingQuery.data?.find((r) => r.id === row.asset)?.code === "other" && (
                <ModalField label="Specify name"><Input value={row.asset_name_other} onChange={(e) => set("asset_name_other", e.target.value)} /></ModalField>
              )}
              <ModalField label="Purpose"><Input value={row.purpose} onChange={(e) => set("purpose", e.target.value)} /></ModalField>
              <ModalRow>
                <ModalField label="Quantity"><Input type="number" step="0.01" value={row.quantity ?? ""} onChange={(e) => set("quantity", e.target.value || null)} /></ModalField>
                <ModalField label="Estimated cost (₹)"><Input type="number" step="0.01" value={row.estimated_cost ?? ""} onChange={(e) => set("estimated_cost", e.target.value || null)} /></ModalField>
              </ModalRow>
            </>
          )}
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
            <div className="space-y-1.5"><Label className="text-xs">Specify (Others)</Label><Input {...form.register("statutory_approvals_other")} /></div>
          )}
          <div className="space-y-1.5"><Label className="text-xs">Remarks</Label><Textarea rows={2} {...form.register("statutory_remarks")} /></div>
        </CardContent></Card>
      </div>
    </SectionShell>
  );
}
