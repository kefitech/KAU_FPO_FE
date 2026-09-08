"use client";

import { useQuery } from "@tanstack/react-query";
import { useWatch } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDprSectionForm } from "@/hooks/use-dpr-section-form";
import { dprMasterApi } from "@/lib/api/dpr-master";

import { SearchableSelect } from "@/components/ui/searchable-select";

import { CountedTextarea } from "./counted-textarea";
import {
  normaliseDecimalInput,
  normaliseIntegerInput,
} from "./dpr-input-normalisers";
import {
  MasterSearchableSelect,
  ModalField,
  ModalRow,
  NestedListCard,
} from "./nested-list";
import { PercentSumIndicator, isPercentSumOver } from "./percent-sum-indicator";
import { SectionHelp } from "./section-help";
import { SectionShell } from "./section-shell";

// ── Input caps — mirror backend DPRSectionMarket + nested models ────────
// Text CharField widths from the DPRSectionMarket / nested tables.
const MAX_NAME_CHARS = 200;             // most CharField widths
const MAX_SHORT_CHARS = 100;            // buyer_name, location, geographic_market
const MAX_URL_CHARS = 200;              // website
const MAX_OTHER_TEXT_CHARS = 200;       // demand_basis_other, pricing_basis_other, channel_other, risk_type_other
const MAX_LONG_TEXT_CHARS = 2000;       // TextField defensive cap — existing_arrangement, remarks,
                                        // competitive_advantage, differentiation_strategy,
                                        // packaging_strategy, mitigation_strategy, social_media_presence

// Numeric bounds
const MAX_PCT = 100;
const MAX_QTY = 1_000_000_000;          // 1 billion units — larger than any realistic FPO
const MAX_PRICE_INR = 100_000_000;      // ₹10 crore per unit — very high headroom
const MAX_DEMAND_QTY = 10_000_000_000;  // 10 billion units — annual market demand can be huge
const MAX_BUYERS_GROUP = 100_000;
const MAX_CREDIT_DAYS = 365;

// ── Per-row validator helpers (mirror market_validators.py) ────────────

type ProductErrors = Partial<Record<
  "name" | "product_category" | "product_type" | "intended_market"
  | "geographic_market" | "customer_categories" | "customer_categories_other"
  | "proposed_selling_price" | "unit_of_sale" | "year1_qty"
, string>>;

/**
 * The "other" master row's numeric id — passed through from the parent so
 * the validator can check "does customer_categories include the other id".
 * We can't hardcode a number because master rows are DB-driven.
 */
function validateProduct(
  row: {
    name: string;
    product_category: number | null;
    product_type: number | null;
    intended_market: number | null;
    geographic_market: string;
    customer_categories: number[];
    customer_categories_other: string;
    proposed_selling_price: string | number | null;
    unit_of_sale: number | null;
    year1_qty: string | number | null;
  },
  otherCustomerCategoryId?: number | null,
): ProductErrors {
  const e: ProductErrors = {};
  const gt0 = (v: unknown) => {
    if (v === null || v === undefined || v === "") return false;
    const n = Number(v);
    return Number.isFinite(n) && n > 0;
  };
  if (!(row.name ?? "").trim()) e.name = "Product Name is required.";
  if (!row.product_category) e.product_category = "Product Category is required.";
  if (!row.product_type) e.product_type = "Product Type is required.";
  if (!row.intended_market) e.intended_market = "Intended Market is required.";
  if (!(row.geographic_market ?? "").trim()) e.geographic_market = "Geographic Market shall be specified.";
  if (!row.customer_categories || row.customer_categories.length === 0) {
    e.customer_categories = "At least one customer category shall be selected.";
  }
  // "Others (Specify)" companion — required when the "other" master row is
  // in the M2M. Mirrors backend `customer_categories_other_required` rule.
  if (
    otherCustomerCategoryId != null &&
    row.customer_categories.includes(otherCustomerCategoryId) &&
    !(row.customer_categories_other ?? "").trim()
  ) {
    e.customer_categories_other =
      'Please specify — "Others" was selected in customer categories but no description provided.';
  }
  if (!gt0(row.proposed_selling_price)) {
    e.proposed_selling_price = "Proposed Selling Price shall be greater than zero.";
  }
  if (!row.unit_of_sale) e.unit_of_sale = "Unit of Sale shall be specified.";
  if (!gt0(row.year1_qty)) {
    e.year1_qty = "Expected Sales Quantity - Year 1 shall be greater than zero.";
  }
  return e;
}

function validateBuyer(row: {
  buyer_name: string;
  buyer_category: number | null;
  num_buyers: string | number | null;
  is_group?: boolean;
}) {
  const e: Partial<Record<"buyer_name" | "buyer_category" | "num_buyers", string>> = {};
  const isGroup = row.is_group ?? (Number(row.num_buyers) || 0) > 1;
  if (!isGroup && !(row.buyer_name ?? "").trim()) {
    e.buyer_name = "Buyer name is required for a single named buyer.";
  }
  if (isGroup && !((Number(row.num_buyers) || 0) >= 2)) {
    e.num_buyers = "Group size must be at least 2.";
  }
  if (!row.buyer_category) e.buyer_category = "Buyer Category is required.";
  return e;
}

function validateChannel(row: { channel: number }) {
  const e: Partial<Record<"channel", string>> = {};
  if (!row.channel || row.channel === 0) e.channel = "Channel is required.";
  return e;
}

function validateCompetitor(row: { name: string; competitive_advantage: string }) {
  const e: Partial<Record<"name" | "competitive_advantage", string>> = {};
  if (!(row.name ?? "").trim()) e.name = "Competitor name is required.";
  if (!(row.competitive_advantage ?? "").trim()) {
    e.competitive_advantage = "Competitive Advantage is required for each listed competitor.";
  }
  return e;
}

function validateMarketRisk(row: { risk_type: string; mitigation_strategy: string }) {
  const e: Partial<Record<"risk_type" | "mitigation_strategy", string>> = {};
  if (!row.risk_type) e.risk_type = "Risk type is required.";
  if (!(row.mitigation_strategy ?? "").trim()) {
    e.mitigation_strategy = "Mitigation Strategy is required for each marketing risk.";
  }
  return e;
}

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
  // Companion "Others (Specify)" free-text — populated when the "other"
  // customer category id is present in `customer_categories`. Backend
  // validator requires this to be non-blank in that case.
  customer_categories_other: z.string(),
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
  // Cat C — additional information (optional per KAU spec)
  avg_quantity_purchased: z.union([z.string(), z.number()]).nullable(),
  // Tri-state booleans on backend (BooleanField null=True). null = user
  // hasn't answered, true/false = explicit.
  has_purchase_agreement: z.boolean().nullable(),
  has_contract: z.boolean().nullable(),
  credit_period_days: z.union([z.string(), z.number()]).nullable(),
  // UI-only flag: switches the row between "single named buyer" (num_buyers=1)
  // and "group of similar buyers" (num_buyers>=2). Stripped in serializePayload
  // before sending to the backend — DPRMarketingBuyer table has no is_group
  // column, we derive intent from num_buyers on load.
  is_group: z.boolean().optional(),
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
  // Cat F — additional information (optional per KAU spec)
  num_competitors: z.union([z.string(), z.number()]).nullable(),
  estimated_market_share_pct: z.union([z.string(), z.number()]).nullable(),
  strengths: z.string(),
  weaknesses: z.string(),
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
  // Category B — additional information (optional per KAU spec)
  current_supply: z.union([z.string(), z.number()]).nullable(),
  supply_gap: z.union([z.string(), z.number()]).nullable(),
  expected_demand_growth_pct: z.union([z.string(), z.number()]).nullable(),
  seasonal_demand_pattern: z.string(),
  peak_demand_period: z.string(),
  off_season_demand: z.string(),
  has_existing_buyers: z.boolean(),
  pricing_basis: z.string(),
  pricing_basis_other: z.string(),
  credit_sales_pct: z.union([z.string(), z.number()]).nullable(),
  cash_sales_pct: z.union([z.string(), z.number()]).nullable(),
  // Category E — additional information (optional per KAU spec). Per RCD
  // A.2 + C.6/C.7 these should ideally be AGMARKNET-sourced with a
  // "System Estimated" badge, but must remain user-editable. AGMARKNET
  // integration is a future enhancement; for Phase 1 we ship editable
  // widgets that the FPO can fill directly.
  existing_market_price: z.union([z.string(), z.number()]).nullable(),
  competitor_price: z.union([z.string(), z.number()]).nullable(),
  expected_annual_price_increase_pct: z.union([z.string(), z.number()]).nullable(),
  promotional_pricing_notes: z.string(),
  seasonal_price_variation: z.string(),
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
    // Category B — additional info decimals
    current_supply: toDec(v.current_supply),
    supply_gap: toDec(v.supply_gap),
    expected_demand_growth_pct: toDec(v.expected_demand_growth_pct),
    credit_sales_pct: toDec(v.credit_sales_pct),
    cash_sales_pct: toDec(v.cash_sales_pct),
    existing_market_price: toDec(v.existing_market_price),
    competitor_price: toDec(v.competitor_price),
    expected_annual_price_increase_pct: toDec(v.expected_annual_price_increase_pct),
    products: v.products.map((p, i) => ({
      ...p, order: i,
      proposed_selling_price: toDec(p.proposed_selling_price),
      year1_qty: toDec(p.year1_qty), year2_qty: toDec(p.year2_qty),
      year3_qty: toDec(p.year3_qty), year4_qty: toDec(p.year4_qty), year5_qty: toDec(p.year5_qty),
    })),
    buyers: v.buyers.map((b, i) => {
      // is_group is a UI-only field; strip before sending. When the row is
      // marked as a single named buyer, force num_buyers=1 so the backend
      // never sees an inconsistent state (e.g. buyer_name filled + num_buyers=5).
      const { is_group, ...rest } = b;
      const numBuyers = is_group ? toInt(b.num_buyers) : 1;
      return {
        ...rest,
        order: i,
        num_buyers: numBuyers,
        credit_period_days: toInt(b.credit_period_days),
        avg_quantity_purchased: toDec(b.avg_quantity_purchased),
      };
    }),
    channel_selections: v.channel_selections.map((c) => ({ ...c, expected_share_pct: toDec(c.expected_share_pct) })),
    competitors: v.competitors.map((c, i) => ({
      ...c,
      order: i,
      num_competitors: toInt(c.num_competitors),
      estimated_market_share_pct: toDec(c.estimated_market_share_pct),
    })),
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
      current_supply: null, supply_gap: null, expected_demand_growth_pct: null,
      seasonal_demand_pattern: "", peak_demand_period: "", off_season_demand: "",
      has_existing_buyers: false,
      pricing_basis: "", pricing_basis_other: "",
      credit_sales_pct: null, cash_sales_pct: null,
      existing_market_price: null, competitor_price: null,
      expected_annual_price_increase_pct: null,
      promotional_pricing_notes: "", seasonal_price_variation: "",
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
  const creditPct = useWatch({ control: form.control, name: "credit_sales_pct" });
  const cashPct = useWatch({ control: form.control, name: "cash_sales_pct" });
  // Section-level card values — converted from register() to controlled so
  // Save button + autosave fire reliably on every keystroke (same fix as
  // location-section F3).
  const estimatedAnnualDemand = useWatch({ control: form.control, name: "estimated_annual_demand" });
  const demandBasisOther = useWatch({ control: form.control, name: "demand_basis_other" }) ?? "";
  // Category B — additional info (optional per KAU spec)
  const currentSupply = useWatch({ control: form.control, name: "current_supply" });
  const supplyGap = useWatch({ control: form.control, name: "supply_gap" });
  const expectedDemandGrowthPct = useWatch({ control: form.control, name: "expected_demand_growth_pct" });
  const seasonalDemandPattern = useWatch({ control: form.control, name: "seasonal_demand_pattern" }) ?? "";
  const peakDemandPeriod = useWatch({ control: form.control, name: "peak_demand_period" }) ?? "";
  const offSeasonDemand = useWatch({ control: form.control, name: "off_season_demand" }) ?? "";
  const pricingBasisOther = useWatch({ control: form.control, name: "pricing_basis_other" }) ?? "";
  // Category E — additional info (optional per KAU spec)
  const existingMarketPrice = useWatch({ control: form.control, name: "existing_market_price" });
  const competitorPrice = useWatch({ control: form.control, name: "competitor_price" });
  const expectedAnnualPriceIncreasePct = useWatch({ control: form.control, name: "expected_annual_price_increase_pct" });
  const promotionalPricingNotes = useWatch({ control: form.control, name: "promotional_pricing_notes" }) ?? "";
  const seasonalPriceVariation = useWatch({ control: form.control, name: "seasonal_price_variation" }) ?? "";
  const brandName = useWatch({ control: form.control, name: "brand_name" }) ?? "";
  const existingBrandName = useWatch({ control: form.control, name: "existing_brand_name" }) ?? "";
  const packagingStrategy = useWatch({ control: form.control, name: "packaging_strategy" }) ?? "";
  const website = useWatch({ control: form.control, name: "website" }) ?? "";
  const socialMedia = useWatch({ control: form.control, name: "social_media_presence" }) ?? "";
  const hasExistingBuyers = useWatch({ control: form.control, name: "has_existing_buyers" });

  // Convenience setter — always includes shouldDirty: true.
  const setField = <K extends keyof Data>(name: K, value: Data[K]) =>
    form.setValue(name as never, value as never, { shouldDirty: true });

  // Live share-total for D. Marketing Channels — updates instantly as the user
  // Channel percent shares — passed to <PercentSumIndicator> below the card.
  const channelShares = channels.map((c) => c.expected_share_pct);

  // ── Live section-level validation ──────────────────────────────────────
  // Mirrors market_validators.py section-level rules. Backend fieldErrors
  // still wins when present (covers server-only rules).
  const liveErrors: Record<string, string | undefined> = {};
  const liveWarnings: Record<string, string | undefined> = {};

  if (products.length === 0) {
    liveErrors.products = "At least one product/service shall be specified.";
  }
  if (!demandBasis) {
    liveErrors.demand_basis = "Basis of Demand Estimation shall be specified.";
  }
  if (demandBasis === "other" && !demandBasisOther.trim()) {
    liveErrors.demand_basis_other = 'Please specify the demand basis when "Others" is selected.';
  }
  if (hasExistingBuyers && buyers.length === 0) {
    liveErrors.buyers = 'At least one buyer shall be specified when "Existing Buyers" is Yes.';
  }
  if (channels.length === 0) {
    liveErrors.channel_selections = "At least one marketing channel shall be selected.";
  }
  if (!pricingBasis) {
    liveErrors.pricing_basis = "Basis of Pricing shall be specified.";
  }
  if (pricingBasis === "other" && !pricingBasisOther.trim()) {
    liveErrors.pricing_basis_other = 'Please specify the pricing basis when "Others" is selected.';
  }
  if (hasCompetitors === "yes" && competitors.length === 0) {
    liveErrors.competitors = 'At least one competitor shall be specified when "Competitors Exist" is Yes.';
  }
  if (isBranded && !brandName.trim()) {
    liveWarnings.brand_name = 'Brand Name is recommended when "Marketed under a brand" is Yes.';
  }
  if (risks.length === 0) {
    liveWarnings.risks =
      "No marketing risks specified. Consider identifying at least one for a complete DPR.";
  }

  const err = (name: string): string | undefined =>
    fieldErrors.get(name) ?? liveErrors[name];
  const warn = (name: string): string | undefined =>
    fieldWarnings.get(name) ?? liveWarnings[name];

  const togglePromo = (id: number, checked: boolean) => {
    const cur = form.getValues("promotional_activities") ?? [];
    form.setValue("promotional_activities", checked ? [...cur, id] : cur.filter((i) => i !== id), { shouldDirty: true });
  };

  const loading = isLoading || productCatQ.isLoading || productTypeQ.isLoading || intendedMarketQ.isLoading;

  // Derive the "other" master row id — DB-driven, not hardcoded. Passed into
  // validateProduct so the "Others (Specify)" rule can look up whether the
  // current row's customer_categories includes that specific id.
  const otherCustomerCategoryId =
    customerCatQ.data?.find((cc) => cc.code === "other")?.id ?? null;

  const EMPTY_PRODUCT: Product = {
    order: 0, name: "", product_category: null, product_type: null,
    intended_market: null, geographic_market: "", proposed_brand_name: "", existing_brand_name: "",
    customer_categories: [], customer_categories_other: "",
    proposed_selling_price: null, unit_of_sale: null,
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
      help={
        <SectionHelp
          title="Market Assessment & Business Model"
          purpose="The revenue and go-to-market plan. Captures what you're selling, to whom, through which channels, at what price, against what competition — plus branding, promotion, and marketing risks. Every field flows into the Market Analysis chapter of the DPR PDF. Products' annual quantity × selling price becomes the Year-1 revenue baseline in the Financial Analysis chapter; year 2-5 projections drive the ramp-up. Credit vs cash mix + buyer credit-period days feed the working-capital calc."
          whatToFill={[
            "A + H — Products / Sales Projection (required, ≥ 1 row). Add one row per SKU. Each row captures name, category, product type, intended market, geographic market, customer categories, brand, price, unit of sale, and a 5-year annual sales-quantity projection. Yr 1 quantity is required; Yr 2-5 are optional but recommended.",
            "B — Market Demand. Pick whether existing demand for the product exists, enter an estimated annual demand if known, and select the basis (Market Survey / Existing Sales / Industry Report / etc.). If 'Others' → specify. Optional additional info: current supply, supply gap, expected demand growth, seasonal pattern, peak / off-season periods.",
            "C — Existing Buyers. First toggle Yes/No — if Yes, add rows for the existing buyers you already sell to. Choose between a single named buyer (KSCMF, Amazon, etc.) or a group of similar buyers (e.g. 50 kirana shops). Optional: average quantity, purchase agreement / contract flags, credit period.",
            "D — Marketing Channels (required, ≥ 1 row). Add rows for the channels you'll sell through — FPO retail outlet, retail chains, distributor network, e-commerce, exports, etc. Expected share % across all channels should sum to 100 (a live indicator shows the running total).",
            "E — Pricing Strategy. Pick the basis (Cost Plus / Market Price / Competitive / etc.). If 'Others' → specify. Enter Credit sales % and Cash sales % — they must sum to ≤ 100 (live indicator turns red if over). Optional additional info: existing market price, competitor price, expected annual price increase, promotional and seasonal notes.",
            "F — Competition. Toggle 'Existing competitors' — if Yes, add rows for each competitor with a name, type (Local / Regional / National / International), your competitive advantage over them, and your differentiation strategy. Optional: number of competitors, estimated market share %, competitor strengths and weaknesses.",
            "G — Branding & Promotion. Tick 'Products marketed under a brand' to reveal brand name (existing or proposed), promotional activities (multi-select), packaging strategy, website URL, and social media presence.",
            "I — Marketing Risks (recommended). Add rows for the marketing risks your project faces — price fluctuation, changing consumer preference, transportation constraints, quality issues, etc. Each row: pick the risk type + write a specific mitigation strategy.",
          ]}
          tips={[
            "Sales projection numbers drive Financials directly. Yr 1 quantity × selling price → Y1 revenue in the Finance chapter; Yr 2-5 → the ramp-up curve. Realistic entries matter — inflated numbers here corrupt every downstream projection.",
            "Channel share % should sum to 100 (not exceed it). A ≠ 100 sum triggers a warning; > 100 triggers an error. The live indicator below the channel list shows the running total as you type.",
            "Credit + Cash % must sum to ≤ 100 (the remainder is other payment terms). > 100 is invalid — the indicator turns red and the input borders flash destructive.",
            "'Others (Specify)' in Customer Categories or the demand / pricing basis dropdowns reveals a required text field — you cannot leave it blank once ticked.",
            "The Buyers card only appears when you tick Yes to 'Does the FPO have existing buyers?'. Same for the Competitors card (only when 'Existing competitors' = Yes). Toggle Yes → No and your rows are hidden but the underlying data is preserved (soft-hide).",
            "The Additional Information fields (in B, C, E, F) are all optional per the KAU spec. Fill what you have; leave blank what you don't. Some of these (market prices, competitor prices, growth rates) may be AI-inferred from AGMARKNET in a future release — you'll still be able to override any value the system suggests.",
            "Marketing risks are strongly recommended even though they're not strictly required. A DPR without risk analysis reads as underprepared to bank appraisers.",
          ]}
          downstream={[
            "Market Analysis chapter in the DPR PDF — every field renders there",
            "Financial Analysis chapter — Y1 revenue = per-product (quantity × price), scaled over Yr 2-5 projections",
            "Working Capital calc — credit vs cash mix + buyer credit-period days feed the receivables cycle",
            "Risk Analysis chapter — marketing risks appear alongside supply-chain and production risks",
            "AI narrative — competitive advantage, differentiation, promotional strategy inform the Marketing chapter's narrative paragraphs",
            "Sensitivity Analysis (when enabled) — selling price + Y1 quantity are the primary variables tested",
          ]}
        />
      }
    >
      <div className="space-y-4">
        {/* Products (A + H) — id enables readiness-panel deep-link scroll */}
        <div id="dpr-field-products" />
        <NestedListCard<Product>
          title="A + H. Products / Services & Sales Projection"
          items={products}
          onChange={(next) => setField("products", next)}
          emptyRow={EMPTY_PRODUCT}
          columns={[
            { key: "name", label: "Product" },
            { key: "year1_qty", label: "Yr1 qty" },
            { key: "proposed_selling_price", label: "Price/unit (₹)" },
          ]}
          isValid={(row) => Object.keys(validateProduct(row, otherCustomerCategoryId)).length === 0}
          addLabel="Add product"
          editLabel="Edit product"
          error={err("products")}
          warning={warn("products")}
          renderModal={(row, set) => {
            const rErr = validateProduct(row, otherCustomerCategoryId);
            return (
            <>
              <ModalField label="Product name *" error={rErr.name}>
                <Input
                  value={row.name}
                  maxLength={MAX_NAME_CHARS}
                  onChange={(e) => set("name", e.target.value.slice(0, MAX_NAME_CHARS))}
                />
              </ModalField>
              <ModalRow>
                <ModalField label="Category *" error={rErr.product_category}>
                  <MasterSearchableSelect value={row.product_category} options={productCatQ.data ?? []} onChange={(v) => set("product_category", v)} placeholder="Type to search category…" />
                </ModalField>
                <ModalField label="Product type *" error={rErr.product_type}>
                  <MasterSearchableSelect value={row.product_type} options={productTypeQ.data ?? []} onChange={(v) => set("product_type", v)} placeholder="Type to search type…" />
                </ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Intended market *" error={rErr.intended_market}>
                  <MasterSearchableSelect value={row.intended_market} options={intendedMarketQ.data ?? []} onChange={(v) => set("intended_market", v)} placeholder="Type to search market…" />
                </ModalField>
                <ModalField label="Geographic market *" error={rErr.geographic_market}>
                  <Input
                    value={row.geographic_market}
                    maxLength={MAX_SHORT_CHARS}
                    onChange={(e) => set("geographic_market", e.target.value.slice(0, MAX_SHORT_CHARS))}
                  />
                </ModalField>
              </ModalRow>
              <div>
                <Label className={`text-xs ${rErr.customer_categories ? "text-destructive" : ""}`}>
                  Customer categories *
                </Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {(customerCatQ.data ?? []).map((cc) => (
                    <label key={cc.id} className="flex cursor-pointer items-center gap-2 text-xs">
                      <Checkbox checked={row.customer_categories.includes(cc.id)} onCheckedChange={(c) => set("customer_categories", (c ? [...row.customer_categories, cc.id] : row.customer_categories.filter((i) => i !== cc.id)) as number[])} />
                      {cc.label}
                    </label>
                  ))}
                </div>
                {rErr.customer_categories && (
                  <p className="mt-1 text-xs text-destructive">{rErr.customer_categories}</p>
                )}
                {/* "Others (Specify)" companion — appears only when the
                    "other" master row is ticked. Same pattern as land
                    ownership / site status on Location. */}
                {otherCustomerCategoryId != null &&
                  row.customer_categories.includes(otherCustomerCategoryId) && (
                    <ModalField
                      label="Please specify (Others) *"
                      error={rErr.customer_categories_other}
                    >
                      <Input
                        value={row.customer_categories_other ?? ""}
                        maxLength={MAX_OTHER_TEXT_CHARS}
                        onChange={(e) =>
                          set(
                            "customer_categories_other",
                            e.target.value.slice(0, MAX_OTHER_TEXT_CHARS),
                          )
                        }
                        placeholder="Describe the other customer category…"
                      />
                    </ModalField>
                  )}
              </div>
              <ModalRow>
                <ModalField label="Proposed brand name">
                  <Input
                    value={row.proposed_brand_name}
                    maxLength={MAX_NAME_CHARS}
                    onChange={(e) => set("proposed_brand_name", e.target.value.slice(0, MAX_NAME_CHARS))}
                  />
                </ModalField>
                <ModalField label="Existing brand name">
                  <Input
                    value={row.existing_brand_name}
                    maxLength={MAX_NAME_CHARS}
                    onChange={(e) => set("existing_brand_name", e.target.value.slice(0, MAX_NAME_CHARS))}
                  />
                </ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Proposed selling price / unit (₹) *" error={rErr.proposed_selling_price}>
                  <Input
                    type="text"
                    inputMode="decimal"
                    maxLength={14}
                    placeholder="e.g. 280"
                    value={row.proposed_selling_price !== null && row.proposed_selling_price !== undefined ? String(row.proposed_selling_price) : ""}
                    onChange={(e) => {
                      const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_PRICE_INR, maxDecimals: 2 });
                      set("proposed_selling_price", cleaned === "" ? null : cleaned);
                    }}
                  />
                </ModalField>
                <ModalField label="Unit of sale *" error={rErr.unit_of_sale}>
                  <MasterSearchableSelect value={row.unit_of_sale} options={unitQ.data ?? []} onChange={(v) => set("unit_of_sale", v)} placeholder="Type to search unit…" />
                </ModalField>
              </ModalRow>
              <div>
                <Label className={`text-xs ${rErr.year1_qty ? "text-destructive" : ""}`}>
                  Sales projection (Yr 1-5) — Yr 1 required *
                </Label>
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {(["year1_qty","year2_qty","year3_qty","year4_qty","year5_qty"] as const).map((k, i) => (
                    <div key={k}>
                      <Label className="text-[10px] text-muted-foreground">Yr {i + 1}{i === 0 ? " *" : ""}</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        maxLength={14}
                        placeholder="e.g. 48000"
                        value={row[k] !== null && row[k] !== undefined ? String(row[k]) : ""}
                        onChange={(e) => {
                          const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_QTY, maxDecimals: 3 });
                          set(k, (cleaned === "" ? null : cleaned) as Product[typeof k]);
                        }}
                      />
                    </div>
                  ))}
                </div>
                {rErr.year1_qty && (
                  <p className="mt-1 text-xs text-destructive">{rErr.year1_qty}</p>
                )}
              </div>
            </>
            );
          }}
        />

        {/* B. Market Demand */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">B. Market Demand</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Existing demand *</Label>
              <SearchableSelect value={demandExists ?? ""} options={YES_NO_UNSURE} onChange={(v) => setField("demand_exists", v)} placeholder="Select…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Estimated annual demand</Label>
              <Input
                type="text"
                inputMode="decimal"
                maxLength={16}
                placeholder="e.g. 500000"
                value={estimatedAnnualDemand !== null && estimatedAnnualDemand !== undefined ? String(estimatedAnnualDemand) : ""}
                onChange={(e) => {
                  const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_DEMAND_QTY, maxDecimals: 2 });
                  setField("estimated_annual_demand", cleaned === "" ? null : cleaned);
                }}
              />
            </div>
          </div>
          <div id="dpr-field-demand_basis" className="space-y-1.5">
            <Label className={`text-xs ${err("demand_basis") ? "text-destructive" : ""}`}>
              Basis of demand estimation *
            </Label>
            <SearchableSelect value={demandBasis ?? ""} options={DEMAND_BASIS} onChange={(v) => setField("demand_basis", v)} placeholder="Type to search basis…" />
            {err("demand_basis") && (
              <p className="text-xs text-destructive">{err("demand_basis")}</p>
            )}
          </div>
          {demandBasis === "other" && (
            <div id="dpr-field-demand_basis_other" className="space-y-1.5">
              <Label className={`text-xs ${err("demand_basis_other") ? "text-destructive" : ""}`}>
                Please specify (Others) *
              </Label>
              <Input
                value={demandBasisOther as string}
                maxLength={MAX_OTHER_TEXT_CHARS}
                onChange={(e) => setField("demand_basis_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
              />
              {err("demand_basis_other") && (
                <p className="text-xs text-destructive">{err("demand_basis_other")}</p>
              )}
            </div>
          )}

          {/* ── B. Additional Information (all optional per KAU spec) ── */}
          <div className="mt-4 space-y-3 border-t pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Additional information (optional)
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Current supply</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  maxLength={16}
                  placeholder="e.g. 350000"
                  value={currentSupply !== null && currentSupply !== undefined ? String(currentSupply) : ""}
                  onChange={(e) => {
                    const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_DEMAND_QTY, maxDecimals: 3 });
                    setField("current_supply", cleaned === "" ? null : cleaned);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Supply gap</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  maxLength={16}
                  placeholder="e.g. 150000"
                  value={supplyGap !== null && supplyGap !== undefined ? String(supplyGap) : ""}
                  onChange={(e) => {
                    const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_DEMAND_QTY, maxDecimals: 3 });
                    setField("supply_gap", cleaned === "" ? null : cleaned);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                {/* Backend column is Decimal(6, 2) so max theoretically 9999.99;
                    real business demand-growth CAGR is almost never above ~50%
                    but we allow 1000 for edge cases. */}
                <Label className="text-xs">Expected demand growth (% p.a.)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  maxLength={7}
                  placeholder="e.g. 12"
                  value={expectedDemandGrowthPct !== null && expectedDemandGrowthPct !== undefined ? String(expectedDemandGrowthPct) : ""}
                  onChange={(e) => {
                    const cleaned = normaliseDecimalInput(e.target.value, { max: 1000, maxDecimals: 2 });
                    setField("expected_demand_growth_pct", cleaned === "" ? null : cleaned);
                  }}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Peak demand period</Label>
                <Input
                  value={peakDemandPeriod as string}
                  maxLength={MAX_NAME_CHARS}
                  placeholder="e.g. Oct-Feb (Onam + Christmas + wedding season)"
                  onChange={(e) => setField("peak_demand_period", e.target.value.slice(0, MAX_NAME_CHARS))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Off-season demand</Label>
                <Input
                  value={offSeasonDemand as string}
                  maxLength={MAX_NAME_CHARS}
                  placeholder="e.g. May-Aug — ~40% of peak volumes"
                  onChange={(e) => setField("off_season_demand", e.target.value.slice(0, MAX_NAME_CHARS))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Seasonal demand pattern</Label>
              <CountedTextarea
                rows={2}
                maxChars={MAX_LONG_TEXT_CHARS}
                value={seasonalDemandPattern as string}
                onChange={(v) => setField("seasonal_demand_pattern", v)}
                placeholder="e.g. Sales peak Oct-Feb (festive + wedding); monsoon low season Jun-Aug driven by kitchen-oil substitution habits."
              />
            </div>
          </div>
        </CardContent></Card>

        {/* C. Existing Buyers — Yes/No toggle at the top; buyers list only
            renders when Yes (matches KAU spec §2.3.11 Cat C). */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">C. Existing Buyers</h3>
          <div className="space-y-1.5">
            <Label className="text-xs">Does the FPO have existing buyers?</Label>
            <SearchableSelect
              value={hasExistingBuyers === true ? "yes" : hasExistingBuyers === false ? "no" : ""}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
              onChange={(v) => setField("has_existing_buyers", v === "yes")}
              placeholder="Select…"
            />
          </div>
        </CardContent></Card>
        {hasExistingBuyers && (
          <>
        <div id="dpr-field-buyers" />
        <NestedListCard<Buyer>
          title="C. Existing Buyers"
          items={buyers}
          onChange={(next) => setField("buyers", next)}
          error={err("buyers")}
          emptyRow={{
            order: 0,
            buyer_name: "",
            buyer_category: null,
            location: "",
            purchase_frequency: "",
            num_buyers: null,
            avg_quantity_purchased: null,
            has_purchase_agreement: null,
            has_contract: null,
            credit_period_days: null,
            // Default new rows to "single named buyer" — the more common case.
            // User flips to "group" via the radio at the top of the modal
            // if they're representing a cluster (e.g. "50 kirana shops").
            is_group: false,
          }}
          columns={[
            {
              key: "buyer_name",
              label: "Buyer",
              // Compact indicator when a row represents a group vs a single
              // named buyer — helps the FPO / reviewer scan the table.
              render: (v, row) => {
                const isGroup =
                  (row as Buyer).is_group ||
                  (Number((row as Buyer).num_buyers) || 0) > 1;
                const name = (v as string) || (isGroup ? "(unnamed group)" : "—");
                return isGroup
                  ? `${name} · group of ${(row as Buyer).num_buyers ?? "?"}`
                  : name;
              },
            },
            { key: "buyer_category", label: "Category", render: (v) => (buyerTypeQ.data?.find((r) => r.id === v)?.label as string) ?? "—" },
            { key: "location", label: "Location" },
          ]}
          isValid={(row) => Object.keys(validateBuyer(row)).length === 0}
          addLabel="Add buyer"
          editLabel="Edit buyer"
          renderModal={(row, set) => {
            // Server-loaded rows don't have is_group — derive from num_buyers.
            // Anything > 1 was intended as a group even before this UI split.
            const isGroup =
              row.is_group ?? (Number(row.num_buyers) || 0) > 1;
            const rErr = validateBuyer(row);
            return (
            <>
              {/* Row-type toggle — clarifies whether this row is one named
                  customer or a category of similar customers. Prevents the
                  ambiguity flagged by KAU testing (num_buyers=5 with a
                  specific buyer name was contradictory). */}
              <ModalField label="This row represents *">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      set("is_group", false);
                      // Force num_buyers=1 conceptually — actual send-time
                      // value is derived in serializePayload.
                      set("num_buyers", 1);
                    }}
                    className={`flex-1 rounded-md border px-3 py-2 text-xs transition ${
                      !isGroup
                        ? "border-primary bg-primary/10 font-medium text-foreground"
                        : "border-input text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    A single named buyer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      set("is_group", true);
                      // Suggest 2 as the minimum meaningful group size.
                      if (!row.num_buyers || Number(row.num_buyers) < 2) {
                        set("num_buyers", 2);
                      }
                    }}
                    className={`flex-1 rounded-md border px-3 py-2 text-xs transition ${
                      isGroup
                        ? "border-primary bg-primary/10 font-medium text-foreground"
                        : "border-input text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    A group of similar buyers
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {isGroup
                    ? "Use for clusters of similar customers (e.g. 50 local kirana shops, 12 restaurants). One row can represent the whole group."
                    : "Use for a specific named buyer (e.g. KSCMF, Milma, Amazon)."}
                </p>
              </ModalField>

              <ModalRow>
                <ModalField label={isGroup ? "Group description" : "Buyer name *"} error={rErr.buyer_name}>
                  <Input
                    placeholder={
                      isGroup
                        ? "e.g. Kochi kirana cluster (optional)"
                        : "e.g. KSCMF"
                    }
                    value={row.buyer_name}
                    maxLength={MAX_SHORT_CHARS}
                    onChange={(e) => set("buyer_name", e.target.value.slice(0, MAX_SHORT_CHARS))}
                  />
                </ModalField>
                <ModalField label="Buyer category *" error={rErr.buyer_category}>
                  <MasterSearchableSelect value={row.buyer_category} options={buyerTypeQ.data ?? []} onChange={(v) => set("buyer_category", v)} placeholder="Type to search category…" />
                </ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Location">
                  <Input
                    value={row.location}
                    maxLength={MAX_SHORT_CHARS}
                    onChange={(e) => set("location", e.target.value.slice(0, MAX_SHORT_CHARS))}
                  />
                </ModalField>
                <ModalField label="Purchase frequency">
                  <SearchableSelect value={row.purchase_frequency} options={PURCHASE_FREQ} onChange={(v) => set("purchase_frequency", v)} placeholder="Type to search frequency…" />
                </ModalField>
              </ModalRow>
              <ModalRow>
                {isGroup ? (
                  <ModalField label="Number of buyers in group *" error={rErr.num_buyers}>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="≥ 2"
                      value={row.num_buyers !== null && row.num_buyers !== undefined ? String(row.num_buyers) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseIntegerInput(e.target.value, { max: MAX_BUYERS_GROUP });
                        set("num_buyers", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                ) : (
                  // Hidden for single-buyer rows — clarifies that the row
                  // represents one customer. Filler div preserves grid layout.
                  <div />
                )}
                <ModalField label="Credit period (days)">
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={3}
                    placeholder="0-365"
                    value={row.credit_period_days !== null && row.credit_period_days !== undefined ? String(row.credit_period_days) : ""}
                    onChange={(e) => {
                      const cleaned = normaliseIntegerInput(e.target.value, { max: MAX_CREDIT_DAYS });
                      set("credit_period_days", cleaned === "" ? null : cleaned);
                    }}
                  />
                </ModalField>
              </ModalRow>

              {/* ── C. Additional Information (optional per KAU spec) ── */}
              <div className="mt-2 space-y-3 border-t pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Additional information (optional)
                </p>
                <ModalRow>
                  <ModalField label="Average quantity purchased">
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={16}
                      placeholder="e.g. 5000"
                      value={row.avg_quantity_purchased !== null && row.avg_quantity_purchased !== undefined ? String(row.avg_quantity_purchased) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_QTY, maxDecimals: 3 });
                        set("avg_quantity_purchased", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                  <div />
                </ModalRow>
                <ModalRow>
                  <ModalField label="Existing purchase agreement">
                    {/* Tri-state — backend BooleanField(null=True). null =
                        unanswered, true = Yes, false = No. */}
                    <SearchableSelect
                      value={row.has_purchase_agreement === true ? "yes" : row.has_purchase_agreement === false ? "no" : ""}
                      options={[
                        { value: "yes", label: "Yes" },
                        { value: "no", label: "No" },
                      ]}
                      onChange={(v) =>
                        set(
                          "has_purchase_agreement",
                          v === "yes" ? true : v === "no" ? false : null,
                        )
                      }
                      placeholder="Select (optional)"
                    />
                  </ModalField>
                  <ModalField label="Existing contract">
                    <SearchableSelect
                      value={row.has_contract === true ? "yes" : row.has_contract === false ? "no" : ""}
                      options={[
                        { value: "yes", label: "Yes" },
                        { value: "no", label: "No" },
                      ]}
                      onChange={(v) =>
                        set(
                          "has_contract",
                          v === "yes" ? true : v === "no" ? false : null,
                        )
                      }
                      placeholder="Select (optional)"
                    />
                  </ModalField>
                </ModalRow>
              </div>
            </>
            );
          }}
        />
        </>
        )}

        {/* D. Channels */}
        <div id="dpr-field-channel_selections" />
        <NestedListCard<Channel>
          title="D. Proposed Marketing Channels"
          items={channels}
          onChange={(next) => setField("channel_selections", next)}
          emptyRow={{ channel: 0, channel_other: "", expected_share_pct: null, existing_arrangement: "", remarks: "" }}
          columns={[
            { key: "channel", label: "Channel", render: (v) => (channelQ.data?.find((r) => r.id === v)?.label as string) ?? "—" },
            { key: "expected_share_pct", label: "Share %" },
          ]}
          isValid={(row) => Object.keys(validateChannel(row)).length === 0}
          addLabel="Add channel"
          editLabel="Edit channel"
          error={err("channel_selections")}
          warning={warn("channel_selections")}
          renderModal={(row, set) => {
            const rErr = validateChannel(row);
            return (
            <>
              <ModalField label="Channel *" error={rErr.channel}>
                <MasterSearchableSelect value={row.channel === 0 ? null : row.channel} options={channelQ.data ?? []} onChange={(v) => set("channel", (v ?? 0) as number)} placeholder="Type to search channel…" />
              </ModalField>
              {channelQ.data?.find((r) => r.id === row.channel)?.code === "other" && (
                <ModalField label="Specify">
                  <Input
                    value={row.channel_other}
                    maxLength={MAX_OTHER_TEXT_CHARS}
                    onChange={(e) => set("channel_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
                  />
                </ModalField>
              )}
              <ModalField label="Expected share of sales (%)">
                <Input
                  type="text"
                  inputMode="decimal"
                  maxLength={6}
                  placeholder="0-100"
                  value={row.expected_share_pct !== null && row.expected_share_pct !== undefined ? String(row.expected_share_pct) : ""}
                  onChange={(e) => {
                    const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_PCT, maxDecimals: 2 });
                    set("expected_share_pct", cleaned === "" ? null : cleaned);
                  }}
                />
              </ModalField>
              <ModalField label="Existing arrangement">
                <CountedTextarea
                  rows={2}
                  maxChars={MAX_LONG_TEXT_CHARS}
                  value={row.existing_arrangement}
                  onChange={(v) => set("existing_arrangement", v)}
                />
              </ModalField>
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
        {channels.length > 0 && (
          <PercentSumIndicator values={channelShares} label="Channel share total" />
        )}

        {/* E. Pricing Strategy (section-level) */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">E. Pricing Strategy</h3>
          <div id="dpr-field-pricing_basis" className="space-y-1.5">
            <Label className={`text-xs ${err("pricing_basis") ? "text-destructive" : ""}`}>Basis of pricing *</Label>
            <SearchableSelect value={pricingBasis ?? ""} options={PRICING_BASIS} onChange={(v) => setField("pricing_basis", v)} placeholder="Type to search basis…" />
            {err("pricing_basis") && (
              <p className="text-xs text-destructive">{err("pricing_basis")}</p>
            )}
          </div>
          {pricingBasis === "other" && (
            <div id="dpr-field-pricing_basis_other" className="space-y-1.5">
              <Label className={`text-xs ${err("pricing_basis_other") ? "text-destructive" : ""}`}>Please specify (Others) *</Label>
              <Input
                value={pricingBasisOther as string}
                maxLength={MAX_OTHER_TEXT_CHARS}
                onChange={(e) => setField("pricing_basis_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
              />
              {err("pricing_basis_other") && (
                <p className="text-xs text-destructive">{err("pricing_basis_other")}</p>
              )}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={`text-xs ${isPercentSumOver([creditPct, cashPct]) ? "text-destructive" : ""}`}>Credit sales (%)</Label>
              <Input
                type="text"
                inputMode="decimal"
                maxLength={6}
                placeholder="0-100"
                className={isPercentSumOver([creditPct, cashPct]) ? "border-destructive focus-visible:ring-destructive/40" : ""}
                value={creditPct !== null && creditPct !== undefined ? String(creditPct) : ""}
                onChange={(e) => {
                  const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_PCT, maxDecimals: 2 });
                  setField("credit_sales_pct", cleaned === "" ? null : cleaned);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={`text-xs ${isPercentSumOver([creditPct, cashPct]) ? "text-destructive" : ""}`}>Cash sales (%)</Label>
              <Input
                type="text"
                inputMode="decimal"
                maxLength={6}
                placeholder="0-100"
                className={isPercentSumOver([creditPct, cashPct]) ? "border-destructive focus-visible:ring-destructive/40" : ""}
                value={cashPct !== null && cashPct !== undefined ? String(cashPct) : ""}
                onChange={(e) => {
                  const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_PCT, maxDecimals: 2 });
                  setField("cash_sales_pct", cleaned === "" ? null : cleaned);
                }}
              />
            </div>
          </div>
          <PercentSumIndicator values={[creditPct, cashPct]} label="Credit + Cash" />

          {/* ── E. Additional Information (optional per KAU spec) ── */}
          <div className="mt-4 space-y-3 border-t pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Additional information (optional)
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Existing market price (₹)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  maxLength={14}
                  placeholder="e.g. 270"
                  value={existingMarketPrice !== null && existingMarketPrice !== undefined ? String(existingMarketPrice) : ""}
                  onChange={(e) => {
                    const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_PRICE_INR, maxDecimals: 2 });
                    setField("existing_market_price", cleaned === "" ? null : cleaned);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Competitor price (₹)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  maxLength={14}
                  placeholder="e.g. 260"
                  value={competitorPrice !== null && competitorPrice !== undefined ? String(competitorPrice) : ""}
                  onChange={(e) => {
                    const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_PRICE_INR, maxDecimals: 2 });
                    setField("competitor_price", cleaned === "" ? null : cleaned);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                {/* Backend column is Decimal(6, 2) → theoretical max 9999.99;
                    real business price-increase CAGR is almost always < 50%.
                    Cap 1000 for edge cases without being restrictive. */}
                <Label className="text-xs">Expected annual price increase (% p.a.)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  maxLength={7}
                  placeholder="e.g. 5"
                  value={expectedAnnualPriceIncreasePct !== null && expectedAnnualPriceIncreasePct !== undefined ? String(expectedAnnualPriceIncreasePct) : ""}
                  onChange={(e) => {
                    const cleaned = normaliseDecimalInput(e.target.value, { max: 1000, maxDecimals: 2 });
                    setField("expected_annual_price_increase_pct", cleaned === "" ? null : cleaned);
                  }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Promotional pricing notes</Label>
              <CountedTextarea
                rows={2}
                maxChars={MAX_LONG_TEXT_CHARS}
                value={promotionalPricingNotes as string}
                onChange={(v) => setField("promotional_pricing_notes", v)}
                placeholder="e.g. 10% intro discount for first 3 months at retail chains; 5% loyalty rebate on repeat B2B orders."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Seasonal price variation</Label>
              <CountedTextarea
                rows={2}
                maxChars={MAX_LONG_TEXT_CHARS}
                value={seasonalPriceVariation as string}
                onChange={(v) => setField("seasonal_price_variation", v)}
                placeholder="e.g. 15% premium during Onam / Christmas; ~5% dip during monsoon (Jun-Aug)."
              />
            </div>
          </div>
        </CardContent></Card>

        {/* F. Competition */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">F. Competition Assessment</h3>
          <div className="space-y-1.5">
            <Label className="text-xs">Existing competitors</Label>
            <SearchableSelect value={hasCompetitors ?? ""} options={YES_NO_UNSURE} onChange={(v) => setField("has_competitors", v)} placeholder="Select…" />
          </div>
        </CardContent></Card>
        {hasCompetitors === "yes" && (
          <>
            <div id="dpr-field-competitors" />
            <NestedListCard<Competitor>
              title="F. Competitors"
              items={competitors}
              onChange={(next) => setField("competitors", next)}
              emptyRow={{
                order: 0, name: "", competitor_type: "",
                competitive_advantage: "", differentiation_strategy: "",
                num_competitors: null, estimated_market_share_pct: null,
                strengths: "", weaknesses: "",
              }}
              columns={[
                { key: "name", label: "Competitor" },
                { key: "competitor_type", label: "Type", render: (v) => COMPETITOR_TYPE.find((o) => o.value === v)?.label ?? "—" },
              ]}
              isValid={(row) => Object.keys(validateCompetitor(row)).length === 0}
              addLabel="Add competitor"
              editLabel="Edit competitor"
              error={err("competitors")}
              renderModal={(row, set) => {
                const rErr = validateCompetitor(row);
                return (
                <>
                  <ModalRow>
                    <ModalField label="Name *" error={rErr.name}>
                      <Input
                        value={row.name}
                        maxLength={MAX_NAME_CHARS}
                        onChange={(e) => set("name", e.target.value.slice(0, MAX_NAME_CHARS))}
                      />
                    </ModalField>
                    <ModalField label="Type">
                      <SearchableSelect value={row.competitor_type} options={COMPETITOR_TYPE} onChange={(v) => set("competitor_type", v)} placeholder="Local / Regional / National / International" />
                    </ModalField>
                  </ModalRow>
                  <ModalField label="Our competitive advantage *" error={rErr.competitive_advantage}>
                    <CountedTextarea
                      rows={2}
                      maxChars={MAX_LONG_TEXT_CHARS}
                      value={row.competitive_advantage}
                      onChange={(v) => set("competitive_advantage", v)}
                      error={Boolean(rErr.competitive_advantage)}
                    />
                  </ModalField>
                  <ModalField label="Differentiation strategy">
                    <CountedTextarea
                      rows={2}
                      maxChars={MAX_LONG_TEXT_CHARS}
                      value={row.differentiation_strategy}
                      onChange={(v) => set("differentiation_strategy", v)}
                    />
                  </ModalField>

                  {/* ── F. Additional Information (optional per KAU spec) ── */}
                  <div className="mt-2 space-y-3 border-t pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Additional information (optional)
                    </p>
                    <ModalRow>
                      <ModalField label="Number of competitors">
                        <Input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="e.g. 8"
                          value={row.num_competitors !== null && row.num_competitors !== undefined ? String(row.num_competitors) : ""}
                          onChange={(e) => {
                            const cleaned = normaliseIntegerInput(e.target.value, { max: 100_000 });
                            set("num_competitors", cleaned === "" ? null : cleaned);
                          }}
                        />
                      </ModalField>
                      <ModalField label="Estimated market share (%)">
                        {/* Backend column Decimal(5, 2) → 0–100 range. */}
                        <Input
                          type="text"
                          inputMode="decimal"
                          maxLength={6}
                          placeholder="0-100"
                          value={row.estimated_market_share_pct !== null && row.estimated_market_share_pct !== undefined ? String(row.estimated_market_share_pct) : ""}
                          onChange={(e) => {
                            const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_PCT, maxDecimals: 2 });
                            set("estimated_market_share_pct", cleaned === "" ? null : cleaned);
                          }}
                        />
                      </ModalField>
                    </ModalRow>
                    <ModalField label="Competitor strengths">
                      <CountedTextarea
                        rows={2}
                        maxChars={MAX_LONG_TEXT_CHARS}
                        value={row.strengths}
                        onChange={(v) => set("strengths", v)}
                        placeholder="e.g. Established brand, wide distribution, price leadership."
                      />
                    </ModalField>
                    <ModalField label="Competitor weaknesses">
                      <CountedTextarea
                        rows={2}
                        maxChars={MAX_LONG_TEXT_CHARS}
                        value={row.weaknesses}
                        onChange={(v) => set("weaknesses", v)}
                        placeholder="e.g. Inconsistent quality, limited retail reach, no FSSAI certification."
                      />
                    </ModalField>
                  </div>
                </>
                );
              }}
            />
          </>
        )}

        {/* G. Branding & Promotion */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">G. Branding & Promotion</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={isBranded} onCheckedChange={(c) => setField("is_branded", !!c)} />
            Products will be marketed under a brand
          </label>
          {isBranded && (
            <div className="space-y-3 border-l-2 border-primary/30 pl-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div id="dpr-field-brand_name" className="space-y-1.5">
                  <Label className={`text-xs ${warn("brand_name") ? "text-amber-600" : ""}`}>Brand name *</Label>
                  <Input
                    value={brandName as string}
                    maxLength={MAX_NAME_CHARS}
                    onChange={(e) => setField("brand_name", e.target.value.slice(0, MAX_NAME_CHARS))}
                  />
                  {warn("brand_name") && (
                    <p className="text-xs text-amber-600 dark:text-amber-500">{warn("brand_name")}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Existing brand name</Label>
                  <Input
                    value={existingBrandName as string}
                    maxLength={MAX_NAME_CHARS}
                    onChange={(e) => setField("existing_brand_name", e.target.value.slice(0, MAX_NAME_CHARS))}
                  />
                </div>
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
              <div className="space-y-1.5">
                <Label className="text-xs">Packaging strategy</Label>
                <CountedTextarea
                  rows={2}
                  maxChars={MAX_LONG_TEXT_CHARS}
                  value={packagingStrategy as string}
                  onChange={(v) => setField("packaging_strategy", v)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Website</Label>
                  <Input
                    type="url"
                    placeholder="https://…"
                    value={website as string}
                    maxLength={MAX_URL_CHARS}
                    onChange={(e) => setField("website", e.target.value.slice(0, MAX_URL_CHARS))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Social media presence</Label>
                  <Input
                    value={socialMedia as string}
                    maxLength={MAX_LONG_TEXT_CHARS}
                    onChange={(e) => setField("social_media_presence", e.target.value.slice(0, MAX_LONG_TEXT_CHARS))}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent></Card>

        {/* I. Marketing Risks */}
        <div id="dpr-field-risks" />
        <NestedListCard<MarketRisk>
          title="I. Marketing Risks"
          items={risks}
          onChange={(next) => setField("risks", next)}
          emptyRow={{ risk_type: "", risk_type_other: "", mitigation_strategy: "" }}
          columns={[
            { key: "risk_type", label: "Risk", render: (v) => MKT_RISK.find((o) => o.value === v)?.label ?? "—" },
            { key: "mitigation_strategy", label: "Mitigation", render: (v) => ((v as string)?.slice(0, 40) ?? "") + ((v as string)?.length > 40 ? "…" : "") },
          ]}
          isValid={(row) => Object.keys(validateMarketRisk(row)).length === 0}
          addLabel="Add risk"
          editLabel="Edit risk"
          error={err("risks")}
          warning={warn("risks")}
          renderModal={(row, set) => {
            const rErr = validateMarketRisk(row);
            return (
            <>
              <ModalField label="Risk *" error={rErr.risk_type}>
                {/* SearchableSelect — matches the Raw Material risk pattern. */}
                <SearchableSelect
                  value={row.risk_type}
                  options={MKT_RISK}
                  onChange={(v) => set("risk_type", v)}
                  placeholder="Type to search risk…"
                />
              </ModalField>
              {row.risk_type === "other" && (
                <ModalField label="Specify">
                  <Input
                    value={row.risk_type_other}
                    maxLength={MAX_OTHER_TEXT_CHARS}
                    onChange={(e) => set("risk_type_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
                  />
                </ModalField>
              )}
              <ModalField label="Mitigation strategy *" error={rErr.mitigation_strategy}>
                <CountedTextarea
                  rows={3}
                  maxChars={MAX_LONG_TEXT_CHARS}
                  value={row.mitigation_strategy}
                  onChange={(v) => set("mitigation_strategy", v)}
                  error={Boolean(rErr.mitigation_strategy)}
                />
              </ModalField>
            </>
            );
          }}
        />
      </div>
    </SectionShell>
  );
}
