"use client";

import { useQuery } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { z } from "zod";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ViewSheet } from "@/components/ui/view-sheet";
import { useDprSectionForm } from "@/hooks/use-dpr-section-form";
import { dprMasterApi } from "@/lib/api/dpr-master";

import { CountedTextarea } from "./counted-textarea";
import { normaliseDecimalInput } from "./dpr-input-normalisers";
import {
  ModalField,
  ModalRow,
  NestedListCard,
  type NestedListHandle,
} from "./nested-list";
import { SectionHelp } from "./section-help";
import { SectionShell } from "./section-shell";

// ── Input caps — mirror backend DPRTechnology + DPRTechnologyRisk columns ──
const MAX_TECH_TEXT_CHARS = 200;
const MAX_COUNTRY_CHARS = 100;
const MAX_OTHER_TEXT_CHARS = 200;
const MAX_LONG_TEXT_CHARS = 2000;

// Backend enforces these WORD limits (validator). Same char-cap defensive
// pattern as rationale.justification — 15 chars/word × spec-limit gives a
// generous DOM cap plus a no-space-filler guard.
const MAX_DESC_WORDS = 150;
const MAX_JUSTIFICATION_WORDS = 100;
const MAX_DESC_CHARS = 2500;
const MAX_JUSTIFICATION_CHARS = 1500;
const MAX_WORD_LEN = 45;   // filler-bypass guard (rationale F4 lesson)

// Upgradation cost — Decimal(18, 2). Cap at ₹1000 crore per the shared money
// convention used across the wizard.
const MAX_UPGRADATION_COST = 10_000_000_000;

function wordCount(text: string): number {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}
function longestWordLen(text: string): number {
  const tokens = (text || "").trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;
  return Math.max(...tokens.map((t) => t.length));
}

// Past-year dropdown for "Year introduced". Current year down to 1980 —
// covers everything from legacy machinery to brand-new tech. Backend has no
// range enforcement so we pick a sensible UI range.
const CURRENT_YEAR = new Date().getFullYear();
const PAST_YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1980 + 1 }, (_, i) => {
  const y = CURRENT_YEAR - i;
  return { value: String(y), label: String(y) };
});
// Future-year dropdown for "Upgradation year" — current year + 1 through +15.
// Backend enforces `> current year`.
const FUTURE_YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const y = CURRENT_YEAR + 1 + i;
  return { value: String(y), label: String(y) };
});

/**
 * §2.3.12 Technology — 2-level nested (technologies → risks).
 * Nested risks handled INSIDE the technology modal since UI-first design keeps them together.
 */

const TECH_STATUS = [
  { value: "proven", label: "Proven" },
  { value: "commercial", label: "Commercially Established" },
  { value: "pilot", label: "Pilot" },
  { value: "emerging", label: "Emerging" },
  { value: "indigenous", label: "Indigenous" },
  { value: "imported", label: "Imported" },
  { value: "traditional", label: "Traditional" },
  { value: "other", label: "Others" },
];
const PROCESS_TYPES = [
  { value: "batch", label: "Batch" },
  { value: "continuous", label: "Continuous" },
  { value: "seasonal", label: "Seasonal" },
  { value: "service_based", label: "Service-based" },
];
const AUTOMATION = [
  { value: "manual", label: "Manual" },
  { value: "semi_auto", label: "Semi-Automatic" },
  { value: "auto", label: "Automatic" },
  { value: "fully_auto", label: "Fully Automatic" },
];
const TECH_RISKS = [
  { value: "obsolescence", label: "Technology Obsolescence" },
  { value: "skilled_labour", label: "Skilled Labour Shortage" },
  { value: "spare_parts", label: "Spare Parts Availability" },
  { value: "breakdown", label: "Frequent Breakdown" },
  { value: "high_maintenance", label: "High Maintenance Cost" },
  { value: "vendor_dependency", label: "Vendor Dependency" },
  { value: "utility_dependency", label: "Utility Dependency" },
  { value: "quality_issues", label: "Product Quality Issues" },
  { value: "other", label: "Others" },
];

const RiskSchema = z.object({
  id: z.number().optional(),
  risk_type: z.string(),
  risk_type_other: z.string(),
  mitigation_measure: z.string(),
  existing_practice: z.string(),
});
type Risk = z.infer<typeof RiskSchema>;

const TechSchema = z.object({
  id: z.number().optional(),
  order: z.number(),
  name: z.string(),
  nature: z.string(),
  description: z.string(),
  source: z.string(),
  technology_provider: z.string(),
  country_of_origin: z.string(),
  year_introduced: z.union([z.string(), z.number()]).nullable(),
  technology_status: z.string(),
  technology_status_other: z.string(),
  reasons: z.array(z.number()),
  reasons_other: z.string(),
  selection_justification: z.string(),
  process_description: z.string(),
  process_type: z.string(),
  automation_level: z.string(),
  // Cat D — Technology Performance (all optional per KAU spec)
  expected_production_efficiency: z.string(),
  expected_recovery: z.string(),
  energy_efficiency: z.string(),
  water_efficiency: z.string(),
  labour_efficiency: z.string(),
  machine_utilisation: z.string(),
  maintenance_frequency: z.string(),
  expected_technology_life_years: z.union([z.string(), z.number()]).nullable(),
  quality_standards_applicable: z.boolean(),
  product_quality_standard: z.string(),
  certifications: z.array(z.number()),
  certifications_other: z.string(),
  requires_skilled_operators: z.boolean().nullable(),
  requires_training: z.boolean().nullable(),
  upgradation_planned: z.boolean(),
  upgradation_year: z.union([z.string(), z.number()]).nullable(),
  upgradation_description: z.string(),
  upgradation_cost: z.union([z.string(), z.number()]).nullable(),
  risks: z.array(RiskSchema),
});
type Tech = z.infer<typeof TechSchema>;

const Schema = z.object({
  technologies: z.array(TechSchema),
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

// ── Per-row validators (mirror technology_validators.py) ──────────────
type TechErrors = Partial<Record<
  "name" | "source" | "description" | "technology_status_other"
  | "reasons" | "reasons_other" | "selection_justification"
  | "process_description" | "process_type" | "automation_level"
  | "product_quality_standard"
  | "requires_skilled_operators" | "requires_training"
  | "upgradation_year"
, string>>;

function validateTechnology(row: Tech, currentYear: number): TechErrors {
  const e: TechErrors = {};
  if (!(row.name ?? "").trim()) e.name = "Technology Name shall be specified.";
  if (!(row.source ?? "").trim()) e.source = "Source of Technology shall be specified.";
  // Cat A word limit + filler bypass
  const descWords = wordCount(row.description);
  const descLongest = longestWordLen(row.description);
  if (descLongest > MAX_WORD_LEN) {
    e.description = `Please enter real description text — a single "word" of ${descLongest} characters looks like filler.`;
  } else if (descWords > MAX_DESC_WORDS) {
    e.description = `Description exceeds ${MAX_DESC_WORDS} words (${descWords} words).`;
  }
  if (row.technology_status === "other" && !(row.technology_status_other ?? "").trim()) {
    e.technology_status_other = 'Please specify — "Others" was selected for technology status.';
  }
  // Cat B
  if (!row.reasons || row.reasons.length === 0) {
    e.reasons = "At least one reason for selecting the technology shall be selected.";
  }
  const justWords = wordCount(row.selection_justification);
  const justLongest = longestWordLen(row.selection_justification);
  if (justLongest > MAX_WORD_LEN) {
    e.selection_justification = `Please enter real justification text — a single "word" of ${justLongest} characters looks like filler.`;
  } else if (justWords > MAX_JUSTIFICATION_WORDS) {
    e.selection_justification = `Justification exceeds ${MAX_JUSTIFICATION_WORDS} words (${justWords} words).`;
  }
  // Cat C
  if (!(row.process_description ?? "").trim()) {
    e.process_description = "Brief Process Description shall be mandatory.";
  }
  if (!row.process_type) e.process_type = "Process Type shall be selected.";
  if (!row.automation_level) e.automation_level = "Level of Automation shall be selected.";
  // Cat E
  if (row.quality_standards_applicable && !(row.product_quality_standard ?? "").trim()) {
    e.product_quality_standard = "Product Quality Standard is required when quality standards are applicable.";
  }
  // Cat F — Yes/No must be picked (null = untouched)
  if (row.requires_skilled_operators === null || row.requires_skilled_operators === undefined) {
    e.requires_skilled_operators = "Requirement of Skilled Operators (Yes/No) is required.";
  }
  if (row.requires_training === null || row.requires_training === undefined) {
    e.requires_training = "Requirement of Training (Yes/No) is required.";
  }
  // Cat G
  if (row.upgradation_planned) {
    if (row.upgradation_year === null || row.upgradation_year === "" || row.upgradation_year === undefined) {
      e.upgradation_year = "Upgradation Year is required when upgradation is planned.";
    } else if (Number(row.upgradation_year) <= currentYear) {
      e.upgradation_year = `Upgradation Year shall be later than ${currentYear}.`;
    }
  }
  return e;
}

function validateTechRisk(risk: Risk) {
  const e: Partial<Record<"risk_type" | "risk_type_other" | "mitigation_measure", string>> = {};
  if (!risk.risk_type) e.risk_type = "Risk type is required.";
  if (risk.risk_type === "other" && !(risk.risk_type_other ?? "").trim()) {
    e.risk_type_other = 'Please specify — "Others" was selected in risk type.';
  }
  if (!(risk.mitigation_measure ?? "").trim()) {
    e.mitigation_measure = "Mitigation Measure is required for each selected risk.";
  }
  return e;
}

function serializePayload(v: Data): Record<string, unknown> {
  return {
    technologies: v.technologies.map((t, i) => ({
      ...t,
      order: i,
      year_introduced: toInt(t.year_introduced),
      upgradation_year: toInt(t.upgradation_year),
      upgradation_cost: toDec(t.upgradation_cost),
      expected_technology_life_years: toInt(t.expected_technology_life_years),
    })),
  };
}

export function TechnologySection({ uuid }: { uuid: string }) {
  const reasonsQuery = useQuery({ queryKey: ["dpr-master", "technology-reasons"], queryFn: () => dprMasterApi.list("technology-reasons"), staleTime: 24 * 60 * 60 * 1000 });
  const standardsQuery = useQuery({ queryKey: ["dpr-master", "quality-standards"], queryFn: () => dprMasterApi.list("quality-standards"), staleTime: 24 * 60 * 60 * 1000 });

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, fieldErrors, fieldWarnings, save, discard } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "technology",
    schema: Schema,
    defaultValues: { technologies: [] },
    serializePayload,
  });

  // useWatch — reactive subscription so newly-added tech rows appear in the table
  // immediately (form.watch is unreliable after form.reset from server data).
  const technologies = useWatch({ control: form.control, name: "technologies" }) ?? [];

  // ── Row-detail drawer (same pattern as products-section) ───────────────
  // Clicking a row opens ViewSheet showing the row's fields read-only.
  // The Edit action closes the drawer and pops the existing edit modal
  // via the NestedListHandle imperative ref.
  const nestedRef = useRef<NestedListHandle>(null);
  const [rowView, setRowView] = useState<{ open: boolean; row: Tech | null; index: number }>({
    open: false,
    row: null,
    index: -1,
  });

  // Small helpers to translate stored codes/ids back into human labels
  // for the read-only drawer.
  const techStatusLabel = (v: string) =>
    TECH_STATUS.find((o) => o.value === v)?.label ?? (v || "—");
  const processTypeLabel = (v: string) =>
    PROCESS_TYPES.find((o) => o.value === v)?.label ?? (v || "—");
  const automationLabel = (v: string) =>
    AUTOMATION.find((o) => o.value === v)?.label ?? (v || "—");
  const reasonLabels = (ids: number[]) =>
    (reasonsQuery.data ?? [])
      .filter((r) => ids.includes(r.id))
      .map((r) => r.label)
      .join(", ") || "—";
  const certificationLabels = (ids: number[]) =>
    (standardsQuery.data ?? [])
      .filter((r) => ids.includes(r.id))
      .map((r) => r.label)
      .join(", ") || "—";

  // Live section-level check — mirrors technology_validators.py "at least one".
  const liveTechnologiesError =
    technologies.length === 0 ? "At least one technology shall be specified." : undefined;
  const techErr = fieldErrors.get("technologies") ?? liveTechnologiesError;

  const EMPTY_TECH: Tech = {
    order: 0, name: "", nature: "", description: "", source: "",
    technology_provider: "", country_of_origin: "", year_introduced: null,
    technology_status: "", technology_status_other: "",
    reasons: [], reasons_other: "", selection_justification: "",
    process_description: "", process_type: "", automation_level: "",
    // Cat D — Technology Performance defaults
    expected_production_efficiency: "", expected_recovery: "",
    energy_efficiency: "", water_efficiency: "", labour_efficiency: "",
    machine_utilisation: "", maintenance_frequency: "",
    expected_technology_life_years: null,
    quality_standards_applicable: false, product_quality_standard: "",
    certifications: [], certifications_other: "",
    requires_skilled_operators: null, requires_training: null,
    upgradation_planned: false, upgradation_year: null,
    upgradation_description: "", upgradation_cost: null,
    risks: [],
  };

  const loading = isLoading || reasonsQuery.isLoading || standardsQuery.isLoading;

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="technology"
      loading={loading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
      help={
        <SectionHelp
          title="Technology Selection & Technical Feasibility"
          purpose="Describe the technologies your project will use — what they are, where they come from, why you picked them, how the process runs, what quality standards they meet, what expertise they need, planned upgrades, and technical risks with mitigations. Each technology is one row; you can add as many as your project needs (extraction + filtration + packaging are typically three separate rows). Every field flows into the Technology chapter of the DPR PDF and informs the Machinery / Utilities / HR sub-sections downstream."
          whatToFill={[
            "Click 'Add technology' to open the detail modal. The modal has 8 sub-sections (A–H) covering identity, reasons, process, performance, quality, expertise, upgrades, and risks. Only Cat A / B / C required fields block Save; everything else is optional or conditional.",
            "A — Technology Details. Name and Source are required. Description is capped at 150 words (live counter turns amber near the limit, red over). Pick Technology Status; if 'Others' → the specify text becomes required.",
            "B — Reasons for Selection. Tick at least one reason from 16 options (higher productivity, lower cost, energy efficient, export standard, etc.). Others (Specify) reveals a text field. Add a brief justification — max 100 words.",
            "C — Production Process. Brief process description (required), Process Type (Batch / Continuous / Seasonal / Service-based) and Automation Level (Manual → Fully Automatic) — all three required.",
            "D — Technology Performance (all optional). Free-text fields for expected production efficiency, recovery, energy / water / labour efficiency, machine utilisation, maintenance frequency, and expected technology life (years). Fill what you know; leave the rest blank.",
            "E — Quality Standards. Tick 'Quality standards applicable' to reveal the standard name and certifications multi-select. If ticked, the standard name becomes required.",
            "F — Technical Expertise. Two mandatory Yes/No questions — 'Skilled operators required?' and 'Training required?'. Both must be answered before Save enables.",
            "G — Future Upgradation (optional). Tick 'Upgradation planned' to reveal year (dropdown, must be future), estimated cost, and description.",
            "H — Technical Risks. Click 'add risk' to append rows. Each risk needs a type (obsolescence, spare parts, breakdown, etc.) and a mitigation measure. 'Others' reveals the specify text.",
          ]}
          tips={[
            "Multiple technologies per row is normal. A coconut oil unit typically has 3+ rows: cold-press expeller (extraction), filter train (filtration), bottle-filling line (packaging). Each captures its own process, quality standard, and risks.",
            "Word counters are your friend. Description caps at 150 words and Justification at 100 words per KAU spec. Enter the last-sentence — the counter turns amber at 90% and red at 100%. The system also rejects filler pastes like 'aaaa…aaaa' as a single mega-word.",
            "Yes/No radio pairs in Cat F force an explicit answer. A checkbox couldn't tell 'not ticked' apart from 'not answered', which broke earlier — the radios prevent that.",
            "Year dropdowns are bounded. 'Year introduced' offers 1980 → current year; 'Upgradation year' offers current+1 → +15. You can't accidentally pick a past year for a future upgrade.",
            "Numeric inputs strip non-digits + cap silently. Upgradation cost clips at ₹1000 crore; Technology life caps at 100 years. Paste from anywhere without worrying about junk characters.",
            "Add risks generously. A DPR with 0 identified risks reads as either unrealistic or under-prepared to a bank appraiser. 2–4 risks with concrete mitigations is the sweet spot.",
          ]}
          downstream={[
            "Technology chapter in the DPR PDF — every field surfaces there",
            "Machinery section — technology choice informs the machinery selection + capex estimates",
            "Utilities section — energy / water efficiency lines inform utility sizing",
            "HR section — Skilled Operators / Training toggles feed the manpower plan",
            "Risk Analysis chapter — technical risks appear alongside supply / market / financial risks",
            "AI narrative — description + reasons + process feed the Technology Selection paragraph",
          ]}
        />
      }
    >
      <div className="space-y-4">
        <NestedListCard<Tech>
          ref={nestedRef}
          onRowClick={(row, idx) => setRowView({ open: true, row, index: idx })}
          title="Technologies proposed for the project"
          items={technologies}
          onChange={(next) => form.setValue("technologies", next, { shouldDirty: true })}
          emptyRow={EMPTY_TECH}
          columns={[
            { key: "name", label: "Technology" },
            { key: "technology_status", label: "Status", render: (v) => TECH_STATUS.find((o) => o.value === v)?.label ?? "—" },
            { key: "automation_level", label: "Automation", render: (v) => AUTOMATION.find((o) => o.value === v)?.label ?? "—" },
            { key: "risks", label: "Risks", render: (v) => `${(v as Risk[])?.length ?? 0} identified` },
          ]}
          // isValid — gate Save on full backend rule set (name/source
          // plus Cat B/C/E/F/G rules) via validateTechnology.
          isValid={(row) => Object.keys(validateTechnology(row, CURRENT_YEAR)).length === 0}
          addLabel="Add technology"
          editLabel="Edit technology"
          emptyHint="No technologies yet. Click Add to describe a technology (grading, processing, storage, cold chain, etc.)."
          error={techErr}
          warning={fieldWarnings.get("technologies")}
          renderModal={(row, set) => {
            // Live per-field errors — same pattern as products-section
            // validateRow. Shows inline red the moment a required field is
            // blank or a word-limit is exceeded.
            const rErr = validateTechnology(row, CURRENT_YEAR);
            const descWc = wordCount(row.description);
            const justWc = wordCount(row.selection_justification);
            return (
            <>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">A. Technology Details</p>
                <ModalField label="Technology name *" error={rErr.name}>
                  <Input
                    value={row.name}
                    maxLength={MAX_TECH_TEXT_CHARS}
                    onChange={(e) => set("name", e.target.value.slice(0, MAX_TECH_TEXT_CHARS))}
                  />
                </ModalField>
                <ModalRow>
                  <ModalField label="Nature of technology">
                    <Input
                      value={row.nature}
                      maxLength={MAX_TECH_TEXT_CHARS}
                      onChange={(e) => set("nature", e.target.value.slice(0, MAX_TECH_TEXT_CHARS))}
                    />
                  </ModalField>
                  <ModalField label="Source of technology *" error={rErr.source}>
                    <Input
                      value={row.source}
                      maxLength={MAX_TECH_TEXT_CHARS}
                      onChange={(e) => set("source", e.target.value.slice(0, MAX_TECH_TEXT_CHARS))}
                    />
                  </ModalField>
                </ModalRow>
                <ModalField label={`Description (max ${MAX_DESC_WORDS} words)`} error={rErr.description}>
                  <div className="space-y-1">
                    <CountedTextarea
                      rows={3}
                      maxChars={MAX_DESC_CHARS}
                      value={row.description}
                      onChange={(v) => set("description", v)}
                      error={Boolean(rErr.description)}
                    />
                    <div className={`text-right text-xs ${descWc > MAX_DESC_WORDS ? "text-destructive font-medium" : descWc > MAX_DESC_WORDS * 0.9 ? "text-amber-600" : "text-muted-foreground"}`}>
                      {descWc}/{MAX_DESC_WORDS} words
                    </div>
                  </div>
                </ModalField>
                <ModalRow>
                  <ModalField label="Technology provider">
                    <Input
                      value={row.technology_provider}
                      maxLength={MAX_TECH_TEXT_CHARS}
                      onChange={(e) => set("technology_provider", e.target.value.slice(0, MAX_TECH_TEXT_CHARS))}
                    />
                  </ModalField>
                  <ModalField label="Country of origin">
                    <Input
                      value={row.country_of_origin}
                      maxLength={MAX_COUNTRY_CHARS}
                      onChange={(e) => set("country_of_origin", e.target.value.slice(0, MAX_COUNTRY_CHARS))}
                    />
                  </ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Year introduced">
                    <SearchableSelect
                      value={row.year_introduced != null && row.year_introduced !== "" ? String(row.year_introduced) : ""}
                      options={PAST_YEAR_OPTIONS}
                      onChange={(v) => set("year_introduced", v === "" ? null : v)}
                      placeholder="Type or pick a year…"
                    />
                  </ModalField>
                  <ModalField label="Technology status">
                    <SearchableSelect value={row.technology_status} options={TECH_STATUS} onChange={(v) => set("technology_status", v)} placeholder="Type to search…" />
                  </ModalField>
                </ModalRow>
                {row.technology_status === "other" && (
                  <ModalField label='Please specify (Others) *' error={rErr.technology_status_other}>
                    <Input
                      value={row.technology_status_other}
                      maxLength={MAX_OTHER_TEXT_CHARS}
                      onChange={(e) => set("technology_status_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
                    />
                  </ModalField>
                )}
              </div>

              <div className="mt-4 space-y-3 border-t pt-4">
                <p className={`text-xs font-semibold uppercase tracking-wide ${rErr.reasons ? "text-destructive" : "text-muted-foreground"}`}>
                  B. Reasons for selection <span className="text-destructive">*</span> <span className="ml-1 font-normal normal-case text-muted-foreground">(tick at least one)</span>
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(reasonsQuery.data ?? []).map((r) => (
                    <label key={r.id} className="flex cursor-pointer items-center gap-2 text-xs">
                      <Checkbox
                        checked={row.reasons.includes(r.id)}
                        onCheckedChange={(c) => set("reasons", (c ? [...row.reasons, r.id] : row.reasons.filter((i) => i !== r.id)) as number[])}
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
                {rErr.reasons && <p className="text-xs text-destructive">{rErr.reasons}</p>}
                {(reasonsQuery.data ?? []).some((r) => r.code === "other" && row.reasons.includes(r.id)) && (
                  <ModalField label='Please specify (Others) *' error={rErr.reasons_other}>
                    <Input
                      value={row.reasons_other}
                      maxLength={MAX_OTHER_TEXT_CHARS}
                      onChange={(e) => set("reasons_other", e.target.value.slice(0, MAX_OTHER_TEXT_CHARS))}
                    />
                  </ModalField>
                )}
                <ModalField label={`Brief justification (max ${MAX_JUSTIFICATION_WORDS} words)`} error={rErr.selection_justification}>
                  <div className="space-y-1">
                    <CountedTextarea
                      rows={2}
                      maxChars={MAX_JUSTIFICATION_CHARS}
                      value={row.selection_justification}
                      onChange={(v) => set("selection_justification", v)}
                      error={Boolean(rErr.selection_justification)}
                    />
                    <div className={`text-right text-xs ${justWc > MAX_JUSTIFICATION_WORDS ? "text-destructive font-medium" : justWc > MAX_JUSTIFICATION_WORDS * 0.9 ? "text-amber-600" : "text-muted-foreground"}`}>
                      {justWc}/{MAX_JUSTIFICATION_WORDS} words
                    </div>
                  </div>
                </ModalField>
              </div>

              <div className="mt-4 space-y-3 border-t pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">C. Production process</p>
                <ModalField label="Process description *" error={rErr.process_description}>
                  <CountedTextarea
                    rows={2}
                    maxChars={MAX_LONG_TEXT_CHARS}
                    value={row.process_description}
                    onChange={(v) => set("process_description", v)}
                    error={Boolean(rErr.process_description)}
                  />
                </ModalField>
                <ModalRow>
                  <ModalField label="Process type *" error={rErr.process_type}>
                    <SearchableSelect value={row.process_type} options={PROCESS_TYPES} onChange={(v) => set("process_type", v)} placeholder="Type to search…" />
                  </ModalField>
                  <ModalField label="Automation level *" error={rErr.automation_level}>
                    <SearchableSelect value={row.automation_level} options={AUTOMATION} onChange={(v) => set("automation_level", v)} placeholder="Type to search…" />
                  </ModalField>
                </ModalRow>
              </div>

              <div className="mt-4 space-y-3 border-t pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  D. Technology Performance
                  <span className="ml-2 font-normal normal-case text-muted-foreground">(all optional)</span>
                </p>
                <ModalRow>
                  <ModalField label="Expected production efficiency">
                    <Input
                      value={row.expected_production_efficiency}
                      maxLength={MAX_TECH_TEXT_CHARS}
                      placeholder="e.g. 92% throughput at rated capacity"
                      onChange={(e) => set("expected_production_efficiency", e.target.value.slice(0, MAX_TECH_TEXT_CHARS))}
                    />
                  </ModalField>
                  <ModalField label="Expected recovery">
                    <Input
                      value={row.expected_recovery}
                      maxLength={MAX_TECH_TEXT_CHARS}
                      placeholder="e.g. 62% oil + 35% cake, 3% loss"
                      onChange={(e) => set("expected_recovery", e.target.value.slice(0, MAX_TECH_TEXT_CHARS))}
                    />
                  </ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Energy efficiency">
                    <Input
                      value={row.energy_efficiency}
                      maxLength={MAX_TECH_TEXT_CHARS}
                      placeholder="e.g. 12 kWh per 100 L oil"
                      onChange={(e) => set("energy_efficiency", e.target.value.slice(0, MAX_TECH_TEXT_CHARS))}
                    />
                  </ModalField>
                  <ModalField label="Water efficiency">
                    <Input
                      value={row.water_efficiency}
                      maxLength={MAX_TECH_TEXT_CHARS}
                      placeholder="e.g. 5 L water per 100 L oil (cleaning only)"
                      onChange={(e) => set("water_efficiency", e.target.value.slice(0, MAX_TECH_TEXT_CHARS))}
                    />
                  </ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Labour efficiency">
                    <Input
                      value={row.labour_efficiency}
                      maxLength={MAX_TECH_TEXT_CHARS}
                      placeholder="e.g. 2 operators × 8-hour shift"
                      onChange={(e) => set("labour_efficiency", e.target.value.slice(0, MAX_TECH_TEXT_CHARS))}
                    />
                  </ModalField>
                  <ModalField label="Machine utilisation">
                    <Input
                      value={row.machine_utilisation}
                      maxLength={MAX_TECH_TEXT_CHARS}
                      placeholder="e.g. 65% Y1, 85% Y3 target"
                      onChange={(e) => set("machine_utilisation", e.target.value.slice(0, MAX_TECH_TEXT_CHARS))}
                    />
                  </ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Maintenance frequency">
                    <Input
                      value={row.maintenance_frequency}
                      maxLength={MAX_TECH_TEXT_CHARS}
                      placeholder="e.g. Weekly cleaning + quarterly AMC"
                      onChange={(e) => set("maintenance_frequency", e.target.value.slice(0, MAX_TECH_TEXT_CHARS))}
                    />
                  </ModalField>
                  <ModalField label="Expected technology life (years)">
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={3}
                      placeholder="e.g. 15"
                      value={row.expected_technology_life_years !== null && row.expected_technology_life_years !== undefined ? String(row.expected_technology_life_years) : ""}
                      onChange={(e) => {
                        // Cap at 100 years — realistic upper bound for any
                        // industrial machinery.
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
                        const n = Number(digits);
                        const clamped = digits === "" ? "" : String(Math.min(n, 100));
                        set("expected_technology_life_years", clamped === "" ? null : clamped);
                      }}
                    />
                  </ModalField>
                </ModalRow>
              </div>

              <div className="mt-4 space-y-3 border-t pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">E. Quality standards</p>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={row.quality_standards_applicable} onCheckedChange={(c) => set("quality_standards_applicable", !!c)} />
                  Quality standards applicable
                </label>
                {row.quality_standards_applicable && (
                  <>
                    <ModalField label="Product quality standard *" error={rErr.product_quality_standard}>
                      <Input
                        value={row.product_quality_standard}
                        maxLength={MAX_TECH_TEXT_CHARS}
                        onChange={(e) => set("product_quality_standard", e.target.value.slice(0, MAX_TECH_TEXT_CHARS))}
                      />
                    </ModalField>
                    <div>
                      <Label className="text-xs">Certifications</Label>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {(standardsQuery.data ?? []).map((cert) => (
                          <label key={cert.id} className="flex cursor-pointer items-center gap-2 text-xs">
                            <Checkbox
                              checked={row.certifications.includes(cert.id)}
                              onCheckedChange={(c) => set("certifications", (c ? [...row.certifications, cert.id] : row.certifications.filter((i) => i !== cert.id)) as number[])}
                            />
                            {cert.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4 space-y-3 border-t pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">F. Technical expertise</p>
                {/* Yes/No radio pairs — a checkbox can't distinguish "unticked"
                    from "never touched", but the backend rejects null (must be
                    an explicit boolean). Radios force the user to pick. */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <YesNoRadio
                      label="Skilled operators required *"
                      value={row.requires_skilled_operators}
                      onChange={(v) => set("requires_skilled_operators", v)}
                      name={`skilled-${row.id ?? "new"}`}
                    />
                    {rErr.requires_skilled_operators && (
                      <p className="text-xs text-destructive">{rErr.requires_skilled_operators}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <YesNoRadio
                      label="Training required *"
                      value={row.requires_training}
                      onChange={(v) => set("requires_training", v)}
                      name={`training-${row.id ?? "new"}`}
                    />
                    {rErr.requires_training && (
                      <p className="text-xs text-destructive">{rErr.requires_training}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3 border-t pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">G. Future upgradation</p>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={row.upgradation_planned} onCheckedChange={(c) => set("upgradation_planned", !!c)} />
                  Upgradation planned
                </label>
                {row.upgradation_planned && (
                  <>
                    <ModalRow>
                      <ModalField label="Expected upgradation year *" error={rErr.upgradation_year}>
                        <SearchableSelect
                          value={row.upgradation_year != null && row.upgradation_year !== "" ? String(row.upgradation_year) : ""}
                          options={FUTURE_YEAR_OPTIONS}
                          onChange={(v) => set("upgradation_year", v === "" ? null : v)}
                          placeholder="Type or pick a future year…"
                        />
                      </ModalField>
                      <ModalField label="Estimated cost (₹)">
                        <Input
                          type="text"
                          inputMode="decimal"
                          maxLength={14}
                          placeholder="e.g. 1500000"
                          value={row.upgradation_cost !== null && row.upgradation_cost !== undefined ? String(row.upgradation_cost) : ""}
                          onChange={(e) => {
                            const cleaned = normaliseDecimalInput(e.target.value, { max: MAX_UPGRADATION_COST, maxDecimals: 2 });
                            set("upgradation_cost", cleaned === "" ? null : cleaned);
                          }}
                        />
                      </ModalField>
                    </ModalRow>
                    <ModalField label="Brief description">
                      <CountedTextarea
                        rows={2}
                        maxChars={MAX_LONG_TEXT_CHARS}
                        value={row.upgradation_description}
                        onChange={(v) => set("upgradation_description", v)}
                      />
                    </ModalField>
                  </>
                )}
              </div>

              <div className="mt-4 space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">H. Technical Risks ({row.risks.length})</p>
                  <button
                    type="button"
                    onClick={() =>
                      set("risks", [...row.risks, { risk_type: "", risk_type_other: "", mitigation_measure: "", existing_practice: "" }] as Risk[])
                    }
                    className="text-xs text-primary underline"
                  >
                    + add risk
                  </button>
                </div>
                {row.risks.map((r, i) => {
                  const riskErr = validateTechRisk(r);
                  return (
                  <div key={i} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Risk #{i + 1}</span>
                      <button
                        type="button"
                        onClick={() => set("risks", row.risks.filter((_, j) => j !== i) as Risk[])}
                        className="text-xs text-destructive"
                      >
                        remove
                      </button>
                    </div>
                    <div className="space-y-1">
                      <SearchableSelect
                        value={r.risk_type}
                        options={TECH_RISKS}
                        onChange={(v) => {
                          const next = [...row.risks];
                          next[i] = { ...next[i], risk_type: v };
                          set("risks", next as Risk[]);
                        }}
                        placeholder="Type to search risk…"
                      />
                      {riskErr.risk_type && (
                        <p className="text-xs text-destructive">{riskErr.risk_type}</p>
                      )}
                    </div>
                    {r.risk_type === "other" && (
                      <div className="space-y-1">
                        <Input
                          placeholder='Please specify (Others) *'
                          value={r.risk_type_other}
                          maxLength={MAX_OTHER_TEXT_CHARS}
                          onChange={(e) => {
                            const next = [...row.risks];
                            next[i] = { ...next[i], risk_type_other: e.target.value.slice(0, MAX_OTHER_TEXT_CHARS) };
                            set("risks", next as Risk[]);
                          }}
                        />
                        {riskErr.risk_type_other && (
                          <p className="text-xs text-destructive">{riskErr.risk_type_other}</p>
                        )}
                      </div>
                    )}
                    <div className="space-y-1">
                      <CountedTextarea
                        rows={2}
                        maxChars={MAX_LONG_TEXT_CHARS}
                        placeholder="Mitigation measure *"
                        value={r.mitigation_measure}
                        onChange={(v) => {
                          const next = [...row.risks];
                          next[i] = { ...next[i], mitigation_measure: v };
                          set("risks", next as Risk[]);
                        }}
                        error={Boolean(riskErr.mitigation_measure)}
                      />
                      {riskErr.mitigation_measure && (
                        <p className="text-xs text-destructive">{riskErr.mitigation_measure}</p>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </>
          );
          }}
        />
      </div>

      {/* Row-detail drawer — same ViewSheet pattern as products-section.
          Opens on row click; shows every technology field read-only. The
          Edit action closes the drawer and pops the existing edit modal
          via nestedRef.openEdit(). */}
      <ViewSheet
        open={rowView.open}
        onOpenChange={(open) => setRowView((s) => ({ ...s, open }))}
        title={rowView.row?.name || "Technology details"}
        actions={
          rowView.row
            ? [
                {
                  label: "Edit",
                  icon: Pencil,
                  onClick: () => {
                    const idx = rowView.index;
                    setRowView({ open: false, row: null, index: -1 });
                    // Defer to next tick so the sheet close animation
                    // doesn't overlap the modal open animation.
                    setTimeout(() => nestedRef.current?.openEdit(idx), 0);
                  },
                },
              ]
            : []
        }
        fields={
          rowView.row
            ? [
                // Cat A
                { label: "A. Technology Details", type: "section" },
                { label: "Name", value: rowView.row.name || "—" },
                { label: "Nature", value: rowView.row.nature || "—" },
                { label: "Source", value: rowView.row.source || "—" },
                { label: "Description", value: rowView.row.description || "—" },
                { label: "Technology provider", value: rowView.row.technology_provider || "—" },
                { label: "Country of origin", value: rowView.row.country_of_origin || "—" },
                {
                  label: "Year introduced",
                  value: rowView.row.year_introduced != null && rowView.row.year_introduced !== ""
                    ? String(rowView.row.year_introduced)
                    : "—",
                },
                {
                  label: "Technology status",
                  value: rowView.row.technology_status === "other"
                    ? `Others — ${rowView.row.technology_status_other || "(not specified)"}`
                    : techStatusLabel(rowView.row.technology_status),
                },
                // Cat B
                { label: "B. Reasons for Selection", type: "section" },
                { label: "Reasons", value: reasonLabels(rowView.row.reasons) },
                ...(rowView.row.reasons_other
                  ? [{ label: "Others (Specify)", value: rowView.row.reasons_other } as const]
                  : []),
                { label: "Justification", value: rowView.row.selection_justification || "—" },
                // Cat C
                { label: "C. Production Process", type: "section" },
                { label: "Process description", value: rowView.row.process_description || "—" },
                { label: "Process type", value: processTypeLabel(rowView.row.process_type) },
                { label: "Automation level", value: automationLabel(rowView.row.automation_level) },
                // Cat D
                { label: "D. Technology Performance", type: "section" },
                { label: "Production efficiency", value: rowView.row.expected_production_efficiency || "—" },
                { label: "Recovery", value: rowView.row.expected_recovery || "—" },
                { label: "Energy efficiency", value: rowView.row.energy_efficiency || "—" },
                { label: "Water efficiency", value: rowView.row.water_efficiency || "—" },
                { label: "Labour efficiency", value: rowView.row.labour_efficiency || "—" },
                { label: "Machine utilisation", value: rowView.row.machine_utilisation || "—" },
                { label: "Maintenance frequency", value: rowView.row.maintenance_frequency || "—" },
                {
                  label: "Expected life (years)",
                  value: rowView.row.expected_technology_life_years != null && rowView.row.expected_technology_life_years !== ""
                    ? String(rowView.row.expected_technology_life_years)
                    : "—",
                },
                // Cat E
                { label: "E. Quality Standards", type: "section" },
                {
                  label: "Quality standards applicable",
                  type: "status",
                  active: rowView.row.quality_standards_applicable === true,
                  activeLabel: "Yes",
                  inactiveLabel: "No",
                },
                ...(rowView.row.quality_standards_applicable
                  ? [
                      { label: "Product quality standard", value: rowView.row.product_quality_standard || "—" } as const,
                      { label: "Certifications", value: certificationLabels(rowView.row.certifications) } as const,
                    ]
                  : []),
                // Cat F
                { label: "F. Technical Expertise", type: "section" },
                {
                  label: "Skilled operators required",
                  type: "status",
                  active: rowView.row.requires_skilled_operators === true,
                  activeLabel: "Yes",
                  inactiveLabel: rowView.row.requires_skilled_operators === false ? "No" : "Not specified",
                },
                {
                  label: "Training required",
                  type: "status",
                  active: rowView.row.requires_training === true,
                  activeLabel: "Yes",
                  inactiveLabel: rowView.row.requires_training === false ? "No" : "Not specified",
                },
                // Cat G
                { label: "G. Future Upgradation", type: "section" },
                {
                  label: "Upgradation planned",
                  type: "status",
                  active: rowView.row.upgradation_planned === true,
                  activeLabel: "Yes",
                  inactiveLabel: "No",
                },
                ...(rowView.row.upgradation_planned
                  ? [
                      {
                        label: "Expected year",
                        value: rowView.row.upgradation_year != null && rowView.row.upgradation_year !== ""
                          ? String(rowView.row.upgradation_year)
                          : "—",
                      } as const,
                      {
                        label: "Estimated cost (₹)",
                        value: rowView.row.upgradation_cost != null && rowView.row.upgradation_cost !== ""
                          ? `₹${rowView.row.upgradation_cost}`
                          : "—",
                      } as const,
                      { label: "Description", value: rowView.row.upgradation_description || "—" } as const,
                    ]
                  : []),
                // Cat H
                { label: `H. Technical Risks (${rowView.row.risks.length})`, type: "section" },
                ...(rowView.row.risks.length === 0
                  ? [{ label: "Risks", value: "None specified" } as const]
                  : rowView.row.risks.flatMap((risk, i) => {
                      const label =
                        risk.risk_type === "other"
                          ? `Others — ${risk.risk_type_other || "(not specified)"}`
                          : TECH_RISKS.find((o) => o.value === risk.risk_type)?.label ?? risk.risk_type;
                      return [
                        {
                          label: `Risk #${i + 1}`,
                          value: label,
                        } as const,
                        {
                          label: `Mitigation #${i + 1}`,
                          value: risk.mitigation_measure || "—",
                        } as const,
                      ];
                    })),
              ]
            : []
        }
      />
    </SectionShell>
  );
}

// Yes/No radio pair for nullable booleans. Backend rejects `null`, so the UI
// must force an explicit pick — a Checkbox can't distinguish "unticked" from
// "never touched", which was the bug reported by testers.
function YesNoRadio({
  label,
  value,
  onChange,
  name,
}: {
  label: string;
  value: boolean | null | undefined;
  onChange: (v: boolean) => void;
  name: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-4">
        <label className="flex cursor-pointer items-center gap-1.5 text-sm">
          <input
            type="radio"
            name={name}
            checked={value === true}
            onChange={() => onChange(true)}
            className="h-4 w-4 accent-primary"
          />
          Yes
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-sm">
          <input
            type="radio"
            name={name}
            checked={value === false}
            onChange={() => onChange(false)}
            className="h-4 w-4 accent-primary"
          />
          No
        </label>
      </div>
    </div>
  );
}
