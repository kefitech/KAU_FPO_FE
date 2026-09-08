"use client";

import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Copy, Info, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useDprSectionForm } from "@/hooks/use-dpr-section-form";
import { dprApi } from "@/lib/api/dpr";
import { dprTranchesApi } from "@/lib/api/dpr-tranches";

import { CountedTextarea } from "./counted-textarea";
import { normaliseDecimalInput, normaliseIntegerInput } from "./dpr-input-normalisers";
import { LabelWithBadge } from "./label-with-badge";
import {
  ModalField,
  ModalRow,
  NestedListCard,
} from "./nested-list";
import { SectionHelp } from "./section-help";
import { SectionShell } from "./section-shell";

/**
 * §2.3.18 Finance — mega section, 70+ Decimal fields + 2 nested lists.
 * Field groups are rendered via config arrays to keep JSX compact.
 * Machinery / civil / manpower costs will be auto-populated by the calc engine
 * (Phase 4). For now the user can enter them manually.
 */

// ── Source hints — live preview of the calc-engine reconciliation ─────────
//
// Cat A of Finance is the master project-cost breakdown that the calc engine
// uses to bucket assets into depreciation classes and total project cost.
// Machinery / Civil / Manpower fill the same amounts from their own sections
// (per KAU spec §2.3.14 / §2.3.15 / §2.3.17). The auto-populate step happens
// at DPR generation time inside `apps/fpo/services/dpr/calculation.py` —
// this hook mirrors that reconciliation LIVE, so the FPO can see the number
// as it stands in the source section and one-click copy it into Finance Cat A.
//
// No BE surface added: we just fetch the 4 sections that already exist and
// sum their arrays here. Cached 30s per React Query default; will always match
// what the calc engine sees at generation time.
type FinanceSourceInfo = {
  amount: number;
  label: string;      // shown to the user, e.g. "Machinery A: 3 items"
  sectionKey: string; // deep-link target
};
type FinanceSourceMap = Record<string, FinanceSourceInfo | undefined>;

function useFinanceSourceHints(uuid: string): {
  sources: FinanceSourceMap;
  investmentEstimate: number | null;
  investmentBasis: string;
  isLoading: boolean;
} {
  const investmentQ = useQuery({
    queryKey: ["dpr-section", uuid, "investment"],
    queryFn: () => dprApi.getSection(uuid, "investment"),
    staleTime: 30_000,
  });
  const civilQ = useQuery({
    queryKey: ["dpr-section", uuid, "civil"],
    queryFn: () => dprApi.getSection(uuid, "civil"),
    staleTime: 30_000,
  });
  const machineryQ = useQuery({
    queryKey: ["dpr-section", uuid, "machinery"],
    queryFn: () => dprApi.getSection(uuid, "machinery"),
    staleTime: 30_000,
  });
  const hrQ = useQuery({
    queryKey: ["dpr-section", uuid, "hr"],
    queryFn: () => dprApi.getSection(uuid, "hr"),
    staleTime: 30_000,
  });

  const sources = useMemo<FinanceSourceMap>(() => {
    const map: FinanceSourceMap = {};
    const numify = (v: unknown): number => {
      if (v === null || v === undefined || v === "") return 0;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    // ── Civil (§2.3.14) → Finance Cat A ──
    const civil = civilQ.data as Record<string, unknown> | undefined;
    if (civil) {
      // Cat B proposed_buildings — sum of estimated_construction_cost per row
      const proposedBuildings = (civil.proposed_buildings as Array<Record<string, unknown>> | undefined) ?? [];
      const proposedBuildingsSum = proposedBuildings.reduce(
        (s, b) => s + numify(b.estimated_construction_cost), 0);
      if (proposedBuildingsSum > 0) {
        map.cost_buildings = {
          amount: proposedBuildingsSum,
          label: `Civil B — ${proposedBuildings.length} proposed building${proposedBuildings.length === 1 ? "" : "s"}`,
          sectionKey: "civil",
        };
      }
      // Cat D card cost lines
      const civilD = numify(civil.cost_building_construction);
      if (civilD > 0 && !map.cost_buildings) {
        map.cost_buildings = {
          amount: civilD,
          label: "Civil D — Building construction",
          sectionKey: "civil",
        };
      }
      const civilWorks = numify(civil.cost_internal_roads) + numify(civil.cost_compound_wall) + numify(civil.cost_drainage);
      if (civilWorks > 0) {
        map.cost_civil_works = {
          amount: civilWorks,
          label: "Civil D — Internal roads + Compound wall + Drainage",
          sectionKey: "civil",
        };
      }
      const siteDev = numify(civil.cost_site_development);
      if (siteDev > 0) {
        map.cost_site_development = {
          amount: siteDev,
          label: "Civil D — Site development",
          sectionKey: "civil",
        };
      }
      const electrical = numify(civil.cost_electrical);
      if (electrical > 0) {
        map.cost_electrification = {
          amount: electrical,
          label: "Civil D — Electrical",
          sectionKey: "civil",
        };
      }
      const water = numify(civil.cost_water_supply);
      if (water > 0) {
        map.cost_water_supply = {
          amount: water,
          label: "Civil D — Water supply",
          sectionKey: "civil",
        };
      }
    }

    // ── Machinery (§2.3.15) → Finance Cat A ──
    const machinery = machineryQ.data as Record<string, unknown> | undefined;
    if (machinery) {
      const items = (machinery.items as Array<Record<string, unknown>> | undefined) ?? [];
      const machineryTotal = items.reduce(
        (s, it) => s + numify(it.unit_cost) * (numify(it.quantity_required) || 1), 0);
      if (machineryTotal > 0) {
        map.cost_plant_machinery = {
          amount: machineryTotal,
          label: `Machinery A — ${items.length} item${items.length === 1 ? "" : "s"} (unit cost × qty)`,
          sectionKey: "machinery",
        };
      }
      const supporting = (machinery.supporting_assets as Array<Record<string, unknown>> | undefined) ?? [];
      const supportingTotal = supporting.reduce((s, a) => s + numify(a.estimated_cost), 0);
      if (supportingTotal > 0) {
        map.cost_equipment = {
          amount: supportingTotal,
          label: `Machinery H — ${supporting.length} supporting asset${supporting.length === 1 ? "" : "s"}`,
          sectionKey: "machinery",
        };
      }
    }

    // ── HR (§2.3.17) → Finance C (WC) + D (OpEx) ──
    const hr = hrQ.data as Record<string, unknown> | undefined;
    if (hr) {
      const empCategories = (hr.employee_categories as Array<Record<string, unknown>> | undefined) ?? [];
      const salaryTotal = empCategories.reduce((s, e) => s + numify(e.annual_salary), 0);
      if (salaryTotal > 0) {
        map.op_salaries_wages = {
          amount: salaryTotal,
          label: `HR B — ${empCategories.length} employee categor${empCategories.length === 1 ? "y" : "ies"} (annual salary)`,
          sectionKey: "hr",
        };
        map.wc_labour_salaries = {
          amount: salaryTotal,
          label: `HR B — ${empCategories.length} employee categor${empCategories.length === 1 ? "y" : "ies"} (annual salary)`,
          sectionKey: "hr",
        };
      }
      const training = (hr.training_requirements as Array<Record<string, unknown>> | undefined) ?? [];
      const trainingTotal = training.reduce((s, t) => s + numify(t.estimated_cost), 0);
      if (trainingTotal > 0) {
        map.cost_pre_operative_expenses = {
          amount: trainingTotal,
          label: `HR E — ${training.length} training programme${training.length === 1 ? "" : "s"}`,
          sectionKey: "hr",
        };
      }
    }

    return map;
  }, [civilQ.data, machineryQ.data, hrQ.data]);

  const investment = investmentQ.data as Record<string, unknown> | undefined;
  const investmentEstimateRaw = investment?.estimated_project_cost;
  const investmentEstimate =
    investmentEstimateRaw === null || investmentEstimateRaw === undefined || investmentEstimateRaw === ""
      ? null
      : Number(investmentEstimateRaw);
  const investmentBasis = String(investment?.basis_of_estimate ?? "");

  return {
    sources,
    investmentEstimate: investmentEstimate !== null && Number.isFinite(investmentEstimate) ? investmentEstimate : null,
    investmentBasis,
    isLoading: investmentQ.isLoading || civilQ.isLoading || machineryQ.isLoading || hrQ.isLoading,
  };
}

// ── Asset-class groups — mirrors calculation.py COST_FIELD_TO_ASSET_CLASS ──
// Splits Cat A's 19 flat lines into the same buckets the calc engine uses at
// depreciation time so the FPO sees WHY each line matters.
const COST_GROUPS: Array<{ key: string; label: string; note?: string; fields: string[] }> = [
  { key: "land",         label: "Land (non-depreciable)", note: "Never depreciated — carried at cost", fields: ["cost_land_purchase", "cost_land_development"] },
  { key: "buildings",    label: "Buildings & Civil Works", note: "Depreciated SLM as per DPR config", fields: ["cost_civil_works", "cost_buildings", "cost_site_development"] },
  { key: "machinery",    label: "Plant & Machinery",       note: "Depreciated SLM as per DPR config",  fields: ["cost_plant_machinery"] },
  { key: "equipment",    label: "Equipment & Others",      note: "Depreciated SLM as per DPR config",  fields: ["cost_equipment", "cost_furniture_fixtures", "cost_office_equipment", "cost_vehicles", "cost_electrification", "cost_water_supply", "cost_utilities"] },
  { key: "pre_operative", label: "Pre-operative & Preliminary", note: "Amortised over projection period", fields: ["cost_pre_operative_expenses", "cost_preliminary_expenses", "cost_technical_consultancy", "cost_contingencies"] },
  { key: "other",        label: "Other Capex",             note: "Not depreciated",                    fields: ["cost_other_capex"] },
  { key: "wc_margin",    label: "Working Capital Margin",  note: "Excluded from depreciation — routed to WC", fields: ["cost_margin_for_working_capital"] },
];

// ── Input caps — mirror backend DPRSectionFinance + child tables ──
const MAX_TEXT_CHARS = 200;
const MAX_LONG_CHARS = 300;                // lending_institution, subsidy_scheme_name, implementing_agency
const MAX_FY_CHARS = 10;                   // financial_year "2024-25"
const MAX_LONG_TEXT_CHARS = 2000;          // TextField defensive cap
// Cost fields — Decimal(18, 2). Cap at ₹1000 crore.
const MAX_COST_INR = 10_000_000_000;
// Percentages — Decimal(5, 2). Realistic 0–100.
const MAX_PCT = 100;
// Days — realistic 0–3650 (10 years).
const MAX_DAYS = 3650;
// Loan tenure — realistic 0–360 months / 0–30 years.
const MAX_MORATORIUM_MONTHS = 360;
const MAX_REPAYMENT_YEARS = 30;

// ── Choices ────────────────────────────────────────────────────────────────

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
  // KAU pre-UAT reply §2.6 — IDC capitalised (allocated pro-rata across
  // depreciable classes by the calc engine).
  ["cost_interest_during_construction", "Interest During Construction"],
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
  // BE field name is `financial_year` (string like "2024-25") — matches the
  // model. Previously FE sent `year` (number) which DRF silently stripped.
  financial_year: z.string(),
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
  // KAU pre-UAT reply §2.6 — Interest During Construction, capitalised.
  cost_interest_during_construction: decimalNullable,
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
  // KAU pre-UAT reply §2.4 — seasonal WC uplift (opt-in).
  wc_is_seasonal: z.boolean(),
  wc_peak_amount: decimalNullable,
  wc_peak_period_notes: z.string(),
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
  // F. Loan — BE column name is `rate_of_interest_pct` (was mis-named `rate_of_interest` before)
  loan_proposed: z.boolean(),
  loan_amount: decimalNullable,
  loan_type: z.string(),
  lending_institution: z.string(),
  rate_of_interest_pct: decimalNullable,
  moratorium_period_months: intNullable,
  repayment_period_years: intNullable,
  repayment_frequency: z.string(),
  // G. Subsidy — BE column names are `subsidy_implementing_agency` /
  // `subsidy_application_status` (was mis-named as short forms before).
  subsidy_proposed: z.boolean(),
  subsidy_scheme_name: z.string(),
  subsidy_implementing_agency: z.string(),
  expected_subsidy_amount: decimalNullable,
  basis_of_eligibility: z.string(),
  subsidy_application_status: z.string(),
  // H. Existing + year history nested
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
});
type Data = z.infer<typeof Schema>;

const allDecimalFields: (keyof Data)[] = [
  ...(COST_FIELDS.map((f) => f[0]) as (keyof Data)[]),
  ...(MOF_FIELDS.map((f) => f[0]) as (keyof Data)[]),
  ...(WC_FIELDS.map((f) => f[0]) as (keyof Data)[]),
  ...(OP_FIELDS.map((f) => f[0]) as (keyof Data)[]),
  ...(ASSUMPTIONS_FIELDS.map((f) => f[0]) as (keyof Data)[]),
  "loan_amount", "rate_of_interest_pct",
  "expected_subsidy_amount", "latest_annual_turnover", "latest_net_profit_loss",
  "cash_requirement",
  // KAU pre-UAT reply §2.4 + §2.6 fields — added 2026-09-09.
  "cost_interest_during_construction",
  "wc_peak_amount",
];

// ── Financial-year picker options ────────────────────────────────────────
//
// Indian financial year runs Apr → Mar. Format is "YYYY-YY" (e.g. "2024-25").
// Past 10 years cover realistic FPO history requests (a bank appraiser
// rarely cares beyond 5). Dropdown + used-year filter in the modal prevents
// duplicates entirely — backend still enforces unique_together but the UI
// catches it before the request even goes out.
const FY_YEARS_BACK = 10;
const FINANCIAL_YEAR_OPTIONS: { value: string; label: string }[] = (() => {
  const currentYear = new Date().getFullYear();
  const opts: { value: string; label: string }[] = [];
  for (let i = 1; i <= FY_YEARS_BACK; i++) {
    const startYear = currentYear - i;
    const label = `${startYear}-${String(startYear + 1).slice(-2)}`;
    opts.push({ value: label, label });
  }
  return opts;
})();

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

// ── Per-row validators (mirror finance_validators.py) ──────────────────

type RevenueErrors = Partial<Record<"product_name" | "year1_sales_quantity" | "expected_selling_price", string>>;
function validateRevenue(row: Revenue): RevenueErrors {
  const e: RevenueErrors = {};
  if (!(row.product_name ?? "").trim()) {
    e.product_name = "Product name is required.";
  }
  const q = row.year1_sales_quantity;
  const qNum = q !== null && q !== undefined && q !== "" ? Number(q) : null;
  if (qNum === null || !Number.isFinite(qNum) || qNum <= 0) {
    e.year1_sales_quantity = "Year 1 Sales Quantity shall be greater than zero.";
  }
  const p = row.expected_selling_price;
  const pNum = p !== null && p !== undefined && p !== "" ? Number(p) : null;
  if (pNum === null || !Number.isFinite(pNum) || pNum <= 0) {
    e.expected_selling_price = "Expected Selling Price shall be greater than zero.";
  }
  return e;
}

type YearHistoryErrors = Partial<Record<"financial_year", string>>;
function validateYearHistory(row: YearHistory): YearHistoryErrors {
  const e: YearHistoryErrors = {};
  if (!(row.financial_year ?? "").trim()) {
    e.financial_year = 'Financial year is required (e.g. "2024-25").';
  }
  return e;
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
    // Send the exact BE column name — `financial_year` is a string like "2024-25".
    financial_year: (h.financial_year ?? "").trim(),
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
    loan_proposed: false,
    loan_type: "",
    lending_institution: "",
    moratorium_period_months: null,
    repayment_period_years: null,
    repayment_frequency: "",
    subsidy_proposed: false,
    subsidy_scheme_name: "",
    subsidy_implementing_agency: "",
    basis_of_eligibility: "",
    subsidy_application_status: "",
    is_operational: false,
    // KAU §2.4 — seasonal WC uplift, off by default (annual-average behaviour).
    wc_is_seasonal: false,
    wc_peak_period_notes: "",
    revenue_assumptions: [],
    year_history: [],
  };
}

// ── Section component ─────────────────────────────────────────────────────

export function FinanceSection({ uuid }: { uuid: string }) {
  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, fieldErrors, fieldWarnings, save, saveAsync, discard } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "finance",
    schema: Schema,
    defaultValues: buildDefaults(),
    serializePayload,
  });

  // Source hints — reads Civil/Machinery/HR to compute per-line source sums,
  // and Investment for the top-line comparison panel.
  const { sources: sourceHints, investmentEstimate, investmentBasis } = useFinanceSourceHints(uuid);

  // useWatch — reactive subscriptions (form.watch is stale after form.reset).
  const revenue = useWatch({ control: form.control, name: "revenue_assumptions" }) ?? [];
  const yearHistory = useWatch({ control: form.control, name: "year_history" }) ?? [];
  const loanProposed = useWatch({ control: form.control, name: "loan_proposed" });
  const subsidyProposed = useWatch({ control: form.control, name: "subsidy_proposed" });
  const isOperational = useWatch({ control: form.control, name: "is_operational" });
  const loanType = useWatch({ control: form.control, name: "loan_type" });
  const repaymentFreq = useWatch({ control: form.control, name: "repayment_frequency" });
  const applicationStatus = useWatch({ control: form.control, name: "subsidy_application_status" });
  const loanAmount = useWatch({ control: form.control, name: "loan_amount" });
  const lendingInstitution = useWatch({ control: form.control, name: "lending_institution" }) ?? "";
  const rateOfInterest = useWatch({ control: form.control, name: "rate_of_interest_pct" });
  const moratoriumMonths = useWatch({ control: form.control, name: "moratorium_period_months" });
  const repaymentYears = useWatch({ control: form.control, name: "repayment_period_years" });
  const subsidySchemeName = useWatch({ control: form.control, name: "subsidy_scheme_name" }) ?? "";
  const subsidyImplementingAgency = useWatch({ control: form.control, name: "subsidy_implementing_agency" }) ?? "";
  const expectedSubsidyAmount = useWatch({ control: form.control, name: "expected_subsidy_amount" });
  const basisOfEligibility = useWatch({ control: form.control, name: "basis_of_eligibility" }) ?? "";
  const latestAnnualTurnover = useWatch({ control: form.control, name: "latest_annual_turnover" });
  const latestNetProfitLoss = useWatch({ control: form.control, name: "latest_net_profit_loss" });

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

  // Convenience setter — always includes shouldDirty: true.
  const setField = <K extends keyof Data>(name: K, value: Data[K]) =>
    form.setValue(name as never, value as never, { shouldDirty: true });

  // Section-level live errors — mirror finance_validators.py.
  // See HR section for why we prefer live over stale backend errors:
  // fieldErrors only refreshes AFTER save + readiness refetch, so during the
  // ~5s autosave gap the fixed field would still show a red message. For
  // LIVE_CHECKED fields the FE result is the truth.
  const LIVE_CHECKED = new Set<string>([
    "loan_amount",
    "subsidy_scheme_name",
    "latest_annual_turnover",
  ]);
  const liveErrors: Record<string, string | undefined> = {};
  if (loanProposed) {
    const laNum = loanAmount !== null && loanAmount !== undefined && loanAmount !== "" ? Number(loanAmount) : null;
    if (laNum === null || !Number.isFinite(laNum) || laNum <= 0) {
      liveErrors.loan_amount = "Loan Amount is required when loan is proposed.";
    } else if (costTotal > 0 && laNum > costTotal) {
      liveErrors.loan_amount = `Loan Amount (₹${fmtInr(laNum)}) shall not exceed Total Project Cost (₹${fmtInr(costTotal)}).`;
    }
  }
  if (subsidyProposed && !String(subsidySchemeName).trim()) {
    liveErrors.subsidy_scheme_name = "Name of Scheme is required when subsidy is proposed.";
  }
  if (isOperational && (latestAnnualTurnover === null || latestAnnualTurnover === undefined || latestAnnualTurnover === "")) {
    liveErrors.latest_annual_turnover = "Latest Annual Turnover is required when FPO is already operational.";
  }
  const err = (name: string): string | undefined =>
    LIVE_CHECKED.has(name) ? liveErrors[name] : fieldErrors.get(name);

  // Source-hint chip — shown UNDER a currency input when a source-of-truth
  // sum exists in another section. Green tick when Finance value matches the
  // source, otherwise a Copy button that fills the input with the source sum.
  const renderSourceHint = (fieldKey: string, currentValue: unknown) => {
    const src = sourceHints[fieldKey];
    if (!src) return null;
    const cur = currentValue !== null && currentValue !== undefined && currentValue !== "" ? Number(currentValue) : 0;
    const matches = Math.abs(cur - src.amount) < 0.5;
    return (
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
        {matches ? (
          <span className="inline-flex items-center gap-1 rounded-sm bg-emerald-50 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            ✓ matches{" "}
            <Link
              className="underline underline-offset-2 hover:text-emerald-900 dark:hover:text-emerald-300"
              href={`/fpo/dpr/${uuid}/sections/${src.sectionKey}`}
            >
              {src.label}
            </Link>{" "}
            (₹{fmtInr(src.amount)})
          </span>
        ) : (
          <>
            <span className="text-muted-foreground">
              From{" "}
              <Link
                className="underline underline-offset-2 hover:text-foreground"
                href={`/fpo/dpr/${uuid}/sections/${src.sectionKey}`}
              >
                {src.label}
              </Link>
              : <span className="font-mono">₹{fmtInr(src.amount)}</span>
            </span>
            {src.amount > 0 && (
              <button
                type="button"
                onClick={() => setField(fieldKey as keyof Data, String(src.amount) as Data[keyof Data])}
                className="inline-flex items-center gap-0.5 rounded-sm border border-primary/40 bg-primary/5 px-1.5 py-0.5 font-medium text-primary hover:bg-primary/10"
                title={`Copy ₹${fmtInr(src.amount)} into this field`}
              >
                <Copy className="h-2.5 w-2.5" /> Copy
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  // Reusable currency-grid renderer. Controlled inputs via useWatch(allValues)
  // (already subscribed for live totals) + setField(shouldDirty:true) so
  // autosave fires reliably. Capped at ₹1000cr per field, 2 decimals.
  // Renders a source-hint chip UNDER each input when a source-of-truth sum
  // exists in another section (Civil/Machinery/HR).
  const renderCurrencyGrid = (fields: Array<[string, string]>) => (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map(([key, label]) => {
        const value = (allValues as Record<string, unknown> | undefined)?.[key];
        return (
          <div key={key} className="space-y-1">
            <LabelWithBadge uuid={uuid} section="finance" field={key} className="text-xs">
              {label} (₹)
            </LabelWithBadge>
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
            {renderSourceHint(key, value)}
          </div>
        );
      })}
    </div>
  );

  // Percentage grid — same pattern but capped 0–100, 2 decimals.
  const renderPercentGrid = (fields: Array<[string, string]>) => (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map(([key, label]) => {
        const value = (allValues as Record<string, unknown> | undefined)?.[key];
        return (
          <div key={key} className="space-y-1">
            <LabelWithBadge uuid={uuid} section="finance" field={key} className="text-xs">
              {label}
            </LabelWithBadge>
            <Input
              type="text"
              inputMode="decimal"
              maxLength={6}
              placeholder="%"
              value={value !== null && value !== undefined ? String(value) : ""}
              onChange={(e) => {
                const cleaned = normaliseDecimalInput(e.target.value, {
                  max: MAX_PCT,
                  maxDecimals: 2,
                });
                setField(key as keyof Data, (cleaned === "" ? null : cleaned) as Data[keyof Data]);
              }}
            />
          </div>
        );
      })}
    </div>
  );

  // Small integer input (days / months / years). Range-bounded by caller.
  const intInput = (
    value: unknown, key: keyof Data, label: string,
    max: number, placeholder = "",
  ) => (
    <div className="space-y-1">
      <LabelWithBadge uuid={uuid} section="finance" field={String(key)} className="text-xs">
        {label}
      </LabelWithBadge>
      <Input
        type="text"
        inputMode="numeric"
        maxLength={6}
        placeholder={placeholder}
        value={value !== null && value !== undefined ? String(value) : ""}
        onChange={(e) => {
          const cleaned = normaliseIntegerInput(e.target.value, { max, min: 0 });
          setField(key, (cleaned === "" ? null : cleaned) as Data[keyof Data]);
        }}
      />
    </div>
  );

  // Currency input (single ₹ input outside a grid). Same normaliser + cap.
  const currencyInput = (
    value: unknown, key: keyof Data, label: string, placeholder = "₹",
    errorMsg?: string,
  ) => (
    <div className="space-y-1">
      <LabelWithBadge uuid={uuid} section="finance" field={String(key)} className={errorMsg ? "text-xs text-destructive" : "text-xs"}>
        {label}
      </LabelWithBadge>
      <Input
        type="text"
        inputMode="decimal"
        maxLength={16}
        placeholder={placeholder}
        value={value !== null && value !== undefined ? String(value) : ""}
        onChange={(e) => {
          const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_COST_INR, maxDecimals: 2 });
          setField(key, (cleaned === "" ? null : cleaned) as Data[keyof Data]);
        }}
      />
      {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
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
      help={
        <SectionHelp
          title="Financial Information & Means of Finance"
          purpose="Capture the full financial picture of the project — capex (Cat A) + means of finance (Cat B) + working-capital requirement + WC cycle days (Cat C) + operating expenses (Cat D) + per-product revenue (Cat E) + loan (Cat F) + subsidy (Cat G) + existing financials + 3-year history (Cat H) + assumption escalators (Cat I). This feeds the auto-financial-calc engine that generates P&L / cash flow / IRR / NPV / DSCR / payback for the DPR PDF."
          whatToFill={[
            "A — Estimated Project Cost. Fill the 19 line-items that apply (land, civil, machinery, equipment, utilities, pre-operative, contingencies, WC margin, etc.). Live total shown top-right. Machinery / civil / manpower may be auto-populated by the calc engine at DPR generation.",
            "B — Means of Finance. Fill the 12 sources (promoter, term loan, subsidy, grants, NABARD, share capital, etc.). Live 'MoF vs Cost' comparison chip shows balanced (green) / within 10 % (amber) / over 10 % (red).",
            "C — Working Capital (annual). 10 cost lines + 3 credit-days fields (from-suppliers, to-customers, inventory-holding). All optional at spec level.",
            "D — Annual Operating Expenses. 14 lines feeding the annual opex line in the calc engine.",
            "E — Revenue Assumptions. Add ≥ 1 product row. Required per row: product name, Year 1 quantity > 0, expected selling price > 0. Optional: annual growth rate, annual sales revenue.",
            "F — Loan Details. Tick 'Bank loan proposed' to reveal 7 fields. Loan amount is required if ticked; must be ≤ Total Project Cost. Loan type recommended.",
            "G — Subsidy. Tick 'Subsidy proposed' to reveal scheme name (required if ticked) + agency + amount + eligibility + status.",
            "H — Existing Financial Position. Tick 'FPO is already operational' to reveal latest turnover (required if ticked) + net profit + optional 3-year history nested list.",
            "I — Financial Assumptions. 6 percentage escalators (inflation, RM price rise, selling price rise, salary, electricity, fuel). System defaults apply where blank.",
            "J — Capital Tranches. Click 'Manage tranches' to go to the dated schedule of inflows/outflows on a separate page — enables month-by-month cash-flow modelling instead of a uniform-monthly estimate.",
          ]}
          tips={[
            "Fill Cat A honestly and completely — every line here becomes an asset row in the depreciation schedule. Missing lines mean under-stated capex + a wonky IRR.",
            "MoF should ~equal Cost. The live chip shows exactly how much you're over or short. Common fix: promoter contribution or working-capital loan absorbs the rounding.",
            "Revenue Cat E is the ONLY hard block: at least 1 product with qty > 0 and price > 0. Everything else is optional at spec level.",
            "If loan_proposed is ticked, loan_amount is required AND must be ≤ total project cost. The FE checks this live so you see the red message before you Save.",
            "Cat I assumptions default to system values if left blank. Only override if you have a specific reason (RBI inflation guidance, KSEB tariff announcement, etc.).",
            "Capital Tranches (Cat J) lives on a separate page — enter month-by-month timing so the cash-flow calc uses reality instead of uniform-monthly estimates.",
          ]}
          downstream={[
            "P&L, Cash Flow, IRR, NPV, DSCR, Payback — all computed from Cat A/B/C/D + Cat E + Cat F + Cat I",
            "Investment section (§2.3.4) — Cat A auto-total reconciled against user's top-line estimate; readiness warns if variance > 10 %",
            "Depreciation schedule — Cat A costs bucketed by asset class (Land / Buildings / Machinery / Equipment / Pre-operative) per SLM defaults",
            "Loan repayment schedule — Cat F drives EMI + moratorium + amortisation",
            "Financial ratios chapter in DPR PDF — Debt-Equity, Current Ratio, Break-even, ROI all derived from these numbers",
            "AI narrative — Cat E revenue mix + Cat I assumptions feed the Financial Viability paragraph",
          ]}
        />
      }
    >
      <div className="space-y-4">
        {/* "How this is calculated" — one-screen explainer of the calc engine
            data flow, so the FPO understands why we're asking for the same
            costs that live in Machinery / Civil / HR sections. */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <div className="space-y-1.5 text-xs">
                <p className="font-semibold text-foreground">How this section drives the DPR calculation</p>
                <p className="text-muted-foreground">
                  <strong>Cat A</strong> line-items are the master project-cost breakdown. The calc engine buckets each line into an <strong>asset class</strong> (Land / Buildings / Machinery / Equipment / Pre-operative / Other) and runs SLM depreciation on each. <strong>Cat A</strong> total is reconciled against your top-line estimate in the <Link href={`/fpo/dpr/${uuid}/sections/investment`} className="underline underline-offset-2 hover:text-foreground">Investment section</Link>; readiness warns if variance exceeds 10 %.
                </p>
                <p className="text-muted-foreground">
                  <strong>Cat B</strong> must ≈ <strong>Cat A</strong>. <strong>Cat E</strong> revenue × <strong>Cat I</strong> escalators drives the 10-year P&amp;L. <strong>Cat D</strong> opex feeds annual outgo. <strong>Cat F</strong> loan sizes the EMI + moratorium. All of the above → <strong>IRR / NPV / DSCR / Payback</strong> in the generated PDF.
                </p>
                <p className="text-muted-foreground">
                  💡 Where a <span className="rounded-sm bg-primary/10 px-1 text-primary">Copy</span> button appears under a Cat A line, the number came from another section — click to sync.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Investment (§2.3.4) top-line vs Finance Cat A live-comparison. */}
        <InvestmentVsFinancePanel
          uuid={uuid}
          investmentEstimate={investmentEstimate}
          investmentBasis={investmentBasis}
          costTotal={costTotal}
        />

        {/* A. Cost — grouped by asset class (mirrors calculation.py) */}
        <Card><CardContent className="space-y-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">A. Estimated Project Cost</h3>
            <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs">Total: ₹{fmtInr(costTotal)}</span>
          </div>
          <p className="text-xs text-muted-foreground">Lines are grouped by <strong>asset class</strong> — the same buckets the calc engine uses at depreciation time. Machinery / civil / manpower costs can be one-click copied from their source sections.</p>
          {COST_GROUPS.map((group) => {
            const groupTotal = group.fields.reduce((s, f) => {
              const v = (allValues as Record<string, unknown> | undefined)?.[f];
              const n = v === null || v === undefined || v === "" ? 0 : Number(v);
              return s + (Number.isFinite(n) ? n : 0);
            }, 0);
            const groupFields = COST_FIELDS.filter(([k]) => group.fields.includes(k));
            return (
              <div key={group.key} className="space-y-2 rounded-md border border-border/50 bg-muted/20 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{group.label}</p>
                    {group.note && <p className="mt-0.5 text-[10px] text-muted-foreground">{group.note}</p>}
                  </div>
                  {groupTotal > 0 && (
                    <span className="rounded-sm bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                      Group: ₹{fmtInr(groupTotal)}
                    </span>
                  )}
                </div>
                {renderCurrencyGrid(groupFields)}
              </div>
            );
          })}
        </CardContent></Card>

        {/* B. Means of Finance */}
        <Card><CardContent className="space-y-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className={`text-sm font-semibold ${fieldErrors.has("mof_total") ? "text-destructive" : ""}`}>B. Means of Finance</h3>
            {/* Live totals + variance %. Threshold hardcoded at 10% here to match
                the seeded default of DPRConfig.project_cost_variance_pct (KAU RCD
                B.4). Admin can change the backend threshold; this FE indicator
                stays sensible either way — backend readiness message is
                authoritative and includes the actual threshold in effect. */}
            <div className="flex flex-wrap gap-1.5 font-mono text-xs">
              <span className="rounded-md bg-muted px-2 py-1">MoF: ₹{fmtInr(mofTotal)}</span>
              <span className="rounded-md bg-muted px-2 py-1">Cost: ₹{fmtInr(costTotal)}</span>
              {costTotal > 0 && mofTotal > 0 && (() => {
                const variancePct = (Math.abs(mofDelta) / costTotal) * 100;
                if (variancePct < 0.01) {
                  return <span className="rounded-md bg-emerald-100 px-2 py-1 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">Balanced ✓</span>;
                }
                const tone = variancePct > 10
                  ? "bg-destructive/10 text-destructive"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400";
                const label = mofDelta > 0 ? "over" : "short";
                return (
                  <span className={`rounded-md px-2 py-1 ${tone}`}>
                    MoF {label} by ₹{fmtInr(Math.abs(mofDelta))} ({variancePct.toFixed(2)}%)
                    {variancePct > 10 ? " — exceeds 10% threshold" : ""}
                  </span>
                );
              })()}
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
            {intInput(allValues?.credit_period_from_suppliers_days, "credit_period_from_suppliers_days", "Credit from suppliers (days)", MAX_DAYS, "e.g. 15")}
            {intInput(allValues?.credit_period_to_customers_days, "credit_period_to_customers_days", "Credit to customers (days)", MAX_DAYS, "e.g. 30")}
            {intInput(allValues?.inventory_holding_period_days, "inventory_holding_period_days", "Inventory holding (days)", MAX_DAYS, "e.g. 20")}
          </div>
          {/* Seasonal WC uplift — KAU pre-UAT reply §2.4 (2026-09-08). The
              annual-average WC understates the peak month for agri projects;
              this section lets the FPO record a peak-month value for banker
              reference. Left off = calc engine uses annual-average only. */}
          <div className="rounded-md border bg-muted/20 p-4 space-y-3">
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <Checkbox
                checked={!!allValues?.wc_is_seasonal}
                onCheckedChange={(c) => setField("wc_is_seasonal", !!c)}
              />
              <span>
                <strong>Seasonal WC pattern</strong> — enable if the project
                has a harvest cycle / festival demand spike where the peak
                month materially exceeds the annual average.
              </span>
            </label>
            {allValues?.wc_is_seasonal && (
              <div className="grid gap-3 border-l-2 border-primary/30 pl-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <LabelWithBadge uuid={uuid} section="finance" field="wc_peak_amount" className="text-xs">
                    Peak-month WC requirement (₹)
                  </LabelWithBadge>
                  <Input
                    type="text"
                    inputMode="decimal"
                    maxLength={16}
                    placeholder="e.g. 1500000"
                    value={allValues?.wc_peak_amount !== null && allValues?.wc_peak_amount !== undefined ? String(allValues.wc_peak_amount) : ""}
                    onChange={(e) => {
                      const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_COST_INR, maxDecimals: 2 });
                      setField("wc_peak_amount", (cleaned === "" ? null : cleaned) as Data["wc_peak_amount"]);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <LabelWithBadge uuid={uuid} section="finance" field="wc_peak_period_notes" className="text-xs">
                    Peak period description
                  </LabelWithBadge>
                  <Input
                    value={(allValues?.wc_peak_period_notes as string) ?? ""}
                    maxLength={MAX_LONG_CHARS}
                    placeholder="e.g. Oct-Dec harvest procurement"
                    onChange={(e) => setField("wc_peak_period_notes", e.target.value.slice(0, MAX_LONG_CHARS))}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent></Card>

        {/* D. Operating Expenses */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">D. Annual Operating Expenses</h3>
          {renderCurrencyGrid(OP_FIELDS)}
        </CardContent></Card>

        {/* E. Revenue Assumptions — id enables readiness-panel deep-link scroll */}
        <div id="dpr-field-revenue_assumptions" />
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
          isValid={(row) => Object.keys(validateRevenue(row)).length === 0}
          addLabel="Add revenue assumption"
          editLabel="Edit revenue assumption"
          error={fieldErrors.get("revenue_assumptions")}
          warning={fieldWarnings.get("revenue_assumptions")}
          renderModal={(row, set) => {
            const rErr = validateRevenue(row);
            return (
              <>
                <ModalField label="Product name *" error={rErr.product_name}>
                  <Input
                    value={row.product_name}
                    maxLength={MAX_TEXT_CHARS}
                    onChange={(e) => set("product_name", e.target.value.slice(0, MAX_TEXT_CHARS))}
                  />
                </ModalField>
                <ModalRow>
                  <ModalField label="Year 1 sales quantity *" error={rErr.year1_sales_quantity}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={16}
                      placeholder="e.g. 100000"
                      value={row.year1_sales_quantity !== null && row.year1_sales_quantity !== undefined ? String(row.year1_sales_quantity) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_COST_INR, maxDecimals: 3 });
                        set("year1_sales_quantity", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                  <ModalField label="Expected selling price / unit (₹) *" error={rErr.expected_selling_price}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={16}
                      placeholder="e.g. 280"
                      value={row.expected_selling_price !== null && row.expected_selling_price !== undefined ? String(row.expected_selling_price) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_COST_INR, maxDecimals: 2 });
                        set("expected_selling_price", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Annual growth rate (%)">
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={6}
                      placeholder="e.g. 6"
                      value={row.expected_annual_growth_rate_pct !== null && row.expected_annual_growth_rate_pct !== undefined ? String(row.expected_annual_growth_rate_pct) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_PCT, maxDecimals: 2 });
                        set("expected_annual_growth_rate_pct", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                  <ModalField label="Annual sales revenue (₹)">
                    <Input
                      type="text"
                      inputMode="decimal"
                      maxLength={16}
                      placeholder="e.g. 28000000"
                      value={row.annual_sales_revenue !== null && row.annual_sales_revenue !== undefined ? String(row.annual_sales_revenue) : ""}
                      onChange={(e) => {
                        const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_COST_INR, maxDecimals: 2 });
                        set("annual_sales_revenue", cleaned === "" ? null : cleaned);
                      }}
                    />
                  </ModalField>
                </ModalRow>
              </>
            );
          }}
        />

        {/* F. Loan */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">F. Loan Details</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={loanProposed} onCheckedChange={(c) => setField("loan_proposed", !!c)} />
            Bank loan proposed
          </label>
          {loanProposed && (
            <div className="grid gap-3 border-l-2 border-primary/30 pl-4 sm:grid-cols-2">
              <div id="dpr-field-loan_amount">
                {currencyInput(loanAmount, "loan_amount", "Loan amount (₹) *", "e.g. 3600000", err("loan_amount"))}
              </div>
              <div className="space-y-1">
                <LabelWithBadge uuid={uuid} section="finance" field="loan_type" className="text-xs">
                  Loan type
                </LabelWithBadge>
                <SearchableSelect
                  value={loanType ?? ""}
                  options={LOAN_TYPES}
                  onChange={(v: string) => setField("loan_type", v)}
                  placeholder="Type to search…"
                />
              </div>
              <div className="space-y-1">
                <LabelWithBadge uuid={uuid} section="finance" field="lending_institution" className="text-xs">
                  Lending institution
                </LabelWithBadge>
                <Input
                  value={lendingInstitution as string}
                  maxLength={MAX_LONG_CHARS}
                  onChange={(e) => setField("lending_institution", e.target.value.slice(0, MAX_LONG_CHARS))}
                />
              </div>
              <div className="space-y-1">
                <LabelWithBadge uuid={uuid} section="finance" field="rate_of_interest_pct" className="text-xs">
                  Rate of interest (%)
                </LabelWithBadge>
                <Input
                  type="text"
                  inputMode="decimal"
                  maxLength={6}
                  placeholder="e.g. 10.5"
                  value={rateOfInterest !== null && rateOfInterest !== undefined ? String(rateOfInterest) : ""}
                  onChange={(e) => {
                    const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_PCT, maxDecimals: 2 });
                    setField("rate_of_interest_pct", (cleaned === "" ? null : cleaned) as Data["rate_of_interest_pct"]);
                  }}
                />
              </div>
              {intInput(moratoriumMonths, "moratorium_period_months", "Moratorium (months)", MAX_MORATORIUM_MONTHS, "e.g. 6")}
              {intInput(repaymentYears, "repayment_period_years", "Repayment period (years)", MAX_REPAYMENT_YEARS, "e.g. 7")}
              <div className="space-y-1">
                <LabelWithBadge uuid={uuid} section="finance" field="repayment_frequency" className="text-xs">
                  Repayment frequency
                </LabelWithBadge>
                <SearchableSelect
                  value={repaymentFreq ?? ""}
                  options={REPAYMENT_FREQ}
                  onChange={(v: string) => setField("repayment_frequency", v)}
                  placeholder="Type to search…"
                />
              </div>
            </div>
          )}
        </CardContent></Card>

        {/* G. Subsidy */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">G. Subsidy / Financial Assistance</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={subsidyProposed} onCheckedChange={(c) => setField("subsidy_proposed", !!c)} />
            Subsidy or financial assistance proposed
          </label>
          {subsidyProposed && (
            <div className="space-y-3 border-l-2 border-primary/30 pl-4">
              <div id="dpr-field-subsidy_scheme_name" className="space-y-1">
                <LabelWithBadge uuid={uuid} section="finance" field="subsidy_scheme_name" className={err("subsidy_scheme_name") ? "text-xs text-destructive" : "text-xs"}>
                  Name of scheme *
                </LabelWithBadge>
                <Input
                  value={subsidySchemeName as string}
                  maxLength={MAX_LONG_CHARS}
                  onChange={(e) => setField("subsidy_scheme_name", e.target.value.slice(0, MAX_LONG_CHARS))}
                />
                {err("subsidy_scheme_name") && (
                  <p className="text-xs text-destructive">{err("subsidy_scheme_name")}</p>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Implementing agency</Label>
                  <Input
                    value={subsidyImplementingAgency as string}
                    maxLength={MAX_LONG_CHARS}
                    onChange={(e) => setField("subsidy_implementing_agency", e.target.value.slice(0, MAX_LONG_CHARS))}
                  />
                </div>
                {currencyInput(expectedSubsidyAmount, "expected_subsidy_amount", "Expected subsidy amount (₹)", "e.g. 1500000")}
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Basis of eligibility</Label>
                  <CountedTextarea
                    rows={2}
                    maxChars={MAX_LONG_TEXT_CHARS}
                    value={basisOfEligibility as string}
                    onChange={(v) => setField("basis_of_eligibility", v)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Current status</Label>
                  <SearchableSelect
                    value={applicationStatus ?? ""}
                    options={SUBSIDY_STATUS}
                    onChange={(v: string) => setField("subsidy_application_status", v)}
                    placeholder="Type to search…"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent></Card>

        {/* H. Existing Financial Position */}
        <Card><CardContent className="space-y-4 p-6">
          <h3 className="text-sm font-semibold">H. Existing Financial Position</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={isOperational} onCheckedChange={(c) => setField("is_operational", !!c)} />
            FPO is already operational
          </label>
          {isOperational && (
            <>
              <div className="grid gap-3 border-l-2 border-primary/30 pl-4 sm:grid-cols-2">
                <div id="dpr-field-latest_annual_turnover">
                  {currencyInput(latestAnnualTurnover, "latest_annual_turnover", "Latest annual turnover (₹) *", "e.g. 4500000", err("latest_annual_turnover"))}
                </div>
                {currencyInput(latestNetProfitLoss, "latest_net_profit_loss", "Latest net profit / loss (₹)", "e.g. 180000")}
              </div>

              {(() => {
                // Auto-increment default financial_year — parse "YYYY-YY" out of
                // existing rows, find the max start-year, suggest +1. Prevents
                // the classic "user clicks Add year 3× and gets 3 identical
                // 2025-26 rows → backend rejects with unique_together error".
                const currentYear = new Date().getFullYear();
                const usedYears = new Set<string>();
                let maxStartYear = currentYear - 1;
                for (const row of yearHistory) {
                  const fy = (row.financial_year ?? "").trim();
                  if (!fy) continue;
                  usedYears.add(fy);
                  const startYear = parseInt(fy.slice(0, 4), 10);
                  if (Number.isFinite(startYear) && startYear > maxStartYear) {
                    maxStartYear = startYear;
                  }
                }
                const nextStart = usedYears.size === 0 ? currentYear - 1 : maxStartYear + 1;
                const nextFY = `${nextStart}-${String(nextStart + 1).slice(-2)}`;

                // Detect duplicates already present (surface as error on the H
                // card so user catches it BEFORE save fails backend
                // unique_together). Also lists WHICH years are duplicated so
                // the fix is obvious.
                const seenYears: Record<string, number[]> = {};
                yearHistory.forEach((row, idx) => {
                  const fy = (row.financial_year ?? "").trim();
                  if (!fy) return;
                  (seenYears[fy] = seenYears[fy] ?? []).push(idx + 1);
                });
                const dupYears = Object.entries(seenYears).filter(([, idxs]) => idxs.length > 1);
                const dupError = dupYears.length > 0
                  ? `Duplicate financial year${dupYears.length > 1 ? "s" : ""}: ${dupYears
                      .map(([fy, idxs]) => `${fy} (rows ${idxs.join(", ")})`)
                      .join("; ")} — each year may appear only once.`
                  : undefined;

                return (
              <NestedListCard<YearHistory>
                title="H. Financial History (last 3 years)"
                items={yearHistory}
                onChange={(next) => form.setValue("year_history", next, { shouldDirty: true })}
                emptyRow={{ financial_year: nextFY, annual_turnover: null, net_profit: null, total_assets: null, total_liabilities: null, net_worth: null, existing_loans: null, existing_repayment_obligations: null }}
                error={dupError}
                columns={[
                  { key: "financial_year", label: "Year" },
                  { key: "annual_turnover", label: "Turnover" },
                  { key: "net_profit", label: "Net profit" },
                  { key: "net_worth", label: "Net worth" },
                ]}
                isValid={(row) => Object.keys(validateYearHistory(row)).length === 0}
                addLabel="Add year"
                editLabel="Edit year"
                renderModal={(row, set) => {
                  const yhErr = validateYearHistory(row);
                  // Years already picked by OTHER rows — remove them from
                  // the dropdown so the user can't accidentally pick the
                  // same year twice. Keep the current row's own value in
                  // the list (otherwise editing looks broken).
                  const usedByOtherRows = new Set<string>();
                  for (const other of yearHistory) {
                    const otherFY = (other.financial_year ?? "").trim();
                    if (otherFY && otherFY !== row.financial_year) {
                      usedByOtherRows.add(otherFY);
                    }
                  }
                  const availableOptions = FINANCIAL_YEAR_OPTIONS.filter(
                    (o) => !usedByOtherRows.has(o.value),
                  );
                  return (
                    <>
                      <ModalField label='Financial year *' error={yhErr.financial_year}>
                        <SearchableSelect
                          value={row.financial_year}
                          options={availableOptions}
                          onChange={(v: string) => set("financial_year", v.slice(0, MAX_FY_CHARS))}
                          placeholder="Select financial year…"
                        />
                      </ModalField>
                      <ModalRow>
                        <ModalField label="Annual turnover (₹)">
                          <Input
                            type="text"
                            inputMode="decimal"
                            maxLength={16}
                            value={row.annual_turnover !== null && row.annual_turnover !== undefined ? String(row.annual_turnover) : ""}
                            onChange={(e) => {
                              const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_COST_INR, maxDecimals: 2 });
                              set("annual_turnover", cleaned === "" ? null : cleaned);
                            }}
                          />
                        </ModalField>
                        <ModalField label="Net profit (₹)">
                          <Input
                            type="text"
                            inputMode="decimal"
                            maxLength={16}
                            value={row.net_profit !== null && row.net_profit !== undefined ? String(row.net_profit) : ""}
                            onChange={(e) => {
                              const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_COST_INR, maxDecimals: 2 });
                              set("net_profit", cleaned === "" ? null : cleaned);
                            }}
                          />
                        </ModalField>
                      </ModalRow>
                      <ModalRow>
                        <ModalField label="Total assets (₹)">
                          <Input
                            type="text"
                            inputMode="decimal"
                            maxLength={16}
                            value={row.total_assets !== null && row.total_assets !== undefined ? String(row.total_assets) : ""}
                            onChange={(e) => {
                              const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_COST_INR, maxDecimals: 2 });
                              set("total_assets", cleaned === "" ? null : cleaned);
                            }}
                          />
                        </ModalField>
                        <ModalField label="Total liabilities (₹)">
                          <Input
                            type="text"
                            inputMode="decimal"
                            maxLength={16}
                            value={row.total_liabilities !== null && row.total_liabilities !== undefined ? String(row.total_liabilities) : ""}
                            onChange={(e) => {
                              const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_COST_INR, maxDecimals: 2 });
                              set("total_liabilities", cleaned === "" ? null : cleaned);
                            }}
                          />
                        </ModalField>
                      </ModalRow>
                      <ModalRow>
                        <ModalField label="Net worth (₹)">
                          <Input
                            type="text"
                            inputMode="decimal"
                            maxLength={16}
                            value={row.net_worth !== null && row.net_worth !== undefined ? String(row.net_worth) : ""}
                            onChange={(e) => {
                              const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_COST_INR, maxDecimals: 2 });
                              set("net_worth", cleaned === "" ? null : cleaned);
                            }}
                          />
                        </ModalField>
                        <ModalField label="Existing loans (₹)">
                          <Input
                            type="text"
                            inputMode="decimal"
                            maxLength={16}
                            value={row.existing_loans !== null && row.existing_loans !== undefined ? String(row.existing_loans) : ""}
                            onChange={(e) => {
                              const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_COST_INR, maxDecimals: 2 });
                              set("existing_loans", cleaned === "" ? null : cleaned);
                            }}
                          />
                        </ModalField>
                      </ModalRow>
                      <ModalField label="Existing repayment obligations (₹)">
                        <Input
                          type="text"
                          inputMode="decimal"
                          maxLength={16}
                          value={row.existing_repayment_obligations !== null && row.existing_repayment_obligations !== undefined ? String(row.existing_repayment_obligations) : ""}
                          onChange={(e) => {
                            const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_COST_INR, maxDecimals: 2 });
                            set("existing_repayment_obligations", cleaned === "" ? null : cleaned);
                          }}
                        />
                      </ModalField>
                    </>
                  );
                }}
              />
                );
              })()}
            </>
          )}
        </CardContent></Card>

        {/* I. Financial Assumptions */}
        <Card><CardContent className="space-y-3 p-6">
          <h3 className="text-sm font-semibold">I. Financial Assumptions</h3>
          <p className="text-xs text-muted-foreground">System defaults are applied where left blank. Override any value here to override the default for this project.</p>
          {renderPercentGrid(ASSUMPTIONS_FIELDS)}
        </CardContent></Card>

        {/* J. Capital Tranches — dated schedule of inflows/outflows.
            Entry-point card only; full CRUD lives at /fpo/dpr/[uuid]/tranches/
            (per KAU RCD A.3 the calc engine wants actual timing, not just
            annualised totals). Rendered here inside Finance so users find it
            next to Means-of-Finance. */}
        <TrancheEntryCard uuid={uuid} isDirty={isDirty} saveAsync={saveAsync} />
      </div>
    </SectionShell>
  );
}

// ── Investment (§2.3.4) top-line vs Finance Cat A live comparison ─────────
//
// Investment is a 3-field record where the FPO records their top-line
// project-cost estimate (e.g. "consultant said ₹60L"). Finance Cat A is the
// detailed 19-line breakdown. At DPR generation the calc engine reconciles
// them; readiness surfaces a warning if variance > 10 %. This panel shows
// that same reconciliation LIVE so the FPO catches it before Save.
function InvestmentVsFinancePanel({
  uuid,
  investmentEstimate,
  investmentBasis,
  costTotal,
}: {
  uuid: string;
  investmentEstimate: number | null;
  investmentBasis: string;
  costTotal: number;
}) {
  const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

  // Skip the panel entirely if the FPO hasn't set an Investment estimate yet.
  // Per KAU RCD B.4 the auto-computed cost simply becomes authoritative and
  // no warning fires — no point rendering a comparison against a missing
  // number.
  if (investmentEstimate === null) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4 text-xs">
          <span className="text-muted-foreground">
            No top-line estimate recorded on{" "}
            <Link href={`/fpo/dpr/${uuid}/sections/investment`} className="underline underline-offset-2 hover:text-foreground">
              Investment (§2.3.4)
            </Link>
            . Cat A total below will become the authoritative project cost at DPR generation.
          </span>
          <span className="rounded-md bg-muted px-2 py-1 font-mono">Cat A: ₹{fmt(costTotal)}</span>
        </CardContent>
      </Card>
    );
  }

  const delta = costTotal - investmentEstimate;
  const variancePct = investmentEstimate > 0 ? (Math.abs(delta) / investmentEstimate) * 100 : 0;
  const withinThreshold = variancePct <= 10;
  const label = delta > 0 ? "higher than" : "lower than";

  return (
    <Card className={withinThreshold ? "border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20" : "border-amber-500/40 bg-amber-50/30 dark:bg-amber-950/20"}>
      <CardContent className="space-y-2 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">
              Investment estimate vs Cat A breakdown
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Top-line from{" "}
              <Link href={`/fpo/dpr/${uuid}/sections/investment`} className="underline underline-offset-2 hover:text-foreground">
                Investment (§2.3.4)
              </Link>
              {investmentBasis && ` · basis: ${investmentBasis.replace(/_/g, " ")}`}
              {" "}· threshold 10 % per DPR config
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 font-mono text-xs">
            <span className="rounded-md bg-background px-2 py-1">Estimate: ₹{fmt(investmentEstimate)}</span>
            <span className="rounded-md bg-background px-2 py-1">Cat A: ₹{fmt(costTotal)}</span>
            {costTotal > 0 && (
              withinThreshold ? (
                variancePct < 0.5 ? (
                  <span className="rounded-md bg-emerald-100 px-2 py-1 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                    Match ✓
                  </span>
                ) : (
                  <span className="rounded-md bg-emerald-100 px-2 py-1 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                    Within {variancePct.toFixed(1)} % ✓
                  </span>
                )
              ) : (
                <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-800 dark:bg-amber-950 dark:text-amber-400">
                  {variancePct.toFixed(1)} % {label} estimate — exceeds 10 % threshold
                </span>
              )
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Tranche entry card (bottom of Finance) ─────────────────────────────────

function TrancheEntryCard({
  uuid,
  isDirty,
  saveAsync,
}: {
  uuid: string;
  isDirty: boolean;
  saveAsync: () => Promise<unknown>;
}) {
  const router = useRouter();
  const [isSavingBeforeNavigate, setIsSavingBeforeNavigate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["dpr-tranches", uuid],
    queryFn: () => dprTranchesApi.list(uuid),
    enabled: !!uuid,
    // Same 30s staleTime as project/section queries to keep summary responsive
    // but not chatty during rapid finance-section edits.
    staleTime: 30_000,
  });

  const count = data?.length ?? 0;
  const inflowTotal = (data ?? [])
    .filter((t) => t.is_inflow)
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const outflowTotal = (data ?? [])
    .filter((t) => t.is_outflow)
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

  // Save-before-navigate — the Manage tranches button leaves the Finance page.
  // Without this, in-flight (typed but not yet autosaved, autosave is on a 5s
  // debounce) values are silently lost. We flush the save synchronously
  // before navigating so the user's typed cost lines land in the DB.
  const handleManageTranches = async (e: React.MouseEvent) => {
    e.preventDefault();
    const target = `/fpo/dpr/${uuid}/tranches`;
    if (!isDirty) {
      router.push(target);
      return;
    }
    setIsSavingBeforeNavigate(true);
    try {
      await saveAsync();
    } catch {
      // Save failed — SectionShell shows the error toast. Don't navigate
      // (user should see + fix the save error rather than lose the data).
      setIsSavingBeforeNavigate(false);
      return;
    }
    router.push(target);
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">J. Capital Tranches (dated schedule)</h3>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
              Record the month-by-month timing of promoter contributions, loan disbursements,
              subsidy releases and capex payments. Without this, the DPR calc uses a uniform
              monthly estimate and marks the schedule as estimated in the generated PDF
              (per KAU RCD A.3).
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleManageTranches}
            disabled={isSavingBeforeNavigate}
          >
            {isSavingBeforeNavigate ? (
              <>
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                Manage tranches
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading summary…
          </div>
        ) : count === 0 ? (
          <p className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            No tranches recorded yet — using uniform-monthly fallback.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
            <div className="rounded-md bg-muted/40 px-3 py-2">
              <span className="text-muted-foreground">Count:</span>{" "}
              <span className="font-semibold tabular-nums">{count}</span>
            </div>
            <div className="rounded-md bg-emerald-50 px-3 py-2 dark:bg-emerald-950/30">
              <span className="text-emerald-800 dark:text-emerald-400">Inflows:</span>{" "}
              <span className="font-semibold tabular-nums text-emerald-900 dark:text-emerald-300">
                ₹ {fmt(inflowTotal)}
              </span>
            </div>
            <div className="rounded-md bg-orange-50 px-3 py-2 dark:bg-orange-950/30">
              <span className="text-orange-800 dark:text-orange-400">Outflows:</span>{" "}
              <span className="font-semibold tabular-nums text-orange-900 dark:text-orange-300">
                ₹ {fmt(outflowTotal)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
