"use client";

import { useWatch } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDprSectionForm } from "@/hooks/use-dpr-section-form";

import { SectionHelp } from "./section-help";
import { SectionShell } from "./section-shell";

// ── Money input bounds + normaliser ────────────────────────────────────────
// Backend column is Decimal(max_digits=15, decimal_places=2) → theoretical
// ceiling of ~₹10 trillion. That is meaningless for an FPO. A generous
// operational cap is ₹1,000 crore (10 billion) — bigger than any credible
// FPO / KAU-linked project. Anything beyond that is almost certainly a
// mistyped or pasted garbage number, so we clip it silently at the input
// layer rather than surface a validator error post-save.
const MAX_PROJECT_COST_INR = 10_000_000_000; // ₹1000 crore

/**
 * Normalise a raw string from a money input so it:
 *   1. Keeps only digits + one decimal point
 *   2. Trims to at most 2 decimal places (matches backend decimal_places)
 *   3. Clips at MAX_PROJECT_COST_INR — silently caps runaway values pasted
 *      from anywhere
 * Empty string passes through untouched so the field can be cleared.
 */
function normaliseMoneyInput(raw: string, max = MAX_PROJECT_COST_INR): string {
  if (raw === "" || raw == null) return "";
  const cleaned = raw.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  const withOneDot =
    parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;
  const [intPart = "", decPart] = withOneDot.split(".");
  const trimmedDec = decPart !== undefined ? decPart.slice(0, 2) : undefined;
  const finalStr =
    trimmedDec !== undefined ? `${intPart}.${trimmedDec}` : intPart;
  if (finalStr === "" || finalStr === ".") return finalStr;
  const n = Number(finalStr);
  if (Number.isFinite(n) && n > max) return String(max);
  return finalStr;
}

// Backend `remarks` column is TextField (no max_length). Postgres TEXT is
// ~1GB max but that's meaningless for a comment field — kills PDF layout,
// breaks admin views, bloats DB. Cap here to a reasonable ~half-page value.
const MAX_REMARKS_CHARS = 2000;

// Choices mirror apps/database/models/dpr/investment.py::BASIS_CHOICES
const BASIS_OPTIONS = [
  { value: "consultant",        label: "Consultant Estimate" },
  { value: "preliminary_fpo",   label: "Preliminary Estimate by FPO" },
  { value: "machinery_quote",   label: "Machinery Quotations" },
  { value: "civil_estimate",    label: "Civil Estimate" },
  { value: "govt_estimate",     label: "Government Estimate" },
  { value: "not_yet_estimated", label: "Not Yet Estimated" },
];

// Backend returns Decimal as string; accept nullable string/number in form,
// coerce to string|null right before PATCH (see `serializePayload`).
const InvestmentSchema = z.object({
  estimated_project_cost: z.union([z.string(), z.number()]).nullable(),
  basis_of_estimate: z.string(),
  remarks: z.string(),
});
type InvestmentData = z.infer<typeof InvestmentSchema>;

function serializePayload(v: InvestmentData): Record<string, unknown> {
  let cost: string | null;
  if (v.estimated_project_cost === null || v.estimated_project_cost === "") {
    cost = null;
  } else {
    const n = typeof v.estimated_project_cost === "number"
      ? v.estimated_project_cost
      : Number(v.estimated_project_cost);
    cost = Number.isFinite(n) ? String(n) : null;
  }
  return {
    estimated_project_cost: cost,
    basis_of_estimate: v.basis_of_estimate,
    remarks: v.remarks,
  };
}

export function InvestmentSection({ uuid }: { uuid: string }) {
  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, save, discard } = useDprSectionForm<InvestmentData>({
    uuid,
    sectionKey: "investment",
    schema: InvestmentSchema,
    defaultValues: {
      estimated_project_cost: null,
      basis_of_estimate: "",
      remarks: "",
    },
    serializePayload,
  });

  // Use `useWatch` (not `form.watch`) — reliable subscription so the Select
  // reflects server-loaded data on page reload, not just user clicks.
  const basisValue =
    useWatch({ control: form.control, name: "basis_of_estimate" }) ?? "";
  // Same treatment for cost + remarks — register() based inputs occasionally
  // don't propagate to the payload when Save is clicked (RHF proxy quirk seen
  // in the wild). Reading via useWatch + writing via setValue is the same
  // pattern that works reliably for the Select above.
  const costValue =
    useWatch({ control: form.control, name: "estimated_project_cost" }) ?? "";
  const remarksValue =
    useWatch({ control: form.control, name: "remarks" }) ?? "";

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="investment"
      loading={isLoading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
      help={
        <SectionHelp
          title="Proposed Project Investment"
          purpose="Capture a rough ballpark of the total project cost your FPO expects to spend. This is your own early-stage estimate — used later as a sanity check against the auto-computed cost that the Finance section adds up from line items. All three fields are optional; if you don't have numbers yet, leave the section blank and come back after you've filled Machinery, Civil, and Finance."
          whatToFill={[
            "Estimated Total Project Cost — a single ₹ amount for the whole project (land + machinery + civil + working capital combined). Enter your best guess today; you can refine it later.",
            "Basis of Estimate — pick where the number came from: own guess (Preliminary Estimate by FPO), consultant, machinery quotations, civil estimate, government scheme figure, or 'Not Yet Estimated' if you're just placeholder-filling.",
            "Remarks — optional free-text notes (max 2000 characters). Useful for logging references like 'quotes from XYZ Machinery Pvt Ltd, June 2026' or 'based on visits to two operating units in Kozhikode'.",
            "Skipping is fine. Empty section is complete by design — the DPR PDF will then use the auto-computed cost as authoritative.",
          ]}
          tips={[
            "Not authoritative. Whatever you enter here is your ballpark; the Finance section's line-item sum is what the DPR PDF actually shows. If the two differ by more than 10%, the system flags it as a warning so you can either update this estimate or reconcile the Finance section.",
            "Coconut oil FPO reference: a 500 L/day unit typically ballparks around ₹1–1.5 crore (copra procurement + oil extraction machinery + packaging line + initial working capital). Use this only as a rough scale check.",
            "Maximum accepted: ₹1,000 crore. Beyond that the input silently caps the value — bigger than any credible FPO / KAU-linked project.",
            "If you're unsure about the basis, pick 'Preliminary Estimate by FPO' — it's the honest default for early-stage planning. Change it later once you gather consultant estimates or machinery quotations.",
          ]}
          downstream={[
            "Finance section — your estimate is compared against the auto-computed line-item cost total; a variance above threshold shows a warning here",
            "AI Financial Analysis chapter — informs the 'FPO's own view' narrative alongside the auto-computed number",
            "PDF cover page + Investment section — the 'FPO estimate vs auto-computed cost' comparison table renders both values with variance %",
          ]}
        />
      }
    >
      <Card>
        <CardContent className="space-y-5 p-6">
          {/* id="dpr-field-estimated_project_cost" is the readiness scroll
              target — click on "Estimated Project Cost shall be greater than
              zero" from the readiness panel deep-links here. */}
          <div id="dpr-field-estimated_project_cost" className="space-y-2">
            <Label htmlFor="estimated_project_cost">
              Estimated Total Project Cost (₹)
            </Label>
            <Input
              id="estimated_project_cost"
              // type="text" so we can control every character. type="number"
              // blocks non-numeric but has NO length cap — a paste of 60
              // digits sails through. inputMode="decimal" keeps mobile
              // keypads correct.
              type="text"
              inputMode="decimal"
              maxLength={14}   // 11 int digits + '.' + 2 decimal = plenty for ₹1000 Cr
              placeholder="e.g. 5000000 (₹50 lakh)"
              value={costValue as string | number}
              onChange={(e) => {
                const cleaned = normaliseMoneyInput(e.target.value);
                form.setValue(
                  "estimated_project_cost",
                  cleaned === "" ? null : cleaned,
                  { shouldDirty: true },
                );
              }}
            />
            <p className="text-xs text-muted-foreground">
              Optional. If provided, the system compares against the auto-computed
              cost during DPR generation. Maximum accepted: ₹1,000 crore.
            </p>
          </div>

          <div id="dpr-field-basis_of_estimate" className="space-y-2">
            <Label htmlFor="basis_of_estimate">Basis of Estimate</Label>
            <Select
              value={basisValue}
              onValueChange={(v) =>
                form.setValue("basis_of_estimate", v, { shouldDirty: true })
              }
            >
              <SelectTrigger id="basis_of_estimate">
                <SelectValue placeholder="Select basis of estimate" />
              </SelectTrigger>
              <SelectContent>
                {BASIS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="remarks">Remarks</Label>
              {/* Character counter — mirrors the identification section's
                  brief_description counter pattern. Turns amber near the
                  cap so the user gets a heads-up before hitting the limit. */}
              {(() => {
                const len = ((remarksValue as string) ?? "").length;
                const near = len > MAX_REMARKS_CHARS * 0.9;
                const at = len >= MAX_REMARKS_CHARS;
                return (
                  <span
                    className={
                      at
                        ? "text-xs font-medium text-destructive"
                        : near
                          ? "text-xs text-amber-600"
                          : "text-xs text-muted-foreground"
                    }
                  >
                    {len} / {MAX_REMARKS_CHARS} chars
                  </span>
                );
              })()}
            </div>
            <Textarea
              id="remarks"
              placeholder="Optional notes about this estimate…"
              rows={3}
              // Hard-cap via maxLength — browser blocks further typing / paste
              // once the limit is hit. onChange defensively double-checks in
              // case a script bypasses the DOM cap.
              maxLength={MAX_REMARKS_CHARS}
              value={remarksValue as string}
              onChange={(e) =>
                form.setValue(
                  "remarks",
                  e.target.value.slice(0, MAX_REMARKS_CHARS),
                  { shouldDirty: true },
                )
              }
            />
          </div>
        </CardContent>
      </Card>
    </SectionShell>
  );
}
