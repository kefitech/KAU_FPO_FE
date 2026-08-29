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

import { FieldError } from "./field-error";
import {
  ChoiceSelect,
  MasterSelect,
  ModalField,
  ModalRow,
  NestedListCard,
} from "./nested-list";
import { SectionShell } from "./section-shell";

const YES_NO_UNSURE = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not_sure", label: "Not Sure" },
];
const DEMAND_BASIS = [
  { value: "market_survey", label: "Market Survey" },
  { value: "existing_sales", label: "Existing Sales" },
  { value: "buyer_enquiry", label: "Buyer Enquiry" },
  { value: "secondary_data", label: "Secondary Data" },
  { value: "industry_report", label: "Industry Report" },
  { value: "govt_stats", label: "Government Statistics" },
  { value: "previous_experience", label: "Previous Experience" },
  { value: "other", label: "Others (Specify)" },
];
const PRICING_BASIS = [
  { value: "cost_plus", label: "Cost Plus" },
  { value: "market_price", label: "Market Price" },
  { value: "competitive", label: "Competitive" },
  { value: "govt_support", label: "Govt Support" },
  { value: "contract", label: "Contract" },
  { value: "negotiated", label: "Negotiated" },
  { value: "export", label: "Export" },
  { value: "other", label: "Others" },
];
const PURCHASE_FREQ = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "seasonal", label: "Seasonal" },
  { value: "as_required", label: "As Required" },
];
const COMPETITOR_TYPE = [
  { value: "local", label: "Local" },
  { value: "regional", label: "Regional" },
  { value: "national", label: "National" },
  { value: "international", label: "International" },
];
const MKT_RISK = [
  { value: "price_fluctuation", label: "Price Fluctuation" },
  { value: "market_competition", label: "Market Competition" },
  { value: "consumer_preference", label: "Consumer Preference Change" },
  { value: "transportation", label: "Transportation Constraints" },
  { value: "demand_reduction", label: "Demand Reduction" },
  { value: "quality_issues", label: "Quality Issues" },
  { value: "branding_challenges", label: "Branding Challenges" },
  { value: "other", label: "Others (Specify)" },
];

const ProductSchema = z.object({
  id: z.number().optional(),
  order: z.number(),
  name: z.string(),
  product_category: z.number().nullable(),
  product_type: z.number().nullable(),
  intended_market: z.number().nullable(),
  geographic_market: z.string(),
  proposed_brand_name: z.string(),
  existing_brand_name: z.string(),
  customer_categories: z.array(z.number()),
  proposed_selling_price: z.union([z.string(), z.number()]).nullable(),
  unit_of_sale: z.number().nullable(),
  year1_qty: z.union([z.string(), z.number()]).nullable(),
  year2_qty: z.union([z.string(), z.number()]).nullable(),
  year3_qty: z.union([z.string(), z.number()]).nullable(),
  year4_qty: z.union([z.string(), z.number()]).nullable(),
  year5_qty: z.union([z.string(), z.number()]).nullable(),
});
type Product = z.infer<typeof ProductSchema>;

const BuyerSchema = z.object({
  id: z.number().optional(),
  order: z.number(),
  buyer_name: z.string(),
  buyer_category: z.number().nullable(),
  location: z.string(),
  purchase_frequency: z.string(),
  num_buyers: z.union([z.string(), z.number()]).nullable(),
  credit_period_days: z.union([z.string(), z.number()]).nullable(),
});
type Buyer = z.infer<typeof BuyerSchema>;

const ChannelSchema = z.object({
  id: z.number().optional(),
  channel: z.number(),
  channel_other: z.string(),
  expected_share_pct: z.union([z.string(), z.number()]).nullable(),
  existing_arrangement: z.string(),
  remarks: z.string(),
});
type Channel = z.infer<typeof ChannelSchema>;

const CompetitorSchema = z.object({
  id: z.number().optional(),
  order: z.number(),
  name: z.string(),
  competitor_type: z.string(),
  competitive_advantage: z.string(),
  differentiation_strategy: z.string(),
});
type Competitor = z.infer<typeof CompetitorSchema>;

const MarketRiskSchema = z.object({
  id: z.number().optional(),
  risk_type: z.string(),
  risk_type_other: z.string(),
  mitigation_strategy: z.string(),
});
type MarketRisk = z.infer<typeof MarketRiskSchema>;

const Schema = z.object({
  demand_exists: z.string(),
  estimated_annual_demand: z.union([z.string(), z.number()]).nullable(),
  demand_basis: z.string(),
  demand_basis_other: z.string(),
  has_existing_buyers: z.boolean(),
  pricing_basis: z.string(),
  pricing_basis_other: z.string(),
  credit_sales_pct: z.union([z.string(), z.number()]).nullable(),
  cash_sales_pct: z.union([z.string(), z.number()]).nullable(),
  has_competitors: z.string(),
  is_branded: z.boolean(),
  brand_name: z.string(),
  existing_brand_name: z.string(),
  promotional_activities: z.array(z.number()),
  packaging_strategy: z.string(),
  website: z.string(),
  social_media_presence: z.string(),
  products: z.array(ProductSchema),
  buyers: z.array(BuyerSchema),
  channel_selections: z.array(ChannelSchema),
  competitors: z.array(CompetitorSchema),
  risks: z.array(MarketRiskSchema),
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
    estimated_annual_demand: toDec(v.estimated_annual_demand),
    credit_sales_pct: toDec(v.credit_sales_pct),
    cash_sales_pct: toDec(v.cash_sales_pct),
    products: v.products.map((p, i) => ({
      ...p, order: i,
      proposed_selling_price: toDec(p.proposed_selling_price),
      year1_qty: toDec(p.year1_qty), year2_qty: toDec(p.year2_qty),
      year3_qty: toDec(p.year3_qty), year4_qty: toDec(p.year4_qty), year5_qty: toDec(p.year5_qty),
    })),
    buyers: v.buyers.map((b, i) => ({ ...b, order: i, num_buyers: toInt(b.num_buyers), credit_period_days: toInt(b.credit_period_days) })),
    channel_selections: v.channel_selections.map((c) => ({ ...c, expected_share_pct: toDec(c.expected_share_pct) })),
    competitors: v.competitors.map((c, i) => ({ ...c, order: i })),
  };
}

export function MarketSection({ uuid }: { uuid: string }) {
  const productCatQ = useQuery({ queryKey: ["dpr-master", "product-categories"], queryFn: () => dprMasterApi.list("product-categories"), staleTime: 24 * 60 * 60 * 1000 });
  const productTypeQ = useQuery({ queryKey: ["dpr-master", "product-types"], queryFn: () => dprMasterApi.list("product-types"), staleTime: 24 * 60 * 60 * 1000 });
  const intendedMarketQ = useQuery({ queryKey: ["dpr-master", "intended-markets"], queryFn: () => dprMasterApi.list("intended-markets"), staleTime: 24 * 60 * 60 * 1000 });
  const customerCatQ = useQuery({ queryKey: ["dpr-master", "customer-categories"], queryFn: () => dprMasterApi.list("customer-categories"), staleTime: 24 * 60 * 60 * 1000 });
  const buyerTypeQ = useQuery({ queryKey: ["dpr-master", "buyer-types"], queryFn: () => dprMasterApi.list("buyer-types"), staleTime: 24 * 60 * 60 * 1000 });
  const channelQ = useQuery({ queryKey: ["dpr-master", "marketing-channels"], queryFn: () => dprMasterApi.list("marketing-channels"), staleTime: 24 * 60 * 60 * 1000 });
  const promoQ = useQuery({ queryKey: ["dpr-master", "promotional-activities"], queryFn: () => dprMasterApi.list("promotional-activities"), staleTime: 24 * 60 * 60 * 1000 });
  const unitQ = useQuery({ queryKey: ["dpr-master", "capacity-units"], queryFn: () => dprMasterApi.list("capacity-units"), staleTime: 24 * 60 * 60 * 1000 });

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, fieldErrors, fieldWarnings, save, discard } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "market",
    schema: Schema,
    defaultValues: {
      demand_exists: "", estimated_annual_demand: null, demand_basis: "", demand_basis_other: "",
      has_existing_buyers: false,
      pricing_basis: "", pricing_basis_other: "",
      credit_sales_pct: null, cash_sales_pct: null,
      has_competitors: "",
      is_branded: false, brand_name: "", existing_brand_name: "",
      promotional_activities: [], packaging_strategy: "",
      website: "", social_media_presence: "",
      products: [], buyers: [], channel_selections: [], competitors: [], risks: [],
    },
    serializePayload,
  });

  // useWatch — reactive subscriptions that reliably re-render after form.reset()
  // from server data. See use-dpr-section-form.ts notes.
  const products = useWatch({ control: form.control, name: "products" }) ?? [];
  const buyers = useWatch({ control: form.control, name: "buyers" }) ?? [];
  const channels = useWatch({ control: form.control, name: "channel_selections" }) ?? [];
  const competitors = useWatch({ control: form.control, name: "competitors" }) ?? [];
  const risks = useWatch({ control: form.control, name: "risks" }) ?? [];
  const promotional = useWatch({ control: form.control, name: "promotional_activities" }) ?? [];
  const demandExists = useWatch({ control: form.control, name: "demand_exists" });
  const demandBasis = useWatch({ control: form.control, name: "demand_basis" });
  const pricingBasis = useWatch({ control: form.control, name: "pricing_basis" });
  const hasCompetitors = useWatch({ control: form.control, name: "has_competitors" });
  const isBranded = useWatch({ control: form.control, name: "is_branded" });

  // Live share-total for D. Marketing Channels — updates instantly as the user
  // adds/edits rows, so they don't need to wait for the backend readiness fetch.
  // Falls back to the server-side warning when the list is empty (nothing to sum).
  const channelTotal = channels.reduce((sum, c) => {
    const n = c.expected_share_pct === null || c.expected_share_pct === "" ? 0 : Number(c.expected_share_pct);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  const channelLocalWarning =
    channels.length > 0 && Math.abs(channelTotal - 100) > 0.01
      ? `Expected share across channels totals ${channelTotal.toFixed(2)}% — should ideally sum to 100%.`
      : undefined;

  const togglePromo = (id: number, checked: boolean) => {
    const cur = form.getValues("promotional_activities") ?? [];
    form.setValue("promotional_activities", checked ? [...cur, id] : cur.filter((i) => i !== id), { shouldDirty: true });
  };

  const loading = isLoading || productCatQ.isLoading || productTypeQ.isLoading || intendedMarketQ.isLoading;

  const EMPTY_PRODUCT: Product = {
    order: 0, name: "", product_category: null, product_type: null,
    intended_market: null, geographic_market: "", proposed_brand_name: "", existing_brand_name: "",
    customer_categories: [], proposed_selling_price: null, unit_of_sale: null,
    year1_qty: null, year2_qty: null, year3_qty: null, year4_qty: null, year5_qty: null,
  };

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="market"
      loading={loading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
    >
      <div className="space-y-4">
        {/* Products (A + H) */}
        <NestedListCard<Product>
          title="A + H. Products / Services & Sales Projection"
          items={products}
          onChange={(next) => form.setValue("products", next, { shouldDirty: true })}
          emptyRow={EMPTY_PRODUCT}
          columns={[
            { key: "name", label: "Product" },
            { key: "year1_qty", label: "Yr1 qty" },
            { key: "proposed_selling_price", label: "Price/unit (₹)" },
          ]}
          isValid={(row) => row.name.trim().length > 0}
          addLabel="Add product"
          editLabel="Edit product"
          error={fieldErrors.get("products")}
          warning={fieldWarnings.get("products")}
          renderModal={(row, set) => (
            <>
              <ModalField label="Product name *"><Input value={row.name} onChange={(e) => set("name", e.target.value)} /></ModalField>
              <ModalRow>
                <ModalField label="Category"><MasterSelect value={row.product_category} options={productCatQ.data ?? []} onChange={(v) => set("product_category", v)} /></ModalField>
                <ModalField label="Product type"><MasterSelect value={row.product_type} options={productTypeQ.data ?? []} onChange={(v) => set("product_type", v)} /></ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Intended market"><MasterSelect value={row.intended_market} options={intendedMarketQ.data ?? []} onChange={(v) => set("intended_market", v)} /></ModalField>
                <ModalField label="Geographic market"><Input value={row.geographic_market} onChange={(e) => set("geographic_market", e.target.value)} /></ModalField>
              </ModalRow>
              <div>
                <Label className="text-xs">Customer categories</Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {(customerCatQ.data ?? []).map((cc) => (
                    <label key={cc.id} className="flex cursor-pointer items-center gap-2 text-xs">
                      <Checkbox checked={row.customer_categories.includes(cc.id)} onCheckedChange={(c) => set("customer_categories", (c ? [...row.customer_categories, cc.id] : row.customer_categories.filter((i) => i !== cc.id)) as number[])} />
                      {cc.label}
                    </label>
                  ))}
                </div>
              </div>
              <ModalRow>
                <ModalField label="Proposed brand name"><Input value={row.proposed_brand_name} onChange={(e) => set("proposed_brand_name", e.target.value)} /></ModalField>
                <ModalField label="Existing brand name"><Input value={row.existing_brand_name} onChange={(e) => set("existing_brand_name", e.target.value)} /></ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Proposed selling price / unit (₹)"><Input type="number" step="0.01" value={row.proposed_selling_price ?? ""} onChange={(e) => set("proposed_selling_price", e.target.value || null)} /></ModalField>
                <ModalField label="Unit of sale"><MasterSelect value={row.unit_of_sale} options={unitQ.data ?? []} onChange={(v) => set("unit_of_sale", v)} /></ModalField>
              </ModalRow>
              <div>
                <Label className="text-xs">Sales projection (Yr 1-5)</Label>
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {(["year1_qty","year2_qty","year3_qty","year4_qty","year5_qty"] as const).map((k, i) => (
                    <div key={k}>
                      <Label className="text-[10px] text-muted-foreground">Yr {i + 1}</Label>
                      <Input type="number" step="0.001" value={row[k] ?? ""} onChange={(e) => set(k, (e.target.value || null) as Product[typeof k])} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        />

        {/* B. Market Demand */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">B. Market Demand</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label className="text-xs">Existing demand *</Label><ChoiceSelect value={demandExists ?? ""} options={YES_NO_UNSURE} onChange={(v) => form.setValue("demand_exists", v, { shouldDirty: true })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Estimated annual demand</Label><Input type="number" step="0.01" {...form.register("estimated_annual_demand")} /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Basis of demand estimation</Label><ChoiceSelect value={demandBasis ?? ""} options={DEMAND_BASIS} onChange={(v) => form.setValue("demand_basis", v, { shouldDirty: true })} /></div>
          {demandBasis === "other" && <div className="space-y-1.5"><Label className="text-xs">Specify</Label><Input {...form.register("demand_basis_other")} /></div>}
        </CardContent></Card>

        {/* C. Buyers */}
        <NestedListCard<Buyer>
          title="C. Existing Buyers"
          items={buyers}
          onChange={(next) => form.setValue("buyers", next, { shouldDirty: true })}
          emptyRow={{ order: 0, buyer_name: "", buyer_category: null, location: "", purchase_frequency: "", num_buyers: null, credit_period_days: null }}
          columns={[
            { key: "buyer_name", label: "Buyer" },
            { key: "buyer_category", label: "Category", render: (v) => (buyerTypeQ.data?.find((r) => r.id === v)?.label as string) ?? "—" },
            { key: "location", label: "Location" },
          ]}
          isValid={() => true}
          addLabel="Add buyer"
          editLabel="Edit buyer"
          renderModal={(row, set) => (
            <>
              <ModalRow>
                <ModalField label="Buyer name"><Input value={row.buyer_name} onChange={(e) => set("buyer_name", e.target.value)} /></ModalField>
                <ModalField label="Buyer category *"><MasterSelect value={row.buyer_category} options={buyerTypeQ.data ?? []} onChange={(v) => set("buyer_category", v)} /></ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Location"><Input value={row.location} onChange={(e) => set("location", e.target.value)} /></ModalField>
                <ModalField label="Purchase frequency"><ChoiceSelect value={row.purchase_frequency} options={PURCHASE_FREQ} onChange={(v) => set("purchase_frequency", v)} /></ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Number of buyers"><Input type="number" min="0" value={row.num_buyers ?? ""} onChange={(e) => set("num_buyers", e.target.value || null)} /></ModalField>
                <ModalField label="Credit period (days)"><Input type="number" min="0" value={row.credit_period_days ?? ""} onChange={(e) => set("credit_period_days", e.target.value || null)} /></ModalField>
              </ModalRow>
            </>
          )}
        />

        {/* D. Channels */}
        <NestedListCard<Channel>
          title={`D. Proposed Marketing Channels${channels.length > 0 ? ` — Total: ${channelTotal.toFixed(2)}%` : ""}`}
          items={channels}
          onChange={(next) => form.setValue("channel_selections", next, { shouldDirty: true })}
          emptyRow={{ channel: 0, channel_other: "", expected_share_pct: null, existing_arrangement: "", remarks: "" }}
          columns={[
            { key: "channel", label: "Channel", render: (v) => (channelQ.data?.find((r) => r.id === v)?.label as string) ?? "—" },
            { key: "expected_share_pct", label: "Share %" },
          ]}
          isValid={(row) => row.channel > 0}
          addLabel="Add channel"
          editLabel="Edit channel"
          error={fieldErrors.get("channel_selections")}
          warning={channelLocalWarning ?? fieldWarnings.get("channel_selections")}
          renderModal={(row, set) => (
            <>
              <ModalField label="Channel *"><MasterSelect value={row.channel === 0 ? null : row.channel} options={channelQ.data ?? []} onChange={(v) => set("channel", (v ?? 0) as number)} /></ModalField>
              {channelQ.data?.find((r) => r.id === row.channel)?.code === "other" && (
                <ModalField label="Specify"><Input value={row.channel_other} onChange={(e) => set("channel_other", e.target.value)} /></ModalField>
              )}
              <ModalField label="Expected share of sales (%)"><Input type="number" step="0.01" min="0" max="100" value={row.expected_share_pct ?? ""} onChange={(e) => set("expected_share_pct", e.target.value || null)} /></ModalField>
              <ModalField label="Existing arrangement"><Textarea rows={2} value={row.existing_arrangement} onChange={(e) => set("existing_arrangement", e.target.value)} /></ModalField>
              <ModalField label="Remarks"><Textarea rows={2} value={row.remarks} onChange={(e) => set("remarks", e.target.value)} /></ModalField>
            </>
          )}
        />

        {/* E. Pricing Strategy (section-level) */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">E. Pricing Strategy</h3>
          <div className="space-y-1.5">
            <Label className={`text-xs ${fieldErrors.has("pricing_basis") ? "text-destructive" : ""}`}>Basis of pricing</Label>
            <ChoiceSelect value={pricingBasis ?? ""} options={PRICING_BASIS} onChange={(v) => form.setValue("pricing_basis", v, { shouldDirty: true })} />
            <FieldError name="pricing_basis" errors={fieldErrors} warnings={fieldWarnings} />
          </div>
          {pricingBasis === "other" && <div className="space-y-1.5"><Label className="text-xs">Specify</Label><Input {...form.register("pricing_basis_other")} /></div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label className="text-xs">Credit sales (%)</Label><Input type="number" step="0.01" min="0" max="100" {...form.register("credit_sales_pct")} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Cash sales (%)</Label><Input type="number" step="0.01" min="0" max="100" {...form.register("cash_sales_pct")} /></div>
          </div>
        </CardContent></Card>

        {/* F. Competition */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">F. Competition Assessment</h3>
          <div className="space-y-1.5"><Label className="text-xs">Existing competitors</Label><ChoiceSelect value={hasCompetitors ?? ""} options={YES_NO_UNSURE} onChange={(v) => form.setValue("has_competitors", v, { shouldDirty: true })} /></div>
        </CardContent></Card>
        {hasCompetitors === "yes" && (
          <NestedListCard<Competitor>
            title="F. Competitors"
            items={competitors}
            onChange={(next) => form.setValue("competitors", next, { shouldDirty: true })}
            emptyRow={{ order: 0, name: "", competitor_type: "", competitive_advantage: "", differentiation_strategy: "" }}
            columns={[
              { key: "name", label: "Competitor" },
              { key: "competitor_type", label: "Type", render: (v) => COMPETITOR_TYPE.find((o) => o.value === v)?.label ?? "—" },
            ]}
            isValid={(row) => row.name.trim().length > 0 && row.competitive_advantage.trim().length > 0}
            addLabel="Add competitor"
            editLabel="Edit competitor"
            renderModal={(row, set) => (
              <>
                <ModalRow>
                  <ModalField label="Name *"><Input value={row.name} onChange={(e) => set("name", e.target.value)} /></ModalField>
                  <ModalField label="Type"><ChoiceSelect value={row.competitor_type} options={COMPETITOR_TYPE} onChange={(v) => set("competitor_type", v)} /></ModalField>
                </ModalRow>
                <ModalField label="Our competitive advantage *"><Textarea rows={2} value={row.competitive_advantage} onChange={(e) => set("competitive_advantage", e.target.value)} /></ModalField>
                <ModalField label="Differentiation strategy"><Textarea rows={2} value={row.differentiation_strategy} onChange={(e) => set("differentiation_strategy", e.target.value)} /></ModalField>
              </>
            )}
          />
        )}

        {/* G. Branding & Promotion */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">G. Branding & Promotion</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={isBranded} onCheckedChange={(c) => form.setValue("is_branded", !!c, { shouldDirty: true })} />
            Products will be marketed under a brand
          </label>
          {isBranded && (
            <div className="space-y-3 border-l-2 border-primary/30 pl-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label className="text-xs">Brand name *</Label><Input {...form.register("brand_name")} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Existing brand name</Label><Input {...form.register("existing_brand_name")} /></div>
              </div>
              <div>
                <Label className="text-xs">Proposed promotional activities</Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {(promoQ.data ?? []).map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox checked={promotional.includes(p.id)} onCheckedChange={(c) => togglePromo(p.id, !!c)} />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Packaging strategy</Label><Textarea rows={2} {...form.register("packaging_strategy")} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label className="text-xs">Website</Label><Input type="url" placeholder="https://…" {...form.register("website")} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Social media presence</Label><Input {...form.register("social_media_presence")} /></div>
              </div>
            </div>
          )}
        </CardContent></Card>

        {/* I. Marketing Risks */}
        <NestedListCard<MarketRisk>
          title="I. Marketing Risks"
          items={risks}
          onChange={(next) => form.setValue("risks", next, { shouldDirty: true })}
          emptyRow={{ risk_type: "", risk_type_other: "", mitigation_strategy: "" }}
          columns={[
            { key: "risk_type", label: "Risk", render: (v) => MKT_RISK.find((o) => o.value === v)?.label ?? "—" },
            { key: "mitigation_strategy", label: "Mitigation", render: (v) => ((v as string)?.slice(0, 40) ?? "") + ((v as string)?.length > 40 ? "…" : "") },
          ]}
          isValid={(row) => !!row.risk_type && row.mitigation_strategy.trim().length > 0}
          addLabel="Add risk"
          editLabel="Edit risk"
          error={fieldErrors.get("risks")}
          warning={fieldWarnings.get("risks")}
          renderModal={(row, set) => (
            <>
              <ModalField label="Risk *"><ChoiceSelect value={row.risk_type} options={MKT_RISK} onChange={(v) => set("risk_type", v)} /></ModalField>
              {row.risk_type === "other" && <ModalField label="Specify"><Input value={row.risk_type_other} onChange={(e) => set("risk_type_other", e.target.value)} /></ModalField>}
              <ModalField label="Mitigation strategy *"><Textarea rows={3} value={row.mitigation_strategy} onChange={(e) => set("mitigation_strategy", e.target.value)} /></ModalField>
            </>
          )}
        />
      </div>
    </SectionShell>
  );
}
