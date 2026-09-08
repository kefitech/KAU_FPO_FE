/**
 * Turn a raw backend field path like `materials[0].available_months` into a
 * human-friendly breadcrumb like
 * `Primary Raw Materials → Row 1 → Months of availability`.
 *
 * Section-aware: the same key (e.g. `risks`) means different things in
 * different sections — "Supply Risk Assessment" in raw-material, "Marketing
 * Risks" in market. Per-section overrides win; global dictionary is fallback.
 *
 * Anything not in either dictionary falls back to underscore-stripping +
 * title-casing so nothing ever renders as an ugly snake_case blob.
 */

// Common keys used across many sections.
const COMMON: Record<string, string> = {
  name: "Name",
  description: "Description",
  address: "Address",
  quantity: "Quantity",
  unit: "Unit",
  price: "Price",
  justification: "Justification",
};

// Per-section overrides — keys with section-specific meaning belong here.
const BY_SECTION: Record<string, Record<string, string>> = {
  "raw-material": {
    materials: "Primary Raw Materials",
    available_months: "Months of availability",
    peak_harvest_season: "Peak harvest season",
    off_season_strategy: "Off-season procurement strategy",
    quality_standard: "Quality standard",
    current_purchase_price: "Current purchase price",
    estimated_annual_requirement: "Estimated annual requirement",
    estimated_qty_available_annual: "Estimated qty available annually",
    num_supplying_farmers: "Supplying farmers",
    unit_of_purchase: "Unit of purchase",
    primary_source: "Primary source",
    procurement_method: "Procurement method",
    procurement_model: "Procurement model",
    procurement_frequency: "Procurement frequency",
    packaging_materials: "Packaging Materials",
    risks: "Supply Risk Assessment",
    consumables: "Other Consumables",
  },
  market: {
    products: "Products / Services",
    demand_basis: "Basis of Demand Estimation",
    channels: "Marketing Channels",
    channel_selections: "Marketing Channels",
    pricing_basis: "Basis of Pricing",
    credit_sales_pct: "Credit sales percentage",
    cash_sales_pct: "Cash sales percentage",
    competitors: "Competitors",
    risks: "Marketing Risks",
    brand_name: "Brand name",
    packaging_strategy: "Packaging strategy",
  },
  products: {
    items: "Products & Services",
  },
  location: {
    local_body_name: "Local Body (Grama Panchayat / Municipality / Corporation)",
    site_statuses: "Site status",
    project_address: "Project address",
  },
  rationale: {
    selections: "Rationale selections",
  },
  capacity: {
    installed_capacity: "Installed capacity",
    capacity_unit: "Capacity unit",
    capacity_basis: "Capacity basis",
    process_description: "Process description",
    process_type: "Process type",
    automation_level: "Automation level",
    production_loss_pct: "Estimated production loss",
    expected_year_of_expansion: "Expected year of expansion",
  },
  implementation: {
    procurement_method: "Procurement method",
    procurement_method_other: "Procurement method (Others — specify)",
    monitoring_frequency: "Monitoring frequency",
    monitoring_authority: "Monitoring authority",
    milestones: "Project milestones",
    milestone_type: "Milestone type",
  },
  risk: {
    items: "Identified risks",
    risk_code: "Risk code",
    risk_code_other: "Risk code (Others — specify)",
    mitigation_strategy: "Mitigation strategy",
    likelihood: "Likelihood",
    impact: "Impact",
  },
  compliance: {
    items: "Compliance items",
    registration: "Registration type",
    status: "Status",
    nature_of_case: "Nature of case",
    possible_impact: "Possible impact on project",
    custom_name: "Custom registration name",
  },
  finance: {
    revenue_assumptions: "Revenue Assumptions",
    product_name: "Product name",
    year1_sales_quantity: "Year 1 sales quantity",
    expected_selling_price: "Expected selling price",
    loan_amount: "Loan amount",
    loan_type: "Loan type",
    subsidy_scheme_name: "Subsidy scheme name",
    latest_annual_turnover: "Latest annual turnover",
    mof_total: "Means of Finance total",
  },
  hr: {
    operational_management_model: "Operational management model",
    operational_management_other: "Operational management (Others — specify)",
    project_head: "Project head / in-charge",
    reporting_authority: "Reporting authority",
    positions: "Employee positions",
    employee_categories: "Employee Categories",
    designation: "Designation",
    number_required: "Number required",
    departments: "Departments",
    department: "Department",
    department_other: "Department (Others — specify)",
    labour_availability: "Labour availability",
    primary_labour_source: "Primary labour source",
    welfare_other: "Employee welfare (Others — specify)",
    statutory_compliance_other: "Statutory compliance (Others — specify)",
  },
  site: {
    parcels: "Land Parcels",
    terrain: "Terrain",
    terrain_other: "Terrain (Others — specify)",
    total_land_available: "Total land available",
    land_proposed_for_project: "Land proposed for project",
    ownership: "Ownership",
    ownership_other: "Ownership (Others — specify)",
    components: "Project components on this parcel",
    constraints: "Site Constraints",
    mitigation_measure: "Mitigation measure",
    constraint_type: "Constraint type",
    constraint_type_other: "Constraint type (Others — specify)",
  },
  baseline: {
    currently_engaged: "Currently engaged in activity",
    existing_products: "Existing products / services",
    existing_installed_capacity: "Existing installed capacity",
    reason_for_proposing: "Reason for proposing activity",
  },
};

function titlecase(s: string): string {
  return s
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function lookup(section: string | undefined, key: string): string {
  if (section && BY_SECTION[section]?.[key]) return BY_SECTION[section][key];
  if (COMMON[key]) return COMMON[key];
  return titlecase(key);
}

/**
 * @param path raw backend field path (e.g. `materials[0].available_months`)
 * @param section optional section key so per-section overrides apply
 */
export function humaniseFieldPath(path: string, section?: string): string {
  if (!path) return "";
  const parts = path.split(".");
  const rendered = parts.map((p) => {
    // `field_name[N]` — array element access
    const m = p.match(/^([a-zA-Z_][\w]*)\[(\d+)\]$/);
    if (m) {
      return `${lookup(section, m[1])} → Row ${Number(m[2]) + 1}`;
    }
    return lookup(section, p);
  });
  return rendered.join(" → ");
}
