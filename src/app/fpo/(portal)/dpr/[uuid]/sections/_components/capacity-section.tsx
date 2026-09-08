"use client";

import { useQuery } from "@tanstack/react-query";
import { useWatch } from "react-hook-form";
import { z } from "zod";

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
import { useDprSectionForm } from "@/hooks/use-dpr-section-form";
import { dprMasterApi } from "@/lib/api/dpr-master";

import { SearchableSelect } from "@/components/ui/searchable-select";

import { CountedTextarea } from "./counted-textarea";
import {
  normaliseDecimalInput,
  normaliseIntegerInput,
} from "./dpr-input-normalisers";
import { FieldError } from "./field-error";
import { MasterSearchableSelect } from "./nested-list";
import { SectionHelp } from "./section-help";
import { SectionShell } from "./section-shell";

// ── Backend-matched constants ────────────────────────────────────────────
// Numeric ranges mirror `apps/fpo/services/dpr/capacity_validators.py`.
// Text caps mirror the DPRSectionCapacity Django model columns.
const MAX_INSTALLED_CAPACITY = 10_000_000;    // 10 million any-unit — larger than any realistic FPO
const MAX_UTIL_PCT = 100;
const MAX_LOSS_PCT = 100;
const MAX_RECOVERY_PCT = 100;
// Backend requires operating_hours_per_shift > 0 (strict); FE normaliser
// lets 0 through so the required-when-empty state is clean. Live check +
// backend validator handle the "= 0" rejection.
const MAX_HOURS_PER_SHIFT = 24;
const MAX_WORKING_DAYS = 365;
// Shifts per day (1-3) is now a hardcoded ChoiceSelect — no numeric
// normaliser needed, so the MAX_SHIFTS constant was removed.
const MAX_OPERATING_MONTHS = 12;
const MAX_TECH_METHOD_CHARS = 300;            // CharField(300)
const MAX_OTHER_TEXT_CHARS = 200;             // CharField(200) — loss_source_other, expansion_nature_other
const MAX_LONG_TEXT_CHARS = 2000;             // TextField unbounded — defensive cap for major_activities / expansion_description

// Process description constraints — 150 words per backend + defensive char
// cap + no-space filler guard (same as rationale F4 fix).
const MAX_PROCESS_DESC_WORDS = 150;
const MAX_PROCESS_DESC_CHARS = 2000;
const MAX_WORD_LEN = 45;

/** Same word-count logic as the backend `_wc(text)` = `len(text.split())`. */
function wordCount(text: string): number {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

/** Longest single token in the string — detects `aaaa…aaa` filler bypass. */
function longestWordLen(text: string): number {
  const tokens = (text || "").trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;
  return Math.max(...tokens.map((t) => t.length));
}

const MONTHS = [
  ["jan", "Jan"], ["feb", "Feb"], ["mar", "Mar"], ["apr", "Apr"],
  ["may", "May"], ["jun", "Jun"], ["jul", "Jul"], ["aug", "Aug"],
  ["sep", "Sep"], ["oct", "Oct"], ["nov", "Nov"], ["dec", "Dec"],
] as const;

const PROCESS_TYPES = [
  { value: "batch", label: "Batch Process" },
  { value: "continuous", label: "Continuous Process" },
  { value: "seasonal", label: "Seasonal Process" },
  { value: "service_based", label: "Service-based Operation" },
];

const AUTOMATION_LEVELS = [
  { value: "manual", label: "Manual" },
  { value: "semi_auto", label: "Semi-Automatic" },
  { value: "auto", label: "Automatic" },
  { value: "fully_auto", label: "Fully Automatic" },
];

const LOSS_SOURCES = [
  { value: "raw_material", label: "Raw Material" },
  { value: "processing", label: "Processing" },
  { value: "storage", label: "Storage" },
  { value: "transportation", label: "Transportation" },
  { value: "packaging", label: "Packaging" },
  { value: "other", label: "Others (Specify)" },
];

const EXPANSION_NATURES = [
  { value: "capacity", label: "Capacity Expansion" },
  { value: "product", label: "Product Diversification" },
  { value: "infrastructure", label: "Infrastructure Expansion" },
  { value: "technology", label: "Technology Upgradation" },
  { value: "market", label: "Market Expansion" },
  { value: "other", label: "Others (Specify)" },
];

const Schema = z.object({
  installed_capacity: z.union([z.string(), z.number()]).nullable(),
  capacity_unit: z.number().nullable(),
  capacity_basis: z.number().nullable(),
  practical_operating_capacity: z.union([z.string(), z.number()]).nullable(),
  first_year_capacity_utilisation_pct: z.union([z.string(), z.number()]).nullable(),
  has_future_expansion: z.boolean(),

  working_days_per_year: z.union([z.string(), z.number()]).nullable(),
  shifts_per_day: z.union([z.string(), z.number()]).nullable(),
  operating_hours_per_shift: z.union([z.string(), z.number()]).nullable(),
  operating_months_per_year: z.union([z.string(), z.number()]).nullable(),
  peak_production_seasons: z.array(z.string()),
  lean_production_seasons: z.array(z.string()),

  process_description: z.string(),
  process_type: z.string(),
  automation_level: z.string(),
  major_activities: z.string(),
  technology_method: z.string(),

  has_production_loss: z.boolean(),
  production_loss_pct: z.union([z.string(), z.number()]).nullable(),
  product_recovery_pct: z.union([z.string(), z.number()]).nullable(),
  loss_sources: z.array(z.string()),
  loss_source_other: z.string(),

  expected_year_of_expansion: z.union([z.string(), z.number()]).nullable(),
  expansion_nature: z.string(),
  expansion_nature_other: z.string(),
  expansion_description: z.string(),
});
type Data = z.infer<typeof Schema>;

const DECIMAL_KEYS = [
  "installed_capacity",
  "practical_operating_capacity",
  "first_year_capacity_utilisation_pct",
  "operating_hours_per_shift",
  "production_loss_pct",
  "product_recovery_pct",
] as const;
const INT_KEYS = [
  "working_days_per_year",
  "shifts_per_day",
  "operating_months_per_year",
  "expected_year_of_expansion",
] as const;

function toDecimalString(v: string | number | null): string | null {
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
  const out: Record<string, unknown> = { ...v };
  for (const k of DECIMAL_KEYS) out[k] = toDecimalString(v[k]);
  for (const k of INT_KEYS) out[k] = toInt(v[k]);
  return out;
}

export function CapacitySection({ uuid }: { uuid: string }) {
  const unitQuery = useQuery({
    queryKey: ["dpr-master", "capacity-units"],
    queryFn: () => dprMasterApi.list("capacity-units"),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const basisQuery = useQuery({
    queryKey: ["dpr-master", "capacity-basis"],
    queryFn: () => dprMasterApi.list("capacity-basis"),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, fieldErrors, fieldWarnings, save, discard } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "capacity",
    schema: Schema,
    defaultValues: {
      installed_capacity: null,
      capacity_unit: null,
      capacity_basis: null,
      practical_operating_capacity: null,
      first_year_capacity_utilisation_pct: null,
      has_future_expansion: false,
      working_days_per_year: null,
      shifts_per_day: null,
      operating_hours_per_shift: null,
      operating_months_per_year: null,
      peak_production_seasons: [],
      lean_production_seasons: [],
      process_description: "",
      process_type: "",
      automation_level: "",
      major_activities: "",
      technology_method: "",
      has_production_loss: false,
      production_loss_pct: null,
      product_recovery_pct: null,
      loss_sources: [],
      loss_source_other: "",
      expected_year_of_expansion: null,
      expansion_nature: "",
      expansion_nature_other: "",
      expansion_description: "",
    },
    serializePayload,
  });

  // useWatch — reactive subscriptions that reliably re-render after form.reset()
  // from server data. See use-dpr-section-form.ts notes. Every field is now
  // controlled (value = watched, onChange = setField) — same reliability fix
  // as location-section / baseline-section.
  const peakMonths = useWatch({ control: form.control, name: "peak_production_seasons" }) ?? [];
  const leanMonths = useWatch({ control: form.control, name: "lean_production_seasons" }) ?? [];
  const lossSources = useWatch({ control: form.control, name: "loss_sources" }) ?? [];
  const hasLoss = useWatch({ control: form.control, name: "has_production_loss" });
  const hasExpansion = useWatch({ control: form.control, name: "has_future_expansion" });
  const capacityUnit = useWatch({ control: form.control, name: "capacity_unit" });
  const capacityBasis = useWatch({ control: form.control, name: "capacity_basis" });
  const processType = useWatch({ control: form.control, name: "process_type" });
  const automationLevel = useWatch({ control: form.control, name: "automation_level" });
  const expansionNature = useWatch({ control: form.control, name: "expansion_nature" });
  const expectedYear = useWatch({ control: form.control, name: "expected_year_of_expansion" });

  // Sub-card A / B numerics
  const installedCapacity = useWatch({ control: form.control, name: "installed_capacity" });
  const practicalOperatingCapacity = useWatch({ control: form.control, name: "practical_operating_capacity" });
  const firstYearUtilPct = useWatch({ control: form.control, name: "first_year_capacity_utilisation_pct" });
  const workingDays = useWatch({ control: form.control, name: "working_days_per_year" });
  const shiftsPerDay = useWatch({ control: form.control, name: "shifts_per_day" });
  const operatingHours = useWatch({ control: form.control, name: "operating_hours_per_shift" });
  const operatingMonths = useWatch({ control: form.control, name: "operating_months_per_year" });

  // Sub-card C texts
  const processDescription = useWatch({ control: form.control, name: "process_description" }) ?? "";
  const majorActivities = useWatch({ control: form.control, name: "major_activities" }) ?? "";
  const technologyMethod = useWatch({ control: form.control, name: "technology_method" }) ?? "";

  // Sub-card D numerics + text
  const productionLossPct = useWatch({ control: form.control, name: "production_loss_pct" });
  const productRecoveryPct = useWatch({ control: form.control, name: "product_recovery_pct" });
  const lossSourceOther = useWatch({ control: form.control, name: "loss_source_other" }) ?? "";

  // Sub-card E text
  const expansionNatureOther = useWatch({ control: form.control, name: "expansion_nature_other" }) ?? "";
  const expansionDescription = useWatch({ control: form.control, name: "expansion_description" }) ?? "";

  // Expansion year dropdown — current year + 1 through +15. Backend validator
  // enforces "> current year", so we never offer anything <= now.
  const currentYear = new Date().getFullYear();
  const YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => {
    const y = currentYear + 1 + i;
    return { value: String(y), label: String(y) };
  });

  // Convenience setter — always includes shouldDirty: true. Guarantees Save
  // button + autosave both fire on every keystroke (fixes the register-based
  // Save-button regression seen in location-section F3).
  const setField = <K extends keyof Data>(name: K, value: Data[K]) =>
    form.setValue(name as never, value as never, { shouldDirty: true });

  function toggleMonth(field: "peak_production_seasons" | "lean_production_seasons", code: string, checked: boolean) {
    const cur = form.getValues(field) ?? [];
    setField(field, (checked ? [...cur, code] : cur.filter((c) => c !== code)) as never);

    // Peak/lean mutex — a month is either high-production or low, not both.
    // When the user ticks a month in ONE array, silently remove it from the
    // OTHER so the two lists stay disjoint. Backend also validates this
    // (warning-level) as defense-in-depth for any API client that bypasses
    // the FE. Unticking has no companion effect — user might want to move
    // a month back to a "shoulder" (neither peak nor lean) state.
    if (checked) {
      const other = field === "peak_production_seasons"
        ? "lean_production_seasons"
        : "peak_production_seasons";
      const otherCur = form.getValues(other) ?? [];
      if (otherCur.includes(code)) {
        setField(other, otherCur.filter((c) => c !== code) as never);
      }
    }
  }
  function toggleLossSource(code: string, checked: boolean) {
    const cur = form.getValues("loss_sources") ?? [];
    setField("loss_sources", (checked ? [...cur, code] : cur.filter((c) => c !== code)) as never);
  }

  // ── Live required-field validation ─────────────────────────────────────
  // Mirrors `apps/fpo/services/dpr/capacity_validators.py` exactly so the
  // user sees red immediately as they clear a required field — no need to
  // wait for the 5s autosave + readiness fetch. Backend `fieldErrors` still
  // wins when present.
  const liveErrors: Record<string, string | undefined> = {};

  // A — always mandatory
  const icNum = installedCapacity !== null && installedCapacity !== undefined && installedCapacity !== ""
    ? Number(installedCapacity) : null;
  if (icNum === null || !Number.isFinite(icNum) || icNum <= 0) {
    liveErrors.installed_capacity = "Installed Capacity shall be greater than zero.";
  }
  if (!capacityUnit) {
    liveErrors.capacity_unit = "Capacity Unit shall be specified.";
  }
  if (!capacityBasis) {
    liveErrors.capacity_basis = "Capacity Basis shall be specified.";
  }

  // C — always mandatory
  const pdTrimmed = String(processDescription).trim();
  const pdWords = wordCount(pdTrimmed);
  const pdLongest = longestWordLen(pdTrimmed);
  if (!pdTrimmed) {
    liveErrors.process_description =
      "Production Process Description shall be mandatory.";
  } else if (pdLongest > MAX_WORD_LEN) {
    liveErrors.process_description =
      `Please enter real process description — a single "word" of ${pdLongest} characters looks like filler.`;
  } else if (pdWords > MAX_PROCESS_DESC_WORDS) {
    liveErrors.process_description =
      `Production Process Description exceeds ${MAX_PROCESS_DESC_WORDS} words (${pdWords} words).`;
  }
  if (!processType) {
    liveErrors.process_type = "Production Process Type shall be selected.";
  }
  if (!automationLevel) {
    liveErrors.automation_level = "Level of Automation shall be selected.";
  }

  // D — conditional (has_production_loss)
  if (hasLoss) {
    const lossNum = productionLossPct !== null && productionLossPct !== undefined && productionLossPct !== ""
      ? Number(productionLossPct) : null;
    if (lossNum === null) {
      liveErrors.production_loss_pct =
        "Estimated Production Loss (%) is required when losses are expected.";
    }
    if (lossSources.includes("other") && !String(lossSourceOther).trim()) {
      liveErrors.loss_source_other =
        'Please specify — "Others" was selected in loss sources but no description provided.';
    }
  }

  // E — conditional (has_future_expansion)
  if (hasExpansion) {
    if (expectedYear === null || expectedYear === undefined || expectedYear === "") {
      liveErrors.expected_year_of_expansion =
        "Expected Year of Expansion is required.";
    }
    if (!expansionNature) {
      liveErrors.expansion_nature = "Nature of Expansion is required.";
    }
    if (expansionNature === "other" && !String(expansionNatureOther).trim()) {
      liveErrors.expansion_nature_other =
        'Please specify — "Others" was selected but no description provided.';
    }
  }

  const err = (name: string): string | undefined =>
    fieldErrors.get(name) ?? liveErrors[name];

  const pdCharCount = String(processDescription).length;

  const loading = isLoading || unitQuery.isLoading || basisQuery.isLoading;

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="capacity"
      loading={loading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
      help={
        <SectionHelp
          title="Project Capacity & Production System"
          purpose="Describe how much the project can produce, how it operates, and how efficiently. This section drives the Financial Analysis chapter's production projections — installed capacity × utilisation × operating days becomes annual output, which feeds the revenue calculation. Five sub-cards (A–E); two of them (Losses and Future Expansion) only open when you tick the matching checkbox."
          whatToFill={[
            "A. Production Capacity — Installed Capacity, Unit and Basis are required. Installed Capacity is what the machine can produce at maximum rated output; Practical Operating Capacity (optional) is the realistic sustained output allowing for downtime. Year-1 Utilisation (%) is what fraction of installed you'll actually run in the first year.",
            "B. Operating Schedule — Working Days per Year (1–365), Shifts per Day (dropdown, 1-3), Operating Hours per Shift (1-24), Operating Months per Year (searchable, 1-12). All optional individually but strongly recommended — the financial calc uses these to derive annual output. Then tick the Peak and Lean months on the month grids.",
            "C. Production Process — Process Description (required, max 150 words), Type (Batch/Continuous/Seasonal/Service-based) and Automation Level are all mandatory. Major activities and Technology / production method are optional supporting detail.",
            "D. Production Losses and Recovery (conditional) — Only opens when you tick 'Significant production loss expected'. Enter Loss (%) and Recovery (%) — see the sanity panel below the two fields explaining the 100% math. Tick the source(s) of the loss.",
            "E. Future Expansion (conditional) — Only opens when you tick 'Future expansion planned' in Sub-card A. Pick the target year (dropdown offers only future years) and the nature of expansion.",
          ]}
          tips={[
            "Peak and lean months are mutually exclusive — ticking a month in one automatically removes it from the other. Leave a month unticked to mark it as a 'shoulder' season (neither peak nor lean).",
            "Loss + main-product Recovery + by-products (if any) should equal 100% of your raw material input. A sum below 100% is fine when by-products absorb the rest (e.g. coconut oil unit: 62% oil + 35% cake + 3% loss = 100%). A sum above 100% triggers a warning — you can't recover more than you put in.",
            "Process Description feeds the AI-generated Project Report — use plain language with concrete numbers ('40 kg copra batch → ~24 L oil + ~14 kg cake') rather than adjectives. The word counter turns amber near 120 words and red past 150.",
            "Utilisation (%) is realistic first-year expectations, not aspirational. A brand-new unit at 40-60 % in Y1 ramping to 80-95 % by Y3 is normal; entering 100% from Y1 looks unrealistic to appraisers.",
            "Shifts and working months use searchable dropdowns — type the number, press Enter. Integer-only fields (working days, shifts, months) strip decimals silently.",
            "The Future Expansion year dropdown only offers current-year + 1 through +15 — no way to accidentally pick a past year. The nature dropdown includes an 'Others' option that reveals a text field when selected.",
          ]}
          downstream={[
            "Financial Analysis chapter — installed capacity × utilisation × operating days × 365 (or hour-shift-day equivalent) derives annual production volume",
            "Revenue projection — annual production × selling price per unit (from the Products section) drives Y1 revenue",
            "PDF Capacity Utilisation table — shows year-by-year ramp-up from your Y1 utilisation figure",
            "AI Project Report — pulls process description, activities and technology into the Production System chapter",
            "Risk Analysis chapter — peak/lean seasonality informs working capital cycle recommendations",
          ]}
        />
      }
    >
      <div className="space-y-4">
        {/* A. Production Capacity */}
        <SubCard title="A. Production Capacity">
          <FieldRow>
            <F label="Installed capacity *" name="installed_capacity" fieldId="installed_capacity" errors={fieldErrors} warnings={fieldWarnings} liveError={liveErrors.installed_capacity}>
              {/* Decimal(18, 3) — normaliser strips non-numeric, enforces
                  3 decimals, clips at MAX_INSTALLED_CAPACITY. Backend
                  requires > 0; empty is allowed here (live check catches
                  it as required). */}
              <Input
                type="text"
                inputMode="decimal"
                maxLength={14}
                placeholder="e.g. 500"
                value={installedCapacity !== null && installedCapacity !== undefined ? String(installedCapacity) : ""}
                onChange={(e) => {
                  const cleaned = normaliseDecimalInput(e.target.value, {
                    max: MAX_INSTALLED_CAPACITY,
                    maxDecimals: 3,
                  });
                  setField("installed_capacity", cleaned === "" ? null : cleaned);
                }}
              />
            </F>
            <F label="Practical operating capacity" name="practical_operating_capacity" fieldId="practical_operating_capacity" errors={fieldErrors} warnings={fieldWarnings}>
              <Input
                type="text"
                inputMode="decimal"
                maxLength={14}
                placeholder="e.g. 400"
                value={practicalOperatingCapacity !== null && practicalOperatingCapacity !== undefined ? String(practicalOperatingCapacity) : ""}
                onChange={(e) => {
                  const cleaned = normaliseDecimalInput(e.target.value, {
                    max: MAX_INSTALLED_CAPACITY,
                    maxDecimals: 3,
                  });
                  setField("practical_operating_capacity", cleaned === "" ? null : cleaned);
                }}
              />
            </F>
          </FieldRow>
          <FieldRow>
            <F label="Capacity unit *" name="capacity_unit" fieldId="capacity_unit" errors={fieldErrors} warnings={fieldWarnings}>
              <MasterSearchableSelect
                value={capacityUnit}
                options={unitQuery.data ?? []}
                onChange={(v) => form.setValue("capacity_unit", v, { shouldDirty: true })}
                placeholder="Type to search unit…"
              />
            </F>
            <F label="Capacity basis *" name="capacity_basis" fieldId="capacity_basis" errors={fieldErrors} warnings={fieldWarnings}>
              <MasterSearchableSelect
                value={capacityBasis}
                options={basisQuery.data ?? []}
                onChange={(v) => form.setValue("capacity_basis", v, { shouldDirty: true })}
                placeholder="Type to search basis…"
              />
            </F>
          </FieldRow>
          <F label="Expected first-year capacity utilisation (%)" name="first_year_capacity_utilisation_pct" fieldId="first_year_capacity_utilisation_pct" errors={fieldErrors} warnings={fieldWarnings}>
            <Input
              type="text"
              inputMode="decimal"
              maxLength={6}
              placeholder="0-100"
              value={firstYearUtilPct !== null && firstYearUtilPct !== undefined ? String(firstYearUtilPct) : ""}
              onChange={(e) => {
                const cleaned = normaliseDecimalInput(e.target.value, {
                  max: MAX_UTIL_PCT,
                  maxDecimals: 2,
                });
                setField("first_year_capacity_utilisation_pct", cleaned === "" ? null : cleaned);
              }}
            />
          </F>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={hasExpansion}
              onCheckedChange={(c) => form.setValue("has_future_expansion", !!c, { shouldDirty: true })}
            />
            <span>Future expansion planned</span>
          </label>
        </SubCard>

        {/* B. Operating Schedule */}
        <SubCard title="B. Operating Schedule">
          <FieldRow>
            <F label="Working days per year (1–365)" name="working_days_per_year" fieldId="working_days_per_year" errors={fieldErrors} warnings={fieldWarnings}>
              {/* IntegerField — normaliseIntegerInput strips both non-digits
                  AND the decimal point (backend truncates anyway but this
                  prevents the FE from silently accepting 2.5). Clamped
                  1-365 to match backend range. */}
              <Input
                type="text"
                inputMode="numeric"
                maxLength={3}
                placeholder="1-365"
                value={workingDays !== null && workingDays !== undefined ? String(workingDays) : ""}
                onChange={(e) => {
                  const cleaned = normaliseIntegerInput(e.target.value, { max: MAX_WORKING_DAYS, min: 1 });
                  setField("working_days_per_year", cleaned === "" ? null : cleaned);
                }}
              />
            </F>
            <F label="Shifts per day" name="shifts_per_day" fieldId="shifts_per_day" errors={fieldErrors} warnings={fieldWarnings}>
              {/* SearchableSelect — matches the same type-to-search pattern
                  used for operating months, district, block, and expansion
                  year elsewhere in the wizard. Only 3 valid values (backend:
                  1-3). */}
              <SearchableSelect
                value={shiftsPerDay !== null && shiftsPerDay !== undefined && shiftsPerDay !== "" ? String(shiftsPerDay) : ""}
                options={[
                  { value: "1", label: "1 shift" },
                  { value: "2", label: "2 shifts" },
                  { value: "3", label: "3 shifts" },
                ]}
                onChange={(v) => setField("shifts_per_day", v === "" ? null : (v as never))}
                placeholder="Pick 1-3…"
              />
            </F>
          </FieldRow>
          <FieldRow>
            <F label="Operating hours per shift (0–24)" name="operating_hours_per_shift" fieldId="operating_hours_per_shift" errors={fieldErrors} warnings={fieldWarnings}>
              {/* Decimal(4, 2) — 0 < x ≤ 24 per backend. Use strict min
                  MIN_HOURS_PER_SHIFT_STRICT so the normaliser doesn't clip
                  a real "0" to 0.01 (empty is allowed here; live check
                  catches "= 0" via a range test). */}
              <Input
                type="text"
                inputMode="decimal"
                maxLength={5}
                placeholder="0.01-24"
                value={operatingHours !== null && operatingHours !== undefined ? String(operatingHours) : ""}
                onChange={(e) => {
                  const cleaned = normaliseDecimalInput(e.target.value, {
                    max: MAX_HOURS_PER_SHIFT,
                    maxDecimals: 2,
                    min: 0,
                  });
                  setField("operating_hours_per_shift", cleaned === "" ? null : cleaned);
                }}
              />
            </F>
            <F label="Operating months per year (1–12)" name="operating_months_per_year" fieldId="operating_months_per_year" errors={fieldErrors} warnings={fieldWarnings}>
              {/* SearchableSelect — 12 finite valid values (backend: 1-12).
                  Type-to-search matches the pattern used for districts /
                  blocks / expansion year elsewhere in the wizard. */}
              <SearchableSelect
                value={operatingMonths !== null && operatingMonths !== undefined && operatingMonths !== "" ? String(operatingMonths) : ""}
                options={Array.from({ length: MAX_OPERATING_MONTHS }, (_, i) => {
                  const n = i + 1;
                  return { value: String(n), label: `${n} month${n === 1 ? "" : "s"}` };
                })}
                onChange={(v) => setField("operating_months_per_year", v === "" ? null : (v as never))}
                placeholder="Type or pick 1-12…"
              />
            </F>
          </FieldRow>

          <div>
            <Label className="mb-2 inline-block">Peak production seasons</Label>
            <MonthGrid selected={peakMonths} onToggle={(m, c) => toggleMonth("peak_production_seasons", m, c)} />
          </div>
          <div>
            <Label className="mb-2 inline-block">Lean production seasons</Label>
            <MonthGrid selected={leanMonths} onToggle={(m, c) => toggleMonth("lean_production_seasons", m, c)} />
          </div>
        </SubCard>

        {/* C. Production Process */}
        <SubCard title="C. Production Process">
          {/* id="dpr-field-process_description" is the readiness scroll target
              for the "Production Process Description shall be mandatory" +
              "exceeds 150 words" errors. Bare div here (not <F>) because we
              need the custom counter next to the label. */}
          <div id="dpr-field-process_description" className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className={err("process_description") ? "text-destructive" : undefined}>
                Process description * (max {MAX_PROCESS_DESC_WORDS} words)
              </Label>
              {/* Words + chars — pure word count is misleading when a user
                  pastes a giant no-space "word" (rationale F4 lesson). The
                  dual display exposes filler content and also confirms the
                  maxLength cap is applying. */}
              <span
                className={`text-xs ${
                  pdWords > MAX_PROCESS_DESC_WORDS
                    ? "text-destructive"
                    : pdWords > MAX_PROCESS_DESC_WORDS * 0.8
                      ? "text-amber-600"
                      : "text-muted-foreground"
                }`}
              >
                {pdWords}/{MAX_PROCESS_DESC_WORDS} words · {pdCharCount}/{MAX_PROCESS_DESC_CHARS} chars
              </span>
            </div>
            <CountedTextarea
              rows={4}
              maxChars={MAX_PROCESS_DESC_CHARS}
              value={processDescription as string}
              onChange={(v) => setField("process_description", v)}
              error={Boolean(err("process_description"))}
            />
            {err("process_description") && (
              <p className="mt-1 text-xs text-destructive">{err("process_description")}</p>
            )}
          </div>
          <FieldRow>
            <F label="Process type *" name="process_type" fieldId="process_type" errors={fieldErrors} warnings={fieldWarnings} liveError={liveErrors.process_type}>
              <ChoiceSelect
                value={processType}
                options={PROCESS_TYPES}
                onChange={(v) => setField("process_type", v)}
              />
            </F>
            <F label="Automation level *" name="automation_level" fieldId="automation_level" errors={fieldErrors} warnings={fieldWarnings} liveError={liveErrors.automation_level}>
              <ChoiceSelect
                value={automationLevel}
                options={AUTOMATION_LEVELS}
                onChange={(v) => setField("automation_level", v)}
              />
            </F>
          </FieldRow>
          <F label="Major production / processing activities" name="major_activities" errors={fieldErrors} warnings={fieldWarnings}>
            <CountedTextarea
              rows={2}
              maxChars={MAX_LONG_TEXT_CHARS}
              placeholder="e.g. grading, cleaning, packaging"
              value={majorActivities as string}
              onChange={(v) => setField("major_activities", v)}
            />
          </F>
          <F label="Technology / production method (optional)" name="technology_method" errors={fieldErrors} warnings={fieldWarnings}>
            <Input
              value={technologyMethod as string}
              maxLength={MAX_TECH_METHOD_CHARS}
              onChange={(e) =>
                setField("technology_method", e.target.value.slice(0, MAX_TECH_METHOD_CHARS))
              }
            />
          </F>
        </SubCard>

        {/* D. Production Losses */}
        <SubCard title="D. Production Losses and Recovery">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={hasLoss}
              onCheckedChange={(c) => form.setValue("has_production_loss", !!c, { shouldDirty: true })}
            />
            <span>Significant production loss expected</span>
          </label>

          {hasLoss && (
            <div className="space-y-4 border-l-2 border-primary/30 pl-4">
              <FieldRow>
                <F label="Estimated overall production loss (%) *" name="production_loss_pct" fieldId="production_loss_pct" errors={fieldErrors} warnings={fieldWarnings} liveError={liveErrors.production_loss_pct}>
                  <Input
                    type="text"
                    inputMode="decimal"
                    maxLength={6}
                    placeholder="0-100"
                    value={productionLossPct !== null && productionLossPct !== undefined ? String(productionLossPct) : ""}
                    onChange={(e) => {
                      const cleaned = normaliseDecimalInput(e.target.value, {
                        max: MAX_LOSS_PCT,
                        maxDecimals: 2,
                      });
                      setField("production_loss_pct", cleaned === "" ? null : cleaned);
                    }}
                  />
                </F>
                <F label="Estimated product recovery (%)" name="product_recovery_pct" fieldId="product_recovery_pct" errors={fieldErrors} warnings={fieldWarnings}>
                  <Input
                    type="text"
                    inputMode="decimal"
                    maxLength={6}
                    placeholder="0-100"
                    value={productRecoveryPct !== null && productRecoveryPct !== undefined ? String(productRecoveryPct) : ""}
                    onChange={(e) => {
                      const cleaned = normaliseDecimalInput(e.target.value, {
                        max: MAX_RECOVERY_PCT,
                        maxDecimals: 2,
                      });
                      setField("product_recovery_pct", cleaned === "" ? null : cleaned);
                    }}
                  />
                </F>
              </FieldRow>
              {/* Loss + Recovery sanity check. Sum > 100 is physically
                  impossible; sum < 100 is fine (the balance is by-products
                  / co-outputs that aren't captured on either field).
                  Backend mirrors the same warning as defense-in-depth. */}
              {(() => {
                const loss = productionLossPct !== null && productionLossPct !== undefined && productionLossPct !== ""
                  ? Number(productionLossPct) : null;
                const recovery = productRecoveryPct !== null && productRecoveryPct !== undefined && productRecoveryPct !== ""
                  ? Number(productRecoveryPct) : null;
                const bothSet = loss !== null && Number.isFinite(loss) && recovery !== null && Number.isFinite(recovery);
                const total = bothSet ? loss + recovery : null;
                const over100 = total !== null && total > 100;
                return (
                  <div className="space-y-1 rounded-md border bg-muted/30 px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      Loss + main-product Recovery + by-products (if any) = 100% of raw
                      material input. Sum below 100% is fine when by-products absorb the
                      rest; a sum above 100% is not possible.
                    </p>
                    {bothSet && (
                      <p
                        className={
                          over100
                            ? "text-xs font-medium text-destructive"
                            : "text-xs text-muted-foreground"
                        }
                      >
                        Current total: {total}%{over100 ? " — exceeds 100%, review both values." : ""}
                      </p>
                    )}
                  </div>
                );
              })()}
              <div>
                <Label className="mb-2 inline-block">Major sources of loss</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {LOSS_SOURCES.map((o) => (
                    <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={lossSources.includes(o.value)}
                        onCheckedChange={(c) => toggleLossSource(o.value, !!c)}
                      />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {lossSources.includes("other") && (
                <F label="Please specify (Others) *" name="loss_source_other" fieldId="loss_source_other" errors={fieldErrors} warnings={fieldWarnings} liveError={liveErrors.loss_source_other}>
                  <Input
                    value={lossSourceOther as string}
                    maxLength={MAX_OTHER_TEXT_CHARS}
                    onChange={(e) =>
                      setField("loss_source_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))
                    }
                  />
                </F>
              )}
            </div>
          )}
        </SubCard>

        {/* E. Future Expansion */}
        {hasExpansion && (
          <SubCard title="E. Future Expansion">
            <FieldRow>
              <F label="Expected year of expansion *" name="expected_year_of_expansion" fieldId="expected_year_of_expansion" errors={fieldErrors} warnings={fieldWarnings}>
                {/* Searchable dropdown of current year + 1 through +15 — same
                    type-to-search + selection-chip pattern as the master
                    dropdowns elsewhere in the wizard. */}
                <SearchableSelect
                  value={expectedYear !== null && expectedYear !== undefined && expectedYear !== "" ? String(expectedYear) : ""}
                  options={YEAR_OPTIONS}
                  onChange={(v) => form.setValue("expected_year_of_expansion", v === "" ? null : Number(v), { shouldDirty: true })}
                  placeholder="Type or pick a year…"
                />
              </F>
              <F label="Nature of expansion" name="expansion_nature" fieldId="expansion_nature" errors={fieldErrors} warnings={fieldWarnings}>
                <ChoiceSelect
                  value={expansionNature}
                  options={EXPANSION_NATURES}
                  onChange={(v) => form.setValue("expansion_nature", v, { shouldDirty: true })}
                />
              </F>
            </FieldRow>
            {expansionNature === "other" && (
              <F label="Please specify (Others) *" name="expansion_nature_other" fieldId="expansion_nature_other" errors={fieldErrors} warnings={fieldWarnings} liveError={liveErrors.expansion_nature_other}>
                <Input
                  value={expansionNatureOther as string}
                  maxLength={MAX_OTHER_TEXT_CHARS}
                  onChange={(e) =>
                    setField("expansion_nature_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))
                  }
                />
              </F>
            )}
            <F label="Brief description" name="expansion_description" errors={fieldErrors} warnings={fieldWarnings}>
              <CountedTextarea
                rows={2}
                maxChars={MAX_LONG_TEXT_CHARS}
                value={expansionDescription as string}
                onChange={(v) => setField("expansion_description", v)}
              />
            </F>
          </SubCard>
        )}
      </div>
    </SectionShell>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function MonthGrid({ selected, onToggle }: { selected: string[]; onToggle: (code: string, checked: boolean) => void }) {
  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
      {MONTHS.map(([code, label]) => {
        const active = selected.includes(code);
        return (
          <button
            key={code}
            type="button"
            onClick={() => onToggle(code, !active)}
            className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {label}
          </button>
        );
      })}
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
      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

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
  name,
  errors,
  warnings,
  children,
  fieldId,
  liveError,
}: {
  label: string;
  name?: string;
  errors?: Map<string, string>;
  warnings?: Map<string, string>;
  children: React.ReactNode;
  /**
   * When set, applies `id="dpr-field-<fieldId>"` on the wrapper div — the
   * readiness panel scrolls to this anchor on click. Same convention as
   * every other DPR section.
   */
  fieldId?: string;
  /**
   * Client-side live rule message. Backend `FieldError` takes priority
   * when present (server-only rules); otherwise this string fires so the
   * user sees red immediately without waiting for autosave + readiness.
   */
  liveError?: string;
}) {
  const backendErr = name ? errors?.get(name) : undefined;
  const hasAnyErr = Boolean(backendErr || liveError);
  return (
    <div
      id={fieldId ? `dpr-field-${fieldId}` : undefined}
      className="space-y-1.5"
    >
      <Label className={hasAnyErr ? "text-destructive" : undefined}>{label}</Label>
      {children}
      {backendErr ? (
        name && errors && <FieldError name={name} errors={errors} warnings={warnings} />
      ) : liveError ? (
        <p className="mt-1 text-xs text-destructive">{liveError}</p>
      ) : (
        name && errors && <FieldError name={name} errors={errors} warnings={warnings} />
      )}
    </div>
  );
}
