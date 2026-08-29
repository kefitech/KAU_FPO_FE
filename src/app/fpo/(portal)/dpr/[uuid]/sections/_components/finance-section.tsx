"use client";

import { useWatch } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDprSectionForm } from "@/hooks/use-dpr-section-form";

import {
  ChoiceSelect,
  ModalField,
  ModalRow,
  NestedListCard,
} from "./nested-list";
import { SectionShell } from "./section-shell";

/**
 * §2.3.18 Finance — mega section, 70+ Decimal fields + 2 nested lists.
 * Field groups are rendered via config arrays to keep JSX compact.
 * Machinery / civil / manpower costs will be auto-populated by the calc engine
 * (Phase 4). For now the user can enter them manually.
 */

const LOAN_TYPES = [
  { value: "term_loan", label: "Term Loan" },
  { value: "working_capital", label: "Working Capital Loan" },
  { value: "composite", label: "Composite Loan" },
  { value: "cash_credit", label: "Cash Credit" },
  { value: "other", label: "Others" },
];
const REPAYMENT_FREQ = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half-yearly" },
  { value: "yearly", label: "Yearly" },
];
const SUBSIDY_STATUS = [
  { value: "not_applied", label: "Not Applied" },
  { value: "applied", label: "Applied" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "disbursed", label: "Disbursed" },
];

// Field groups per Cat
const COST_FIELDS: Array<[string, string]> = [
  ["cost_land_purchase", "Land purchase"],
  ["cost_land_development", "Land development"],
  ["cost_civil_works", "Civil works"],
  ["cost_buildings", "Buildings"],
  ["cost_plant_machinery", "Plant & machinery"],
  ["cost_equipment", "Equipment"],
  ["cost_utilities", "Utilities"],
  ["cost_other_capex", "Other capex"],
  ["cost_site_development", "Site development"],
  ["cost_furniture_fixtures", "Furniture & fixtures"],
  ["cost_office_equipment", "Office equipment"],
  ["cost_vehicles", "Vehicles"],
  ["cost_electrification", "Electrification"],
  ["cost_water_supply", "Water supply"],
  ["cost_pre_operative_expenses", "Pre-operative"],
  ["cost_preliminary_expenses", "Preliminary"],
  ["cost_technical_consultancy", "Technical consultancy"],
  ["cost_contingencies", "Contingencies"],
  ["cost_margin_for_working_capital", "Margin for WC"],
];
const MOF_FIELDS: Array<[string, string]> = [
  ["mof_promoters_contribution", "Promoter's contribution"],
  ["mof_bank_term_loan", "Bank term loan"],
  ["mof_government_grant", "Government grant"],
  ["mof_government_subsidy", "Government subsidy"],
  ["mof_other_sources", "Other sources"],
  ["mof_share_capital", "Share capital"],
  ["mof_internal_accruals", "Internal accruals"],
  ["mof_working_capital_loan", "Working capital loan"],
  ["mof_venture_capital", "Venture capital"],
  ["mof_csr_support", "CSR support"],
  ["mof_nabard_assistance", "NABARD assistance"],
  ["mof_other_financial_assistance", "Other financial assistance"],
];
const WC_FIELDS: Array<[string, string]> = [
  ["wc_raw_materials", "Raw materials"],
  ["wc_labour_salaries", "Labour & salaries"],
  ["wc_utilities", "Utilities"],
  ["wc_transportation", "Transportation"],
  ["wc_admin_expenses", "Administration"],
  ["wc_marketing_expenses", "Marketing"],
  ["wc_packaging_materials", "Packaging"],
  ["wc_consumables", "Consumables"],
  ["wc_repairs_maintenance", "Repairs & maintenance"],
  ["wc_miscellaneous", "Miscellaneous"],
];
const OP_FIELDS: Array<[string, string]> = [
  ["op_raw_material", "Raw material"],
  ["op_salaries_wages", "Salaries & wages"],
  ["op_electricity", "Electricity"],
  ["op_water", "Water"],
  ["op_fuel", "Fuel"],
  ["op_transportation", "Transportation"],
  ["op_packaging", "Packaging"],
  ["op_repairs_maintenance", "Repairs & maintenance"],
  ["op_insurance", "Insurance"],
  ["op_admin_expenses", "Admin"],
  ["op_marketing_expenses", "Marketing"],
  ["op_communication", "Communication"],
  ["op_professional_charges", "Professional charges"],
  ["op_miscellaneous", "Miscellaneous"],
];
const ASSUMPTIONS_FIELDS: Array<[string, string]> = [
  ["inflation_rate_pct", "Inflation (%)"],
  ["raw_material_price_increase_pct", "Raw material price rise (%)"],
  ["selling_price_increase_pct", "Selling price rise (%)"],
  ["salary_escalation_pct", "Salary escalation (%)"],
  ["electricity_tariff_increase_pct", "Electricity tariff rise (%)"],
  ["fuel_price_increase_pct", "Fuel price rise (%)"],
];

const decimalNullable = z.union([z.string(), z.number()]).nullable();
const intNullable = z.union([z.string(), z.number()]).nullable();

const RevenueSchema = z.object({
  id: z.number().optional(),
  order: z.number(),
  product_name: z.string(),
  year1_sales_quantity: decimalNullable,
  expected_selling_price: decimalNullable,
  expected_annual_growth_rate_pct: decimalNullable,
  annual_sales_revenue: decimalNullable,
});
type Revenue = z.infer<typeof RevenueSchema>;

const YearHistorySchema = z.object({
  id: z.number().optional(),
  year: z.union([z.string(), z.number()]),
  annual_turnover: decimalNullable,
  net_profit: decimalNullable,
  total_assets: decimalNullable,
  total_liabilities: decimalNullable,
  net_worth: decimalNullable,
  existing_loans: decimalNullable,
  existing_repayment_obligations: decimalNullable,
});
type YearHistory = z.infer<typeof YearHistorySchema>;

const Schema = z.object({
  // A. Cost
  cost_land_purchase: decimalNullable, cost_land_development: decimalNullable,
  cost_civil_works: decimalNullable, cost_buildings: decimalNullable,
  cost_plant_machinery: decimalNullable, cost_equipment: decimalNullable,
  cost_utilities: decimalNullable, cost_other_capex: decimalNullable,
  cost_site_development: decimalNullable, cost_furniture_fixtures: decimalNullable,
  cost_office_equipment: decimalNullable, cost_vehicles: decimalNullable,
  cost_electrification: decimalNullable, cost_water_supply: decimalNullable,
  cost_pre_operative_expenses: decimalNullable, cost_preliminary_expenses: decimalNullable,
  cost_technical_consultancy: decimalNullable, cost_contingencies: decimalNullable,
  cost_margin_for_working_capital: decimalNullable,
  // B. MoF
  mof_promoters_contribution: decimalNullable, mof_bank_term_loan: decimalNullable,
  mof_government_grant: decimalNullable, mof_government_subsidy: decimalNullable,
  mof_other_sources: decimalNullable, mof_share_capital: decimalNullable,
  mof_internal_accruals: decimalNullable, mof_working_capital_loan: decimalNullable,
  mof_venture_capital: decimalNullable, mof_csr_support: decimalNullable,
  mof_nabard_assistance: decimalNullable, mof_other_financial_assistance: decimalNullable,
  // C. WC
  wc_raw_materials: decimalNullable, wc_labour_salaries: decimalNullable,
  wc_utilities: decimalNullable, wc_transportation: decimalNullable,
  wc_admin_expenses: decimalNullable, wc_marketing_expenses: decimalNullable,
  wc_packaging_materials: decimalNullable, wc_consumables: decimalNullable,
  wc_repairs_maintenance: decimalNullable, wc_miscellaneous: decimalNullable,
  credit_period_from_suppliers_days: intNullable,
  credit_period_to_customers_days: intNullable,
  inventory_holding_period_days: intNullable,
  cash_requirement: decimalNullable,
  working_capital_cycle_days: intNullable,
  // D. Opex
  op_raw_material: decimalNullable, op_salaries_wages: decimalNullable,
  op_electricity: decimalNullable, op_water: decimalNullable, op_fuel: decimalNullable,
  op_transportation: decimalNullable, op_packaging: decimalNullable,
  op_repairs_maintenance: decimalNullable, op_insurance: decimalNullable,
  op_admin_expenses: decimalNullable, op_marketing_expenses: decimalNullable,
  op_communication: decimalNullable, op_professional_charges: decimalNullable,
  op_miscellaneous: decimalNullable,
  // E. Revenue nested
  revenue_assumptions: z.array(RevenueSchema),
  // F. Loan
  loan_proposed: z.boolean(),
  loan_amount: decimalNullable,
  loan_type: z.string(),
  loan_type_other: z.string(),
  lending_institution: z.string(),
  rate_of_interest: decimalNullable,
  moratorium_period_months: intNullable,
  repayment_period_years: intNullable,
  repayment_frequency: z.string(),
  // G. Subsidy
  subsidy_proposed: z.boolean(),
  subsidy_scheme_name: z.string(),
  implementing_agency: z.string(),
  expected_subsidy_amount: decimalNullable,
  basis_of_eligibility: z.string(),
  application_status: z.string(),
  // H. Existing
  is_operational: z.boolean(),
  latest_annual_turnover: decimalNullable,
  latest_net_profit_loss: decimalNullable,
  year_history: z.array(YearHistorySchema),
  // I. Assumptions
  inflation_rate_pct: decimalNullable,
  raw_material_price_increase_pct: decimalNullable,
  selling_price_increase_pct: decimalNullable,
  salary_escalation_pct: decimalNullable,
  electricity_tariff_increase_pct: decimalNullable,
  fuel_price_increase_pct: decimalNullable,
  // Extras
  existing_market_price: decimalNullable,
  competitor_price: decimalNullable,
  expected_annual_price_increase_pct: decimalNullable,
  credit_sales_pct: decimalNullable,
  cash_sales_pct: decimalNullable,
  pricing_basis: z.string(),
  pricing_basis_other: z.string(),
  promotional_pricing_notes: z.string(),
  seasonal_price_variation: z.string(),
});
type Data = z.infer<typeof Schema>;

const allDecimalFields: (keyof Data)[] = [
  ...(COST_FIELDS.map((f) => f[0]) as (keyof Data)[]),
  ...(MOF_FIELDS.map((f) => f[0]) as (keyof Data)[]),
  ...(WC_FIELDS.map((f) => f[0]) as (keyof Data)[]),
  ...(OP_FIELDS.map((f) => f[0]) as (keyof Data)[]),
  ...(ASSUMPTIONS_FIELDS.map((f) => f[0]) as (keyof Data)[]),
  "existing_market_price", "competitor_price", "expected_annual_price_increase_pct",
  "credit_sales_pct", "cash_sales_pct",
  "loan_amount", "rate_of_interest",
  "expected_subsidy_amount", "latest_annual_turnover", "latest_net_profit_loss",
  "cash_requirement",
];

function toDec(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? String(n) : null;
}
function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function serializePayload(v: Data): Record<string, unknown> {
  const out: Record<string, unknown> = { ...v };
  for (const k of allDecimalFields) out[k] = toDec((v as Record<string, unknown>)[k]);
  out.credit_period_from_suppliers_days = toInt(v.credit_period_from_suppliers_days);
  out.credit_period_to_customers_days = toInt(v.credit_period_to_customers_days);
  out.inventory_holding_period_days = toInt(v.inventory_holding_period_days);
  out.working_capital_cycle_days = toInt(v.working_capital_cycle_days);
  out.moratorium_period_months = toInt(v.moratorium_period_months);
  out.repayment_period_years = toInt(v.repayment_period_years);
  out.revenue_assumptions = v.revenue_assumptions.map((r, i) => ({
    ...r, order: i,
    year1_sales_quantity: toDec(r.year1_sales_quantity),
    expected_selling_price: toDec(r.expected_selling_price),
    expected_annual_growth_rate_pct: toDec(r.expected_annual_growth_rate_pct),
    annual_sales_revenue: toDec(r.annual_sales_revenue),
  }));
  out.year_history = v.year_history.map((h) => ({
    ...h,
    year: toInt(h.year),
    annual_turnover: toDec(h.annual_turnover),
    net_profit: toDec(h.net_profit),
    total_assets: toDec(h.total_assets),
    total_liabilities: toDec(h.total_liabilities),
    net_worth: toDec(h.net_worth),
    existing_loans: toDec(h.existing_loans),
    existing_repayment_obligations: toDec(h.existing_repayment_obligations),
  }));
  return out;
}

function buildDefaults(): Data {
  const nulls: Record<string, null> = {};
  for (const k of allDecimalFields) nulls[k] = null;
  return {
    ...(nulls as unknown as Data),
    credit_period_from_suppliers_days: null,
    credit_period_to_customers_days: null,
    inventory_holding_period_days: null,
    working_capital_cycle_days: null,
    cash_requirement: null,
    promotional_pricing_notes: "",
    seasonal_price_variation: "",
    loan_proposed: false,
    loan_type: "",
    loan_type_other: "",
    lending_institution: "",
    moratorium_period_months: null,
    repayment_period_years: null,
    repayment_frequency: "",
    pricing_basis: "",
    pricing_basis_other: "",
    subsidy_proposed: false,
    subsidy_scheme_name: "",
    implementing_agency: "",
    basis_of_eligibility: "",
    application_status: "",
    is_operational: false,
    revenue_assumptions: [],
    year_history: [],
  };
}

export function FinanceSection({ uuid }: { uuid: string }) {
  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, fieldErrors, fieldWarnings, save, discard } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "finance",
    schema: Schema,
    defaultValues: buildDefaults(),
    serializePayload,
  });

  // useWatch — reactive subscriptions (form.watch is stale after form.reset).
  const revenue = useWatch({ control: form.control, name: "revenue_assumptions" }) ?? [];
  const yearHistory = useWatch({ control: form.control, name: "year_history" }) ?? [];
  const loanProposed = useWatch({ control: form.control, name: "loan_proposed" });
  const subsidyProposed = useWatch({ control: form.control, name: "subsidy_proposed" });
  const isOperational = useWatch({ control: form.control, name: "is_operational" });
  const loanType = useWatch({ control: form.control, name: "loan_type" });
  const repaymentFreq = useWatch({ control: form.control, name: "repayment_frequency" });
  const applicationStatus = useWatch({ control: form.control, name: "application_status" });

  // Watch every field so totals update instantly on every keystroke.
  // Cost total vs MoF total live-comparison lets the user reconcile without
  // waiting for the 5s autosave → readiness refetch cycle.
  const allValues = useWatch({ control: form.control });
  const sumFields = (fields: Array<[string, string]>) =>
    fields.reduce((s, [k]) => {
      const v = (allValues as Record<string, unknown> | undefined)?.[k];
      if (v === null || v === undefined || v === "") return s;
      const n = typeof v === "number" ? v : Number(v);
      return s + (Number.isFinite(n) ? n : 0);
    }, 0);
  const costTotal = sumFields(COST_FIELDS);
  const mofTotal = sumFields(MOF_FIELDS);
  const mofDelta = mofTotal - costTotal;
  const fmtInr = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

  const renderCurrencyGrid = (fields: Array<[string, string]>) => (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map(([key, label]) => (
        <div key={key} className="space-y-1">
          <Label className="text-xs">{label} (₹)</Label>
          <Input
            type="number"
            step="0.01"
            {...form.register(key as keyof Data)}
          />
        </div>
      ))}
    </div>
  );

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="finance"
      loading={isLoading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
    >
      <div className="space-y-4">
        {/* A. Cost */}
        <Card><CardContent className="space-y-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">A. Estimated Project Cost</h3>
            <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs">Total: ₹{fmtInr(costTotal)}</span>
          </div>
          <p className="text-xs text-muted-foreground">Machinery / civil / manpower costs may be auto-populated by the system at DPR generation.</p>
          {renderCurrencyGrid(COST_FIELDS)}
        </CardContent></Card>

        {/* B. Means of Finance */}
        <Card><CardContent className="space-y-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className={`text-sm font-semibold ${fieldErrors.has("mof_total") ? "text-destructive" : ""}`}>B. Means of Finance</h3>
            {/* Live totals + delta — green when balanced, amber otherwise. */}
            <div className="flex flex-wrap gap-1.5 font-mono text-xs">
              <span className="rounded-md bg-muted px-2 py-1">MoF: ₹{fmtInr(mofTotal)}</span>
              <span className="rounded-md bg-muted px-2 py-1">Cost: ₹{fmtInr(costTotal)}</span>
              {costTotal > 0 && mofTotal > 0 && (
                Math.abs(mofDelta) < 1 ? (
                  <span className="rounded-md bg-emerald-100 px-2 py-1 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">Balanced ✓</span>
                ) : (
                  <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                    {mofDelta > 0 ? `MoF over by ₹${fmtInr(mofDelta)}` : `MoF short by ₹${fmtInr(-mofDelta)}`}
                  </span>
                )
              )}
            </div>
          </div>
          {fieldErrors.has("mof_total") && (
            <p className="text-xs text-destructive">{fieldErrors.get("mof_total")}</p>
          )}
          {!fieldErrors.has("mof_total") && fieldWarnings.has("mof_total") && (
            <p className="text-xs text-amber-600 dark:text-amber-500">{fieldWarnings.get("mof_total")}</p>
          )}
          <p className="text-xs text-muted-foreground">Total MoF should equal total project cost — system flags mismatches during DPR generation.</p>
          {renderCurrencyGrid(MOF_FIELDS)}
        </CardContent></Card>

        {/* C. Working Capital */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">C. Working Capital Requirement (annual)</h3>
          {renderCurrencyGrid(WC_FIELDS)}
          <div className="grid gap-3 sm:grid-cols-3 pt-2">
            <div className="space-y-1"><Label className="text-xs">Credit from suppliers (days)</Label><Input type="number" min="0" {...form.register("credit_period_from_suppliers_days")} /></div>
            <div className="space-y-1"><Label className="text-xs">Credit to customers (days)</Label><Input type="number" min="0" {...form.register("credit_period_to_customers_days")} /></div>
            <div className="space-y-1"><Label className="text-xs">Inventory holding (days)</Label><Input type="number" min="0" {...form.register("inventory_holding_period_days")} /></div>
          </div>
        </CardContent></Card>

        {/* D. Operating Expenses */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">D. Annual Operating Expenses</h3>
          {renderCurrencyGrid(OP_FIELDS)}
        </CardContent></Card>

        {/* E. Revenue Assumptions */}
        <NestedListCard<Revenue>
          title="E. Revenue Assumptions (per product)"
          items={revenue}
          onChange={(next) => form.setValue("revenue_assumptions", next, { shouldDirty: true })}
          emptyRow={{ order: 0, product_name: "", year1_sales_quantity: null, expected_selling_price: null, expected_annual_growth_rate_pct: null, annual_sales_revenue: null }}
          columns={[
            { key: "product_name", label: "Product" },
            { key: "year1_sales_quantity", label: "Yr1 qty" },
            { key: "expected_selling_price", label: "Price (₹)" },
            { key: "annual_sales_revenue", label: "Annual revenue" },
          ]}
          isValid={(row) => row.product_name.trim().length > 0}
          addLabel="Add revenue assumption"
          editLabel="Edit revenue assumption"
          error={fieldErrors.get("revenue_assumptions")}
          warning={fieldWarnings.get("revenue_assumptions")}
          renderModal={(row, set) => (
            <>
              <ModalField label="Product name *"><Input value={row.product_name} onChange={(e) => set("product_name", e.target.value)} /></ModalField>
              <ModalRow>
                <ModalField label="Year 1 sales quantity *"><Input type="number" step="0.001" value={row.year1_sales_quantity ?? ""} onChange={(e) => set("year1_sales_quantity", e.target.value || null)} /></ModalField>
                <ModalField label="Expected selling price / unit (₹) *"><Input type="number" step="0.01" value={row.expected_selling_price ?? ""} onChange={(e) => set("expected_selling_price", e.target.value || null)} /></ModalField>
              </ModalRow>
              <ModalRow>
                <ModalField label="Annual growth rate (%)"><Input type="number" step="0.01" value={row.expected_annual_growth_rate_pct ?? ""} onChange={(e) => set("expected_annual_growth_rate_pct", e.target.value || null)} /></ModalField>
                <ModalField label="Annual sales revenue (₹)"><Input type="number" step="0.01" value={row.annual_sales_revenue ?? ""} onChange={(e) => set("annual_sales_revenue", e.target.value || null)} /></ModalField>
              </ModalRow>
            </>
          )}
        />

        {/* F. Loan */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">F. Loan Details</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={loanProposed} onCheckedChange={(c) => form.setValue("loan_proposed", !!c, { shouldDirty: true })} />
            Bank loan proposed
          </label>
          {loanProposed && (
            <div className="grid gap-3 border-l-2 border-primary/30 pl-4 sm:grid-cols-2">
              <div className="space-y-1"><Label className="text-xs">Loan amount (₹) *</Label><Input type="number" step="0.01" {...form.register("loan_amount")} /></div>
              <div className="space-y-1"><Label className="text-xs">Loan type</Label><ChoiceSelect value={loanType ?? ""} options={LOAN_TYPES} onChange={(v) => form.setValue("loan_type", v, { shouldDirty: true })} /></div>
              <div className="space-y-1"><Label className="text-xs">Lending institution</Label><Input {...form.register("lending_institution")} /></div>
              <div className="space-y-1"><Label className="text-xs">Rate of interest (%)</Label><Input type="number" step="0.01" {...form.register("rate_of_interest")} /></div>
              <div className="space-y-1"><Label className="text-xs">Moratorium (months)</Label><Input type="number" min="0" {...form.register("moratorium_period_months")} /></div>
              <div className="space-y-1"><Label className="text-xs">Repayment period (years)</Label><Input type="number" min="0" {...form.register("repayment_period_years")} /></div>
              <div className="space-y-1"><Label className="text-xs">Repayment frequency</Label><ChoiceSelect value={repaymentFreq ?? ""} options={REPAYMENT_FREQ} onChange={(v) => form.setValue("repayment_frequency", v, { shouldDirty: true })} /></div>
            </div>
          )}
        </CardContent></Card>

        {/* G. Subsidy */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">G. Subsidy / Financial Assistance</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={subsidyProposed} onCheckedChange={(c) => form.setValue("subsidy_proposed", !!c, { shouldDirty: true })} />
            Subsidy or financial assistance proposed
          </label>
          {subsidyProposed && (
            <div className="space-y-3 border-l-2 border-primary/30 pl-4">
              <div className="space-y-1"><Label className="text-xs">Name of scheme *</Label><Input {...form.register("subsidy_scheme_name")} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1"><Label className="text-xs">Implementing agency</Label><Input {...form.register("implementing_agency")} /></div>
                <div className="space-y-1"><Label className="text-xs">Expected subsidy amount (₹)</Label><Input type="number" step="0.01" {...form.register("expected_subsidy_amount")} /></div>
                <div className="space-y-1"><Label className="text-xs">Basis of eligibility</Label><Input {...form.register("basis_of_eligibility")} /></div>
                <div className="space-y-1"><Label className="text-xs">Current status</Label><ChoiceSelect value={applicationStatus ?? ""} options={SUBSIDY_STATUS} onChange={(v) => form.setValue("application_status", v, { shouldDirty: true })} /></div>
              </div>
            </div>
          )}
        </CardContent></Card>

        {/* H. Existing Financial Position */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">H. Existing Financial Position</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={isOperational} onCheckedChange={(c) => form.setValue("is_operational", !!c, { shouldDirty: true })} />
            FPO is already operational
          </label>
          {isOperational && (
            <>
              <div className="grid gap-3 border-l-2 border-primary/30 pl-4 sm:grid-cols-2">
                <div className="space-y-1"><Label className="text-xs">Latest annual turnover (₹) *</Label><Input type="number" step="0.01" {...form.register("latest_annual_turnover")} /></div>
                <div className="space-y-1"><Label className="text-xs">Latest net profit / loss (₹)</Label><Input type="number" step="0.01" {...form.register("latest_net_profit_loss")} /></div>
              </div>

              <NestedListCard<YearHistory>
                title="H. Financial History (last 3 years)"
                items={yearHistory}
                onChange={(next) => form.setValue("year_history", next, { shouldDirty: true })}
                emptyRow={{ year: new Date().getFullYear() - 1, annual_turnover: null, net_profit: null, total_assets: null, total_liabilities: null, net_worth: null, existing_loans: null, existing_repayment_obligations: null }}
                columns={[
                  { key: "year", label: "Year" },
                  { key: "annual_turnover", label: "Turnover" },
                  { key: "net_profit", label: "Net profit" },
                  { key: "net_worth", label: "Net worth" },
                ]}
                isValid={(row) => Number(row.year) > 2000}
                addLabel="Add year"
                editLabel="Edit year"
                renderModal={(row, set) => (
                  <>
                    <ModalField label="Financial year *"><Input type="number" min="2000" value={String(row.year)} onChange={(e) => set("year", e.target.value)} /></ModalField>
                    <ModalRow>
                      <ModalField label="Annual turnover (₹)"><Input type="number" step="0.01" value={row.annual_turnover ?? ""} onChange={(e) => set("annual_turnover", e.target.value || null)} /></ModalField>
                      <ModalField label="Net profit (₹)"><Input type="number" step="0.01" value={row.net_profit ?? ""} onChange={(e) => set("net_profit", e.target.value || null)} /></ModalField>
                    </ModalRow>
                    <ModalRow>
                      <ModalField label="Total assets (₹)"><Input type="number" step="0.01" value={row.total_assets ?? ""} onChange={(e) => set("total_assets", e.target.value || null)} /></ModalField>
                      <ModalField label="Total liabilities (₹)"><Input type="number" step="0.01" value={row.total_liabilities ?? ""} onChange={(e) => set("total_liabilities", e.target.value || null)} /></ModalField>
                    </ModalRow>
                    <ModalRow>
                      <ModalField label="Net worth (₹)"><Input type="number" step="0.01" value={row.net_worth ?? ""} onChange={(e) => set("net_worth", e.target.value || null)} /></ModalField>
                      <ModalField label="Existing loans (₹)"><Input type="number" step="0.01" value={row.existing_loans ?? ""} onChange={(e) => set("existing_loans", e.target.value || null)} /></ModalField>
                    </ModalRow>
                    <ModalField label="Existing repayment obligations (₹)"><Input type="number" step="0.01" value={row.existing_repayment_obligations ?? ""} onChange={(e) => set("existing_repayment_obligations", e.target.value || null)} /></ModalField>
                  </>
                )}
              />
            </>
          )}
        </CardContent></Card>

        {/* I. Financial Assumptions */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">I. Financial Assumptions</h3>
          <p className="text-xs text-muted-foreground">System defaults are applied where left blank. Override any value here to override the default for this project.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ASSUMPTIONS_FIELDS.map(([k, l]) => (
              <div key={k} className="space-y-1">
                <Label className="text-xs">{l}</Label>
                <Input type="number" step="0.01" {...form.register(k as keyof Data)} />
              </div>
            ))}
          </div>
        </CardContent></Card>

        {/* Pricing strategy shared (used for cross-checks with Market) */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">Additional pricing notes (optional)</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label className="text-xs">Promotional pricing notes</Label><Textarea rows={2} {...form.register("promotional_pricing_notes")} /></div>
            <div className="space-y-1"><Label className="text-xs">Seasonal price variation notes</Label><Textarea rows={2} {...form.register("seasonal_price_variation")} /></div>
          </div>
        </CardContent></Card>
      </div>
    </SectionShell>
  );
}
