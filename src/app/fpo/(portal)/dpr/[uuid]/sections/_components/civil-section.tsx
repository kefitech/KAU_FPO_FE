"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useDprSectionForm } from "@/hooks/use-dpr-section-form";
import { dprMasterApi } from "@/lib/api/dpr-master";

import { SectionShell } from "./section-shell";

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
  category: z.number(),
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

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, save, discard } = useDprSectionForm<Data>({
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
    >
      <div className="space-y-4">
        {/* A. Existing Buildings */}
        <NestedListCard<ExistingBuilding>
          title="A. Existing Buildings"
          items={existing}
          onChange={(next) => form.setValue("existing_buildings", next, { shouldDirty: true })}
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
          renderModal={(row, set) => (
            <>
              <ModalField label="Building name *">
                <Input value={row.building_name} onChange={(e) => set("building_name", e.target.value)} />
              </ModalField>
              <ModalField label="Purpose">
                <Input value={row.purpose} onChange={(e) => set("purpose", e.target.value)} />
              </ModalField>
              <ModalRow>
                <ModalField label="Floor area">
                  <Input type="number" step="0.01" value={row.floor_area ?? ""} onChange={(e) => set("floor_area", e.target.value || null)} />
                </ModalField>
                <ModalField label="Area unit">
                  <ChoiceSelect value={row.area_unit} options={AREA_UNITS} onChange={(v) => set("area_unit", v)} />
                </ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Present condition">
                  <Input value={row.present_condition} onChange={(e) => set("present_condition", e.target.value)} />
                </ModalField>
                <ModalField label="Ownership status">
                  <ChoiceSelect value={row.ownership_status} options={OWNERSHIP_CHOICES} onChange={(v) => set("ownership_status", v)} />
                </ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Proposed action">
                  <ChoiceSelect value={row.proposed_action} options={PROPOSED_ACTIONS} onChange={(v) => set("proposed_action", v)} />
                </ModalField>
                <ModalField label="Year of construction">
                  <Input type="number" min="1900" value={row.year_of_construction ?? ""} onChange={(e) => set("year_of_construction", e.target.value || null)} />
                </ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Number of floors">
                  <Input type="number" min="1" value={row.num_floors ?? ""} onChange={(e) => set("num_floors", e.target.value || null)} />
                </ModalField>
                <ModalField label="Current utilisation">
                  <Input value={row.current_utilisation} onChange={(e) => set("current_utilisation", e.target.value)} />
                </ModalField>
              </ModalRow>
            </>
          )}
          isValid={(row) => row.building_name.trim().length > 0}
          addLabel="Add existing building"
          editLabel="Edit existing building"
        />

        {/* B. Proposed Buildings */}
        <NestedListCard<ProposedBuilding>
          title="B. Proposed Buildings"
          items={proposed}
          onChange={(next) => form.setValue("proposed_buildings", next, { shouldDirty: true })}
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
          renderModal={(row, set) => (
            <>
              <ModalField label="Building type *">
                <MasterSelect
                  value={row.building_type}
                  options={buildingTypeQuery.data ?? []}
                  onChange={(v) => set("building_type", v)}
                />
              </ModalField>
              <ModalField label="Purpose">
                <Input value={row.purpose} onChange={(e) => set("purpose", e.target.value)} />
              </ModalField>
              <ModalRow>
                <ModalField label="Floor area">
                  <Input type="number" step="0.01" value={row.floor_area ?? ""} onChange={(e) => set("floor_area", e.target.value || null)} />
                </ModalField>
                <ModalField label="Area unit">
                  <ChoiceSelect value={row.area_unit} options={AREA_UNITS} onChange={(v) => set("area_unit", v)} />
                </ModalField>
              </ModalRow>
              <ModalField label="Proposed location within site">
                <Input value={row.proposed_location_within_site} onChange={(e) => set("proposed_location_within_site", e.target.value)} />
              </ModalField>
              <ModalRow>
                <ModalField label="Number of floors">
                  <Input type="number" min="1" value={row.num_floors ?? ""} onChange={(e) => set("num_floors", e.target.value || null)} />
                </ModalField>
                <ModalField label="Estimated construction cost (₹)">
                  <Input type="number" step="0.01" min="0" value={row.estimated_construction_cost ?? ""} onChange={(e) => set("estimated_construction_cost", e.target.value || null)} />
                </ModalField>
              </ModalRow>
              <ModalField label="Estimated completion period">
                <Input placeholder="e.g. 6 months" value={row.estimated_completion_period} onChange={(e) => set("estimated_completion_period", e.target.value)} />
              </ModalField>
            </>
          )}
          isValid={(row) => row.building_type !== null}
          addLabel="Add proposed building"
          editLabel="Edit proposed building"
        />

        {/* C. Site Development */}
        <NestedListCard<SiteDevItem>
          title="C. Site Development Works"
          items={siteDev}
          onChange={(next) => form.setValue("site_development_items", next, { shouldDirty: true })}
          emptyRow={{
            order: 0, category: 0, category_other: "", estimated_quantity: "",
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
          renderModal={(row, set) => (
            <>
              <ModalField label="Category *">
                <MasterSelect
                  value={row.category === 0 ? null : row.category}
                  options={civilCategoryQuery.data ?? []}
                  onChange={(v) => set("category", (v ?? 0) as number)}
                />
              </ModalField>
              {civilCategoryQuery.data?.find((r) => r.id === row.category)?.code === "other" && (
                <ModalField label="Specify (Others)">
                  <Input value={row.category_other} onChange={(e) => set("category_other", e.target.value)} />
                </ModalField>
              )}
              <ModalRow>
                <ModalField label="Estimated quantity">
                  <Input placeholder='e.g. 500 m' value={row.estimated_quantity} onChange={(e) => set("estimated_quantity", e.target.value)} />
                </ModalField>
                <ModalField label="Estimated cost (₹)">
                  <Input type="number" step="0.01" min="0" value={row.estimated_cost ?? ""} onChange={(e) => set("estimated_cost", e.target.value || null)} />
                </ModalField>
              </ModalRow>
              <ModalField label="Remarks">
                <Textarea rows={2} value={row.remarks} onChange={(e) => set("remarks", e.target.value)} />
              </ModalField>
            </>
          )}
          isValid={(row) => row.category > 0}
          addLabel="Add site development work"
          editLabel="Edit site development work"
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
                  {[
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
                  ].map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-xs">{label} (₹)</Label>
                      <Input type="number" step="0.01" min="0" {...form.register(key as keyof Data)} />
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label>Basis of cost estimation</Label>
                  <ChoiceSelect
                    value={basisOfEstimate ?? ""}
                    options={COST_BASIS}
                    onChange={(v) => form.setValue("basis_of_estimate", v, { shouldDirty: true })}
                  />
                </div>
                {basisOfEstimate === "other" && (
                  <div className="space-y-1.5">
                    <Label>Specify (Others)</Label>
                    <Input {...form.register("basis_of_estimate_other")} />
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
                  <Input {...form.register("space_reserved_for_expansion")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Future buildings planned</Label>
                  <Textarea rows={2} {...form.register("future_buildings_planned")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Future civil works required</Label>
                  <Textarea rows={2} {...form.register("future_civil_works_required")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Estimated future investment (₹)</Label>
                  <Input type="number" step="0.01" min="0" {...form.register("estimated_future_investment")} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SectionShell>
  );
}

// ── Reusable nested-list card + modal ──────────────────────────────────────

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

function NestedListCard<T extends { id?: number }>({
  title,
  items,
  onChange,
  emptyRow,
  columns,
  renderModal,
  isValid,
  addLabel,
  editLabel,
}: {
  title: string;
  items: T[];
  onChange: (next: T[]) => void;
  emptyRow: T;
  columns: Column<T>[];
  renderModal: (row: T, set: <K extends keyof T>(k: K, v: T[K]) => void) => React.ReactNode;
  isValid: (row: T) => boolean;
  addLabel: string;
  editLabel: string;
}) {
  const [editing, setEditing] = useState<{ index: number; row: T } | null>(null);

  function openAdd() {
    setEditing({ index: items.length, row: { ...emptyRow } });
  }
  function openEdit(idx: number) {
    setEditing({ index: idx, row: { ...items[idx] } });
  }
  function commit(row: T) {
    if (!editing) return;
    const next = [...items];
    if (editing.index >= items.length) next.push(row);
    else next[editing.index] = row;
    onChange(next);
    setEditing(null);
  }
  function deleteAt(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{title}</h3>
            <Button size="sm" onClick={openAdd}>
              <Plus className="mr-1 h-4 w-4" /> {addLabel}
            </Button>
          </div>
          {items.length === 0 ? (
            <div className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
              No items yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  {columns.map((c) => <TableHead key={String(c.key)}>{c.label}</TableHead>)}
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row, idx) => (
                  <TableRow key={row.id ?? `new-${idx}`}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    {columns.map((c) => {
                      const val = row[c.key];
                      const rendered = c.render ? c.render(val, row) : (val ?? "—");
                      return (
                        <TableCell key={String(c.key)} className="text-sm">
                          {rendered as React.ReactNode}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(idx)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteAt(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editing && (
        <RowModal
          title={editing.index >= items.length ? addLabel : editLabel}
          initial={editing.row}
          isValid={isValid}
          renderFields={renderModal}
          onCancel={() => setEditing(null)}
          onSave={commit}
        />
      )}
    </>
  );
}

function RowModal<T>({
  title,
  initial,
  isValid,
  renderFields,
  onCancel,
  onSave,
}: {
  title: string;
  initial: T;
  isValid: (row: T) => boolean;
  renderFields: (row: T, set: <K extends keyof T>(k: K, v: T[K]) => void) => React.ReactNode;
  onCancel: () => void;
  onSave: (row: T) => void;
}) {
  const [row, setRow] = useState<T>(initial);
  function set<K extends keyof T>(key: K, value: T[K]) {
    setRow((prev) => ({ ...prev, [key]: value }));
  }
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">{renderFields(row, set)}</div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button disabled={!isValid(row)} onClick={() => onSave(row)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────

function ModalRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}
function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ChoiceSelect({
  value,
  options,
  onChange,
}: {
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value ?? ""} onValueChange={onChange}>
      <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function MasterSelect({
  value,
  options,
  onChange,
}: {
  value: number | null | undefined;
  options: { id: number; label: string }[];
  onChange: (v: number | null) => void;
}) {
  return (
    <Select
      value={value !== null && value !== undefined ? String(value) : ""}
      onValueChange={(v) => onChange(v === "" ? null : Number(v))}
    >
      <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
