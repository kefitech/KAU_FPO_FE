"use client";

import { useQuery } from "@tanstack/react-query";
import { useWatch } from "react-hook-form";
import { z } from "zod";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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

// ── Types & schema ────────────────────────────────────────────────────────

const ProductItemSchema = z.object({
  id: z.number().optional(),
  order: z.number(),
  name: z.string(),
  category: z.number().nullable(),
  primary_or_secondary: z.string(),
  product_type: z.number().nullable(),
  unit_of_measurement: z.number().nullable(),
  annual_quantity: z.union([z.string(), z.number()]).nullable(),
  selling_unit: z.number().nullable(),
  selling_price_per_unit: z.union([z.string(), z.number()]).nullable(),
  is_value_added: z.boolean(),
  description: z.string(),
});
type ProductItem = z.infer<typeof ProductItemSchema>;

const Schema = z.object({
  items: z.array(ProductItemSchema),
});
type Data = z.infer<typeof Schema>;

const EMPTY_ITEM: ProductItem = {
  order: 0,
  name: "",
  category: null,
  primary_or_secondary: "",
  product_type: null,
  unit_of_measurement: null,
  annual_quantity: null,
  selling_unit: null,
  selling_price_per_unit: null,
  is_value_added: false,
  description: "",
};

const PRIMARY_SECONDARY_OPTIONS = [
  { value: "primary", label: "Primary Product" },
  { value: "secondary", label: "Secondary Product" },
];

function toDecimalString(v: string | number | null): string | null {
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? String(n) : null;
}

function serializePayload(v: Data): Record<string, unknown> {
  return {
    items: v.items.map((it, idx) => ({
      ...it,
      order: idx,
      annual_quantity: toDecimalString(it.annual_quantity),
      selling_price_per_unit: toDecimalString(it.selling_price_per_unit),
    })),
  };
}

// ── Section component ─────────────────────────────────────────────────────

export function ProductsSection({ uuid }: { uuid: string }) {
  const {
    form,
    isLoading,
    isDirty,
    isSaving,
    lastSavedAt,
    saveError,
    save,
    discard,
  } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "products",
    schema: Schema,
    defaultValues: { items: [] },
    serializePayload,
  });

  // Use `useWatch` (not `form.watch`) — reliable reactive subscription so the
  // table re-renders when server data hydrates the form.
  const items = useWatch({ control: form.control, name: "items" }) ?? [];

  // Master dropdowns — cached 24h on the client
  const categoryQuery = useQuery({
    queryKey: ["dpr-master", "product-categories"],
    queryFn: () => dprMasterApi.list("product-categories"),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const productTypeQuery = useQuery({
    queryKey: ["dpr-master", "product-types"],
    queryFn: () => dprMasterApi.list("product-types"),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const unitQuery = useQuery({
    queryKey: ["dpr-master", "capacity-units"],
    queryFn: () => dprMasterApi.list("capacity-units"),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const labelOf = (
    list: { id: number; label: string }[] | undefined,
    id: number | null,
  ) => (id !== null && list?.find((r) => r.id === id)?.label) || "—";

  function handleChange(next: ProductItem[]) {
    form.setValue("items", next, { shouldDirty: true });
  }

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="products"
      loading={isLoading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
    >
      <NestedListCard<ProductItem>
        title="Products & Services"
        items={items}
        onChange={handleChange}
        emptyRow={EMPTY_ITEM}
        addLabel="Add product"
        editLabel="Edit product"
        emptyHint="No products yet. Click Add product to start."
        isValid={(row) => row.name.trim().length > 0}
        columns={[
          { key: "name", label: "Name" },
          {
            key: "category",
            label: "Category",
            render: (v) => labelOf(categoryQuery.data, v as number | null),
          },
          {
            key: "annual_quantity",
            label: "Qty / yr",
            render: (v, row) => {
              const qty = v ?? "—";
              const unit = labelOf(unitQuery.data, row.unit_of_measurement);
              return unit === "—" ? String(qty) : `${qty} ${unit}`;
            },
          },
          {
            key: "selling_price_per_unit",
            label: "Price (₹)",
            render: (v, row) => {
              const p = v ?? "—";
              const su = labelOf(unitQuery.data, row.selling_unit);
              return su === "—" ? String(p) : `${p} / ${su}`;
            },
          },
        ]}
        renderModal={(row, set) => (
          <>
            <ModalField label="Product / service name *">
              <Input
                value={row.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Basmati Rice — Premium"
              />
            </ModalField>

            <ModalRow>
              <ModalField label="Category">
                <MasterSelect
                  value={row.category}
                  options={categoryQuery.data ?? []}
                  onChange={(v) => set("category", v)}
                  placeholder="Select category"
                />
              </ModalField>
              <ModalField label="Primary / Secondary">
                <ChoiceSelect
                  value={row.primary_or_secondary}
                  options={PRIMARY_SECONDARY_OPTIONS}
                  onChange={(v) => set("primary_or_secondary", v)}
                  placeholder="Select"
                />
              </ModalField>
            </ModalRow>

            <ModalRow>
              <ModalField label="Product type">
                <MasterSelect
                  value={row.product_type}
                  options={productTypeQuery.data ?? []}
                  onChange={(v) => set("product_type", v)}
                  placeholder="Finished / Intermediate / By-product / Service"
                />
              </ModalField>
              <ModalField label="Value-added product">
                <label className="flex h-9 cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={row.is_value_added}
                    onCheckedChange={(c) => set("is_value_added", !!c)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {row.is_value_added ? "Yes" : "No"}
                  </span>
                </label>
              </ModalField>
            </ModalRow>

            <ModalRow>
              <ModalField label="Annual quantity">
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={row.annual_quantity !== null ? String(row.annual_quantity) : ""}
                  onChange={(e) =>
                    set(
                      "annual_quantity",
                      e.target.value === "" ? null : e.target.value,
                    )
                  }
                />
              </ModalField>
              <ModalField label="Unit of measurement">
                <MasterSelect
                  value={row.unit_of_measurement}
                  options={unitQuery.data ?? []}
                  onChange={(v) => set("unit_of_measurement", v)}
                  placeholder="e.g. kg, MT, Litres"
                />
              </ModalField>
            </ModalRow>

            <ModalRow>
              <ModalField label="Selling price per unit (₹)">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={
                    row.selling_price_per_unit !== null
                      ? String(row.selling_price_per_unit)
                      : ""
                  }
                  onChange={(e) =>
                    set(
                      "selling_price_per_unit",
                      e.target.value === "" ? null : e.target.value,
                    )
                  }
                />
              </ModalField>
              <ModalField label="Selling unit">
                <MasterSelect
                  value={row.selling_unit}
                  options={unitQuery.data ?? []}
                  onChange={(v) => set("selling_unit", v)}
                  placeholder="e.g. kg, box, packet"
                />
              </ModalField>
            </ModalRow>

            <ModalField label="Brief description">
              <Textarea
                rows={2}
                value={row.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Optional notes about this product…"
              />
            </ModalField>
          </>
        )}
      />
    </SectionShell>
  );
}
