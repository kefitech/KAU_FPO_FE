"use client";

import { useWatch } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useDprSectionForm } from "@/hooks/use-dpr-section-form";

import { CountedTextarea } from "./counted-textarea";
import {
  normaliseDecimalInput,
  normaliseIntegerInput,
} from "./dpr-input-normalisers";
import { FieldError } from "./field-error";
import { SectionHelp } from "./section-help";
import { SectionShell } from "./section-shell";

// ── Input caps — mirror backend column widths on DPRSectionBaseline ─────
// CharField(300) for two fields; TextField (unbounded) for the rest.
// 2000 chars = ~half a page, matches the pattern used in
// investment.remarks / products.description / location.project_address.
const MAX_SHORT_TEXT_CHARS = 300;      // CharField(300) fields
const MAX_LONG_TEXT_CHARS = 2000;      // TextField (defensive cap)

// Numeric bounds — matched to real business ranges, not backend column max.
// Backend Decimal(18, 2) allows values into the trillions but no real FPO
// has a ₹100+ crore annual turnover; cap at ₹1000 crore for safety.
const MAX_ANNUAL_TURNOVER_INR = 10_000_000_000;   // ₹1000 crore
// Employee count — even the largest FPO in India is under 10k members;
// active employees on payroll are almost never over 1000.
const MAX_EMPLOYEES = 100_000;
// Capacity utilization — always 0–100 %, no exceptions.
const MAX_UTIL_PCT = 100;

/**
 * §2.3.8 Baseline — conditional Yes/No branch.
 * Backend nullable + blank on every field; server validator enforces the branch.
 */
const Schema = z.object({
  currently_engaged: z.union([z.boolean(), z.null()]),

  // If Yes
  existing_products: z.string(),
  existing_installed_capacity: z.string(),
  current_annual_production: z.string(),
  current_annual_turnover: z.union([z.string(), z.number()]).nullable(),
  existing_infrastructure: z.string(),
  existing_machinery: z.string(),
  num_employees: z.union([z.string(), z.number()]).nullable(),
  existing_market_coverage: z.string(),
  major_challenges: z.string(),
  current_capacity_utilization_pct: z.union([z.string(), z.number()]).nullable(),
  existing_certifications: z.string(),

  // If No
  reason_for_proposing: z.string(),
  previous_experience: z.string(),
  technical_guidance_available: z.string(),
  proposed_implementation_approach: z.string(),
  similar_projects_visited: z.string(),
});
type Data = z.infer<typeof Schema>;

/** Coerce Decimal-as-string and empty inputs to null before PATCH. */
function serializePayload(v: Data): Record<string, unknown> {
  const num = (x: string | number | null): string | null => {
    if (x === null || x === "") return null;
    const n = typeof x === "number" ? x : Number(x);
    return Number.isFinite(n) ? String(n) : null;
  };
  const int = (x: string | number | null): number | null => {
    if (x === null || x === "") return null;
    const n = typeof x === "number" ? x : Number(x);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  };
  return {
    ...v,
    current_annual_turnover: num(v.current_annual_turnover),
    num_employees: int(v.num_employees),
    current_capacity_utilization_pct: num(v.current_capacity_utilization_pct),
  };
}

export function BaselineSection({ uuid }: { uuid: string }) {
  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, fieldErrors, fieldWarnings, save, discard } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "baseline",
    schema: Schema,
    defaultValues: {
      currently_engaged: null,
      existing_products: "",
      existing_installed_capacity: "",
      current_annual_production: "",
      current_annual_turnover: null,
      existing_infrastructure: "",
      existing_machinery: "",
      num_employees: null,
      existing_market_coverage: "",
      major_challenges: "",
      current_capacity_utilization_pct: null,
      existing_certifications: "",
      reason_for_proposing: "",
      previous_experience: "",
      technical_guidance_available: "",
      proposed_implementation_approach: "",
      similar_projects_visited: "",
    },
    serializePayload,
  });

  // useWatch (not form.watch) — reactive subscription that reliably re-renders
  // after form.reset() from server data. See use-dpr-section-form.ts notes.
  const engaged = useWatch({ control: form.control, name: "currently_engaged" });
  // RadioGroup uses string values; map to boolean
  const radioValue =
    engaged === true ? "yes" : engaged === false ? "no" : "";

  // ── Watched values for every controlled input ──────────────────────────
  // Every text/numeric input now runs controlled (value = watched, onChange
  // = setField with shouldDirty) rather than uncontrolled via form.register.
  // Same reliability fix as location-section F3 — guarantees Save button +
  // autosave fire on every keystroke, including inside register-only text
  // inputs that RHF's dirty tracker sometimes misses.
  const existingProducts = useWatch({ control: form.control, name: "existing_products" }) ?? "";
  const existingInstalledCapacity = useWatch({ control: form.control, name: "existing_installed_capacity" }) ?? "";
  const currentAnnualProduction = useWatch({ control: form.control, name: "current_annual_production" }) ?? "";
  const currentAnnualTurnover = useWatch({ control: form.control, name: "current_annual_turnover" });
  const existingInfrastructure = useWatch({ control: form.control, name: "existing_infrastructure" }) ?? "";
  const existingMachinery = useWatch({ control: form.control, name: "existing_machinery" }) ?? "";
  const numEmployees = useWatch({ control: form.control, name: "num_employees" });
  const existingMarketCoverage = useWatch({ control: form.control, name: "existing_market_coverage" }) ?? "";
  const majorChallenges = useWatch({ control: form.control, name: "major_challenges" }) ?? "";
  const currentCapacityUtilizationPct = useWatch({ control: form.control, name: "current_capacity_utilization_pct" });
  const existingCertifications = useWatch({ control: form.control, name: "existing_certifications" }) ?? "";
  const reasonForProposing = useWatch({ control: form.control, name: "reason_for_proposing" }) ?? "";
  const previousExperience = useWatch({ control: form.control, name: "previous_experience" }) ?? "";
  const technicalGuidance = useWatch({ control: form.control, name: "technical_guidance_available" }) ?? "";
  const proposedImplementationApproach = useWatch({ control: form.control, name: "proposed_implementation_approach" }) ?? "";
  const similarProjectsVisited = useWatch({ control: form.control, name: "similar_projects_visited" }) ?? "";

  // Convenience setter — always includes shouldDirty: true.
  const setField = <K extends keyof Data>(name: K, value: Data[K]) =>
    form.setValue(name as never, value as never, { shouldDirty: true });

  // ── Live required-field validation ─────────────────────────────────────
  // Mirrors apps/fpo/services/dpr/baseline_validators.py exactly so the
  // user sees red immediately as they clear a required field — without
  // waiting for the 5s autosave + readiness fetch round-trip. Backend
  // fieldErrors still wins when present (covers server-only rules).
  const liveErrors: Record<string, string | undefined> = {};
  if (engaged === null || engaged === undefined) {
    liveErrors.currently_engaged = "Current status shall be specified (Yes/No).";
  } else if (engaged === true) {
    if (!String(existingProducts).trim()) {
      liveErrors.existing_products =
        "Existing Product(s) is required when currently engaged.";
    }
    if (!String(existingInstalledCapacity).trim()) {
      liveErrors.existing_installed_capacity =
        "Existing Installed Capacity is required when currently engaged.";
    }
  } else if (engaged === false) {
    if (!String(reasonForProposing).trim()) {
      liveErrors.reason_for_proposing =
        "Reason for proposing the activity is required when not currently engaged.";
    }
  }
  const err = (name: string): string | undefined =>
    fieldErrors.get(name) ?? liveErrors[name];

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="baseline"
      loading={isLoading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
      help={
        <SectionHelp
          title="Baseline / Current Status"
          purpose="Answer one Yes/No question — is the FPO already running the proposed business activity, or starting fresh? Your answer opens one of two different questionnaires. 'Yes' captures the existing enterprise (products, capacity, turnover, employees, challenges) so the DPR reads as an expansion story. 'No' captures the FPO's motivation and preparation so the DPR reads as a greenfield startup. Both feed the AI Project Background chapter and inform the financial projections downstream."
          whatToFill={[
            "Pick Yes if the FPO is already producing / selling the proposed product today, even at small scale. Pick No if this is a completely new activity.",
            "Yes branch — Existing product(s) and Existing installed capacity are required. Everything else is optional but strongly recommended (turnover, employees, challenges, certifications — all shape the AI narrative).",
            "Yes branch — Current annual turnover becomes the Year-0 baseline in the Financial Analysis chapter, so use the real number from your books, not a projection.",
            "Yes branch — Capacity utilization (%) means: at what fraction of your installed capacity are you actually running today? A 100 L/day machine running 65 L/day = 65 %. Realistic numbers help the DPR justify the proposed expansion.",
            "No branch — Only the 'Why is the FPO proposing this activity?' textbox is required. Explain the trigger for the decision: a member vote, a market gap, a scheme opportunity, etc.",
            "No branch — Previous experience, technical guidance, implementation approach and similar visits are optional but they demonstrate readiness. A committee reading a No-branch DPR wants confidence the FPO can actually execute.",
          ]}
          tips={[
            "Picking or switching the Yes/No radio saves immediately — no 5-second wait — because the required-field rules change with the branch. If you flip Yes → No, the Yes-branch fields hide but your typed data is preserved in the database and comes back if you flip back.",
            "Concrete numbers over adjectives. 'Manual wooden Chekku unit — 80 L/day, seasonal Oct-May' is far more useful than 'small oil unit'. The AI narrative picks up specifics and generates sharper text.",
            "Employees count is integer only — no decimals. Employment counts also cover paid workers only, not member farmers (those go in the member registry elsewhere).",
            "Turnover is in ₹ (rupees), not lakhs or crores — enter 5800000 for ₹58 lakh, not 58. The character normaliser silently strips commas and non-numeric characters, so you can paste from Excel too.",
            "Existing certifications matter for the compliance story. Even in-progress applications ('FSSAI submitted July 2026 — pending') strengthen the DPR.",
          ]}
          downstream={[
            "AI Project Background chapter — pulls whichever branch you filled to frame the project story",
            "Financial Analysis chapter — Yes branch's current turnover seeds the Y0 baseline in the projections",
            "AI Executive Summary — one-paragraph 'current state' snippet for the opening pages",
            "PDF Baseline section — renders whichever branch you filled with tabular field values",
          ]}
        />
      }
    >
      <Card>
        <CardContent className="space-y-6 p-6">
          {/* id="dpr-field-currently_engaged" is the readiness scroll target —
              clicking "Current status shall be specified (Yes/No)" from the
              readiness panel deep-links here. Placed on the outer wrapper so
              the scroll lands above the radio group. */}
          <div id="dpr-field-currently_engaged" className="space-y-3">
            <Label
              className={
                fieldErrors.has("currently_engaged") ? "text-destructive" : undefined
              }
            >
              Is the FPO currently engaged in the proposed business activity? *
            </Label>
            <RadioGroup
              value={radioValue}
              onValueChange={(v) => {
                const bool = v === "yes" ? true : v === "no" ? false : null;
                form.setValue("currently_engaged", bool, { shouldDirty: true });
                // Save immediately — the branch just changed, so the set of
                // required fields changed too. Readiness must recompute now,
                // not after the 5s autosave debounce.
                save();
              }}
              className="flex gap-6"
            >
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value="yes" />
                Yes — existing enterprise
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value="no" />
                No — new venture
              </label>
            </RadioGroup>
            {fieldErrors.has("currently_engaged") && (
              <p className="text-xs text-destructive">
                {fieldErrors.get("currently_engaged")}
              </p>
            )}
          </div>

          {engaged === true && (
            <div className="space-y-5 border-l-2 border-primary/30 pl-4">
              <FieldRow>
                <Field label="Existing product(s) / service(s) *" name="existing_products" fieldId="existing_products" errors={fieldErrors} warnings={fieldWarnings} liveError={liveErrors.existing_products}>
                  <CountedTextarea
                    rows={2}
                    maxChars={MAX_LONG_TEXT_CHARS}
                    value={existingProducts as string}
                    onChange={(v) => setField("existing_products", v)}
                    error={Boolean(err("existing_products"))}
                  />
                </Field>
                <Field label="Existing installed capacity *" name="existing_installed_capacity" fieldId="existing_installed_capacity" errors={fieldErrors} warnings={fieldWarnings} liveError={liveErrors.existing_installed_capacity}>
                  {/* Textarea instead of Input — capacity descriptions
                      often span multiple details ("Manual wooden Chekku unit —
                      80 L/day, seasonal Oct-May"). Backend is still
                      CharField(300) so the char cap stays at 300 (not 2000). */}
                  <CountedTextarea
                    rows={2}
                    maxChars={MAX_SHORT_TEXT_CHARS}
                    value={existingInstalledCapacity as string}
                    onChange={(v) => setField("existing_installed_capacity", v)}
                    error={Boolean(err("existing_installed_capacity"))}
                  />
                </Field>
              </FieldRow>
              <FieldRow>
                <Field label="Current annual production / business volume" name="current_annual_production" errors={fieldErrors} warnings={fieldWarnings}>
                  {/* Textarea — production descriptions often list multiple
                      outputs ("22,000 L oil + 8,000 kg cake"). Same
                      CharField(300) backing so cap stays at 300. */}
                  <CountedTextarea
                    rows={2}
                    maxChars={MAX_SHORT_TEXT_CHARS}
                    value={currentAnnualProduction as string}
                    onChange={(v) => setField("current_annual_production", v)}
                  />
                </Field>
                <Field label="Current annual turnover (₹)" name="current_annual_turnover" errors={fieldErrors} warnings={fieldWarnings}>
                  {/* type="text" + inputMode="decimal" — same defensive
                      pattern used across every DPR money field. Normaliser
                      strips non-numeric, enforces 2 decimals, clips at
                      ₹1000 crore. */}
                  <Input
                    type="text"
                    inputMode="decimal"
                    maxLength={14}
                    placeholder="e.g. 5800000"
                    value={currentAnnualTurnover !== null && currentAnnualTurnover !== undefined ? String(currentAnnualTurnover) : ""}
                    onChange={(e) => {
                      const cleaned = normaliseDecimalInput(e.target.value, {
                        max: MAX_ANNUAL_TURNOVER_INR,
                        maxDecimals: 2,
                      });
                      setField("current_annual_turnover", cleaned === "" ? null : cleaned);
                    }}
                  />
                </Field>
              </FieldRow>
              <FieldRow>
                <Field label="Number of employees" name="num_employees" errors={fieldErrors} warnings={fieldWarnings}>
                  {/* Backend is IntegerField — decimals must not enter here.
                      normaliseIntegerInput strips both non-digits AND the
                      decimal point, so a pasted "2.5" becomes "25" (bounded).
                      Serializer still Math.trunc()s but this stops the FE
                      from silently accepting invalid input. */}
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="e.g. 4"
                    value={numEmployees !== null && numEmployees !== undefined ? String(numEmployees) : ""}
                    onChange={(e) => {
                      const cleaned = normaliseIntegerInput(e.target.value, { max: MAX_EMPLOYEES });
                      setField("num_employees", cleaned === "" ? null : cleaned);
                    }}
                  />
                </Field>
                <Field label="Current capacity utilization (%)" name="current_capacity_utilization_pct" errors={fieldErrors} warnings={fieldWarnings}>
                  {/* 0-100 % — hard-capped via normaliser so paste of 500 or
                      -10 gets silently clipped to 100 / 0 respectively. */}
                  <Input
                    type="text"
                    inputMode="decimal"
                    maxLength={6}
                    placeholder="e.g. 65"
                    value={currentCapacityUtilizationPct !== null && currentCapacityUtilizationPct !== undefined ? String(currentCapacityUtilizationPct) : ""}
                    onChange={(e) => {
                      const cleaned = normaliseDecimalInput(e.target.value, {
                        max: MAX_UTIL_PCT,
                        maxDecimals: 2,
                      });
                      setField("current_capacity_utilization_pct", cleaned === "" ? null : cleaned);
                    }}
                  />
                </Field>
              </FieldRow>
              <Field label="Existing infrastructure available" name="existing_infrastructure" errors={fieldErrors} warnings={fieldWarnings}>
                <CountedTextarea
                  rows={2}
                  maxChars={MAX_LONG_TEXT_CHARS}
                  value={existingInfrastructure as string}
                  onChange={(v) => setField("existing_infrastructure", v)}
                />
              </Field>
              <Field label="Existing machinery available" name="existing_machinery" errors={fieldErrors} warnings={fieldWarnings}>
                <CountedTextarea
                  rows={2}
                  maxChars={MAX_LONG_TEXT_CHARS}
                  value={existingMachinery as string}
                  onChange={(v) => setField("existing_machinery", v)}
                />
              </Field>
              <Field label="Existing market coverage" name="existing_market_coverage" errors={fieldErrors} warnings={fieldWarnings}>
                <CountedTextarea
                  rows={2}
                  maxChars={MAX_LONG_TEXT_CHARS}
                  value={existingMarketCoverage as string}
                  onChange={(v) => setField("existing_market_coverage", v)}
                />
              </Field>
              <Field label="Major challenges faced" name="major_challenges" errors={fieldErrors} warnings={fieldWarnings}>
                <CountedTextarea
                  rows={2}
                  maxChars={MAX_LONG_TEXT_CHARS}
                  value={majorChallenges as string}
                  onChange={(v) => setField("major_challenges", v)}
                />
              </Field>
              <Field label="Existing certifications (if any)" name="existing_certifications" errors={fieldErrors} warnings={fieldWarnings}>
                <CountedTextarea
                  rows={2}
                  maxChars={MAX_LONG_TEXT_CHARS}
                  value={existingCertifications as string}
                  onChange={(v) => setField("existing_certifications", v)}
                />
              </Field>
            </div>
          )}

          {engaged === false && (
            <div className="space-y-5 border-l-2 border-primary/30 pl-4">
              <Field label="Why is the FPO proposing this activity? *" name="reason_for_proposing" fieldId="reason_for_proposing" errors={fieldErrors} warnings={fieldWarnings} liveError={liveErrors.reason_for_proposing}>
                <CountedTextarea
                  rows={3}
                  maxChars={MAX_LONG_TEXT_CHARS}
                  value={reasonForProposing as string}
                  onChange={(v) => setField("reason_for_proposing", v)}
                  error={Boolean(err("reason_for_proposing"))}
                />
              </Field>
              <Field label="Previous experience of the FPO or members" name="previous_experience" errors={fieldErrors} warnings={fieldWarnings}>
                <CountedTextarea
                  rows={2}
                  maxChars={MAX_LONG_TEXT_CHARS}
                  value={previousExperience as string}
                  onChange={(v) => setField("previous_experience", v)}
                />
              </Field>
              <Field label="Technical guidance / support available" name="technical_guidance_available" errors={fieldErrors} warnings={fieldWarnings}>
                <CountedTextarea
                  rows={2}
                  maxChars={MAX_LONG_TEXT_CHARS}
                  value={technicalGuidance as string}
                  onChange={(v) => setField("technical_guidance_available", v)}
                />
              </Field>
              <Field label="Proposed implementation approach" name="proposed_implementation_approach" errors={fieldErrors} warnings={fieldWarnings}>
                <CountedTextarea
                  rows={3}
                  maxChars={MAX_LONG_TEXT_CHARS}
                  value={proposedImplementationApproach as string}
                  onChange={(v) => setField("proposed_implementation_approach", v)}
                />
              </Field>
              <Field label="Similar projects visited (if any)" name="similar_projects_visited" errors={fieldErrors} warnings={fieldWarnings}>
                <CountedTextarea
                  rows={2}
                  maxChars={MAX_LONG_TEXT_CHARS}
                  value={similarProjectsVisited as string}
                  onChange={(v) => setField("similar_projects_visited", v)}
                />
              </Field>
            </div>
          )}
        </CardContent>
      </Card>
    </SectionShell>
  );
}

// ── Local layout helpers (kept inline; will graduate to a shared file if used again) ──

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({
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
   * When set, applies `id="dpr-field-<fieldId>"` on the wrapper div — this
   * is the anchor the readiness panel scrolls to when the user clicks a
   * field-level error. Same convention as every other DPR section.
   */
  fieldId?: string;
  /**
   * Optional client-side error message. Rendered ALONGSIDE the backend
   * `FieldError` — live rule catches required-field emptiness immediately
   * on keystroke, without waiting for the ~5s autosave + readiness fetch
   * round-trip. Same pattern as location-section's `err()` helper.
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
        // Backend wins when present (covers server-only rules).
        name && errors && <FieldError name={name} errors={errors} warnings={warnings} />
      ) : liveError ? (
        // Fall back to live rule.
        <p className="mt-1 text-xs text-destructive">{liveError}</p>
      ) : (
        // No error but there may still be a warning.
        name && errors && <FieldError name={name} errors={errors} warnings={warnings} />
      )}
    </div>
  );
}
