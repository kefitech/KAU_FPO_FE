"use client";

import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { useWatch } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";

import { useDprSectionForm } from "@/hooks/use-dpr-section-form";
import { dprMasterApi, type DprMasterItem } from "@/lib/api/dpr-master";

import { CountedTextarea } from "./counted-textarea";
import { SectionHelp } from "./section-help";
import { SectionShell } from "./section-shell";

/**
 * §2.3.19 Compliance — unified through-table for all 6 spec categories.
 * UI: 6 grouped panels (business/project/environmental/food_quality/labour/insurance).
 * For each master registration in that category: user optionally picks a status +
 * fills issuing authority / date / remarks. Only rows with a non-empty status get sent.
 */

// ── Input caps — mirror backend DPRSectionCompliance + DPRComplianceItem ──
const MAX_TEXT_CHARS = 200;              // expected_resolution_timeline
const MAX_LONG_CHARS = 300;              // present_status, issuing_authority
const MAX_LONG_TEXT_CHARS = 2000;        // TextField defensive cap

const StatusValues = [
  "available",
  "proposed_to_obtain",
  "not_applicable",
  "applied",
  "under_review",
  "approved",
  "rejected",
] as const;

const STATUS_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "proposed_to_obtain", label: "Proposed to Obtain" },
  { value: "not_applicable", label: "Not Applicable" },
  { value: "applied", label: "Applied" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

// ── Per-status field configuration ────────────────────────────────────────
//
// Different statuses ask different questions of the FPO. Rather than always
// showing "Issuing Authority + Expected Date of Approval + Remarks" for any
// non-empty status (noisy + confusing for e.g. "Not Applicable"), we adapt:
//   - Not Applicable → hide Authority + Date, keep Remarks (with a "why not?"
//     placeholder + subtle "recommended" hint if left blank)
//   - Rejected → show all 3 with a Remarks explanation strongly encouraged
//   - Available/Approved → date label becomes "Date obtained/approval"
//   - Applied/Under Review → date label stays "Expected date of approval"
//   - Proposed to Obtain → date label becomes "Target date to obtain"
//
// Zero backend impact — we reuse the existing 4 fields, just show/hide/relabel.
type StatusFieldConfig = {
  showAuthority: boolean;
  showDate: boolean;
  dateLabel: string;
  remarksPlaceholder: string;
  remarksRecommended: boolean;
  topHint?: string;
};

function getStatusFieldConfig(status: string): StatusFieldConfig {
  switch (status) {
    case "available":
      return {
        showAuthority: true,
        showDate: true,
        dateLabel: "Date obtained",
        remarksPlaceholder: "Any notes (e.g. certificate number, validity)",
        remarksRecommended: false,
      };
    case "approved":
      return {
        showAuthority: true,
        showDate: true,
        dateLabel: "Date of approval",
        remarksPlaceholder: "Any notes (e.g. certificate number)",
        remarksRecommended: false,
      };
    case "applied":
      return {
        showAuthority: true,
        showDate: true,
        dateLabel: "Expected date of approval",
        remarksPlaceholder: "Application reference number, date submitted",
        remarksRecommended: false,
        topHint: "Track your application reference in Remarks so you can follow up easily.",
      };
    case "under_review":
      return {
        showAuthority: true,
        showDate: true,
        dateLabel: "Expected date of approval",
        remarksPlaceholder: "Any queries raised, expected timeline",
        remarksRecommended: false,
      };
    case "proposed_to_obtain":
      return {
        showAuthority: true,
        showDate: true,
        dateLabel: "Target date to obtain",
        remarksPlaceholder: "Plan details — when you'll apply, expected route",
        remarksRecommended: false,
      };
    case "rejected":
      return {
        showAuthority: true,
        showDate: true,
        dateLabel: "Date of rejection",
        remarksPlaceholder: "Reason for rejection + next steps",
        remarksRecommended: true,
      };
    case "not_applicable":
      return {
        showAuthority: false,
        showDate: false,
        dateLabel: "",
        remarksPlaceholder: "Why is this not applicable to your project?",
        remarksRecommended: true,
      };
    default:
      return {
        showAuthority: true,
        showDate: true,
        dateLabel: "Expected date of approval",
        remarksPlaceholder: "Remarks",
        remarksRecommended: false,
      };
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  business: "A. Business Registrations",
  project: "B. Project Approvals",
  environmental: "C. Environmental Compliance",
  food_quality: "D. Food Safety & Quality",
  labour: "E. Labour Compliance",
  insurance: "F. Insurance",
};

const ItemSchema = z.object({
  id: z.number().optional(),
  registration: z.number().nullable(),
  custom_name: z.string(),
  status: z.string(),
  issuing_authority: z.string(),
  expected_date_of_approval: z.string().nullable(),
  remarks: z.string(),
});
type Item = z.infer<typeof ItemSchema>;

const Schema = z.object({
  has_pending_legal_issues: z.boolean(),
  nature_of_case: z.string(),
  possible_impact: z.string(),
  present_status: z.string(),
  expected_resolution_timeline: z.string(),
  items: z.array(ItemSchema),
});
type Data = z.infer<typeof Schema>;

function emptyItem(regId: number): Item {
  return {
    registration: regId,
    custom_name: "",
    status: "",
    issuing_authority: "",
    expected_date_of_approval: null,
    remarks: "",
  };
}

function serializePayload(v: Data): Record<string, unknown> {
  // Only send items where user picked a status; drop empty rows.
  const items = v.items.filter((it) => it.status !== "" || it.custom_name.trim() !== "");
  return {
    ...v,
    items: items.map((it) => ({
      ...it,
      expected_date_of_approval: it.expected_date_of_approval || null,
    })),
  };
}

export function ComplianceSection({ uuid }: { uuid: string }) {
  const registrationsQuery = useQuery({
    queryKey: ["dpr-master", "statutory-registrations"],
    queryFn: () => dprMasterApi.list("statutory-registrations"),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, fieldErrors, fieldWarnings, save, discard } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "compliance",
    schema: Schema,
    defaultValues: {
      has_pending_legal_issues: false,
      nature_of_case: "",
      possible_impact: "",
      present_status: "",
      expected_resolution_timeline: "",
      items: [],
    },
    serializePayload,
  });

  // useWatch — reactive subscriptions (form.watch is stale after form.reset).
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const hasLegal = useWatch({ control: form.control, name: "has_pending_legal_issues" });
  const natureOfCase = useWatch({ control: form.control, name: "nature_of_case" }) ?? "";
  const possibleImpact = useWatch({ control: form.control, name: "possible_impact" }) ?? "";
  const presentStatus = useWatch({ control: form.control, name: "present_status" }) ?? "";
  const expectedResolutionTimeline = useWatch({ control: form.control, name: "expected_resolution_timeline" }) ?? "";

  // Convenience setter — always includes shouldDirty: true.
  const setField = <K extends keyof Data>(name: K, value: Data[K]) =>
    form.setValue(name as never, value as never, { shouldDirty: true });

  // Group masters by category
  const grouped = useMemo(() => {
    if (!registrationsQuery.data) return {} as Record<string, DprMasterItem[]>;
    const out: Record<string, DprMasterItem[]> = {};
    for (const r of registrationsQuery.data) {
      const c = (r.category as string) || "other";
      (out[c] ??= []).push(r);
    }
    return out;
  }, [registrationsQuery.data]);

  // Detect whether the mandatory FPO registration row has been picked
  // (backend enforces this specifically per Cat A rule).
  const hasFpoRegistration = useMemo(() => {
    if (!registrationsQuery.data) return false;
    const fpoReg = registrationsQuery.data.find((r) => r.code === "fpo_registration");
    if (!fpoReg) return false;
    return items.some((it) => it.registration === fpoReg.id && it.status !== "");
  }, [registrationsQuery.data, items]);

  function findItem(regId: number): { item: Item | undefined; index: number } {
    const index = items.findIndex((it) => it.registration === regId);
    return { item: items[index], index };
  }

  function updateFieldFor<K extends keyof Item>(regId: number, field: K, value: Item[K]) {
    const { item, index } = findItem(regId);
    const next = [...items];
    if (index === -1) {
      next.push({ ...emptyItem(regId), [field]: value });
    } else {
      next[index] = { ...item!, [field]: value };
    }
    form.setValue("items", next, { shouldDirty: true });
  }

  // Section-level live errors — mirror compliance_validators.py.
  // See HR/Finance for why we prefer live over stale backend errors: for
  // LIVE_CHECKED keys the FE result is the truth; backend errors only refresh
  // AFTER save + readiness refetch, so during the ~5s autosave gap the fixed
  // field would still show a stale red message.
  const LIVE_CHECKED = new Set<string>([
    "items",
    "nature_of_case",
    "possible_impact",
  ]);
  const liveErrors: Record<string, string | undefined> = {};
  if (!hasFpoRegistration && registrationsQuery.data) {
    liveErrors.items = "FPO / Producer Company Registration shall be specified (pick a status for the FPO Registration row in Cat A).";
  }
  if (hasLegal && !String(natureOfCase).trim()) {
    liveErrors.nature_of_case = "Nature of Case is required when pending legal issues are declared.";
  }
  if (hasLegal && !String(possibleImpact).trim()) {
    liveErrors.possible_impact = "Possible Impact on Project is required when pending legal issues are declared.";
  }
  const err = (name: string): string | undefined =>
    LIVE_CHECKED.has(name) ? liveErrors[name] : fieldErrors.get(name);

  const loading = isLoading || registrationsQuery.isLoading;

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="compliance"
      loading={loading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
      help={
        <SectionHelp
          title="Statutory Approvals, Licences & Regulatory Compliance"
          purpose="Capture the FPO's regulatory footprint — business registrations, project approvals, environmental clearances, food safety + quality standards, labour compliance, insurance, and any pending legal issues. For each of the 51 seeded master registrations, pick a status (Available / Applied / Under Review / Approved / Proposed to Obtain / Rejected / Not Applicable). This feeds the Compliance chapter of the DPR PDF and is a bank-appraisal must-have."
          whatToFill={[
            "A — Business Registrations. **FPO / Producer Company Registration is MANDATORY** (backend enforces). Also common: PAN, TAN, GST, MSME/Udyam, Bank account. Pick the status for each that applies.",
            "B — Project Approvals. Panchayat NOC, Land Conversion, Building Plan Approval, Electrical Inspector, Factory Licence. Non-applicable items → mark 'Not Applicable' so they show explicitly in the DPR PDF as considered-and-excluded.",
            "C — Environmental Compliance. Pollution Control Board (Consent to Establish + Operate), EIA / Environmental Clearance, Water Cess, Hazardous Waste. Below threshold → 'Not Applicable'.",
            "D — Food Safety & Quality. FSSAI Central / State Licence, BIS/ISI, AGMARK, Organic. FSSAI is the base food-processing licence — always applicable for any food product.",
            "E — Labour Compliance. EPF, ESI, Contract Labour Licence, Shops & Establishments, Minimum Wages. Match what you ticked in the HR section (Cat H).",
            "F — Insurance. Property, Workmen's Compensation, Public Liability. Bank appraisers usually expect at least Property + WC to be planned before disbursement.",
            "G — Pending Legal Issues (optional). Tick 'The FPO has pending legal issues' ONLY if there's a real ongoing case. Nature + Possible Impact become required.",
          ]}
          tips={[
            "The mandatory bar is low: just pick a status for the FPO Registration row. Everything else is 'recommended but not blocking' — but a compliance chapter with only 1 row reads poorly to bankers.",
            "Use 'Not Applicable' generously — it explicitly shows you considered the requirement and decided it doesn't apply. Blank rows just look forgotten.",
            "Issuing Authority + Expected Date + Remarks only appear AFTER you pick a status — one row at a time. Fill them if you have the info.",
            "Approved / Available = you already have the paper. Applied / Under Review = in-progress. Proposed to Obtain = plan to apply before commissioning. Rejected = need re-application plan.",
            "Pending Legal Issues — be honest here. Undeclared legal issues surface in due diligence and torpedo funding. Better to declare + explain the low impact.",
            "Labour Cat E items should match what HR section (Cat H) statutory-compliance checklist has ticked — cross-check if you're getting warnings.",
          ]}
          downstream={[
            "Compliance chapter in the DPR PDF — full A-F status matrix + Cat G legal issues all render there",
            "Risk Analysis chapter — Rejected / Under Review items surface as regulatory risks",
            "Implementation Plan — Applied / Proposed items feed the pre-operative activities list with expected approval dates",
            "AI narrative — compliance profile feeds the Regulatory Environment paragraph",
          ]}
        />
      }
    >
      <div className="space-y-4">
        {Object.entries(CATEGORY_LABELS).map(([catKey, catLabel]) => (
          <Card
            key={catKey}
            /* First card ("business" — Registrations) is the deep-link target
               for `items.*` errors. Setting the id on the visible Card ensures
               the flash animation lands on something the user can see. */
            id={catKey === "business" ? "dpr-field-items" : undefined}
          >
            <CardContent className="space-y-3 p-6">
              <h3 className={`text-sm font-semibold ${catKey === "business" && err("items") ? "text-destructive" : ""}`}>
                {catLabel}
              </h3>
              {catKey === "business" && err("items") && (
                <p className="text-xs text-destructive">{err("items")}</p>
              )}
              <div className="space-y-2">
                {(grouped[catKey] ?? []).map((reg) => {
                  const { item } = findItem(reg.id);
                  const hasStatus = item?.status && item.status !== "";
                  const isFpoReg = reg.code === "fpo_registration";
                  return (
                    <div
                      key={reg.id}
                      className={`rounded-md border p-3 transition-colors ${
                        hasStatus ? "border-primary/30 bg-primary/[0.03]" : "border-transparent hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex-1 text-sm">
                          {reg.label}
                          {isFpoReg && <span className="ml-1 text-destructive">*</span>}
                        </span>
                        <div className="w-56">
                          <SearchableSelect
                            value={item?.status ?? ""}
                            options={STATUS_OPTIONS}
                            onChange={(v) => updateFieldFor(reg.id, "status", v as typeof StatusValues[number])}
                            placeholder="Not tracked"
                          />
                        </div>
                      </div>
                      {hasStatus && (() => {
                        const cfg = getStatusFieldConfig(item!.status);
                        const remarksMissing = !((item?.remarks ?? "").trim());
                        return (
                          <div className="mt-3 space-y-2 pl-2">
                            {cfg.topHint && (
                              <p className="text-[10px] italic text-muted-foreground">
                                {cfg.topHint}
                              </p>
                            )}
                            {(cfg.showAuthority || cfg.showDate) && (
                              <div className="grid gap-2 sm:grid-cols-2">
                                {cfg.showAuthority && (
                                  <Input
                                    className="h-8 text-xs"
                                    placeholder="Issuing authority"
                                    maxLength={MAX_LONG_CHARS}
                                    value={item?.issuing_authority ?? ""}
                                    onChange={(e) => updateFieldFor(reg.id, "issuing_authority", e.target.value.slice(0, MAX_LONG_CHARS))}
                                  />
                                )}
                                {cfg.showDate && (
                                  <div className="space-y-0.5">
                                    <Label className="text-[10px] text-muted-foreground">{cfg.dateLabel}</Label>
                                    <Input
                                      type="date"
                                      className="h-8 text-xs"
                                      value={item?.expected_date_of_approval ?? ""}
                                      onChange={(e) => updateFieldFor(reg.id, "expected_date_of_approval", e.target.value || null)}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                            <div>
                              <Input
                                className="h-8 text-xs"
                                placeholder={cfg.remarksPlaceholder}
                                maxLength={MAX_LONG_TEXT_CHARS}
                                value={item?.remarks ?? ""}
                                onChange={(e) => updateFieldFor(reg.id, "remarks", e.target.value.slice(0, MAX_LONG_TEXT_CHARS))}
                              />
                              {cfg.remarksRecommended && remarksMissing && (
                                <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-500">
                                  Recommended: add a brief explanation so bankers understand the context.
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Cat G — Pending Legal Issues */}
        <Card>
          <CardContent className="space-y-4 p-6">
            <h3 className="text-sm font-semibold">G. Pending Legal Issues</h3>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={hasLegal}
                onCheckedChange={(c) => setField("has_pending_legal_issues", !!c)}
              />
              <span>The FPO has pending legal issues</span>
            </label>
            {hasLegal && (
              <div className="space-y-3 border-l-2 border-primary/30 pl-4">
                <div id="dpr-field-nature_of_case" className="space-y-1.5">
                  <Label className={err("nature_of_case") ? "text-destructive" : undefined}>
                    Nature of case *
                  </Label>
                  <CountedTextarea
                    rows={2}
                    maxChars={MAX_LONG_TEXT_CHARS}
                    value={natureOfCase as string}
                    onChange={(v) => setField("nature_of_case", v)}
                    error={Boolean(err("nature_of_case"))}
                  />
                  {err("nature_of_case") && (
                    <p className="text-xs text-destructive">{err("nature_of_case")}</p>
                  )}
                </div>
                <div id="dpr-field-possible_impact" className="space-y-1.5">
                  <Label className={err("possible_impact") ? "text-destructive" : undefined}>
                    Possible impact on project *
                  </Label>
                  <CountedTextarea
                    rows={2}
                    maxChars={MAX_LONG_TEXT_CHARS}
                    value={possibleImpact as string}
                    onChange={(v) => setField("possible_impact", v)}
                    error={Boolean(err("possible_impact"))}
                  />
                  {err("possible_impact") && (
                    <p className="text-xs text-destructive">{err("possible_impact")}</p>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Present status</Label>
                    <Input
                      value={presentStatus as string}
                      maxLength={MAX_LONG_CHARS}
                      onChange={(e) => setField("present_status", e.target.value.slice(0, MAX_LONG_CHARS))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Expected resolution timeline</Label>
                    <Input
                      value={expectedResolutionTimeline as string}
                      maxLength={MAX_TEXT_CHARS}
                      onChange={(e) => setField("expected_resolution_timeline", e.target.value.slice(0, MAX_TEXT_CHARS))}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Warnings surfaced from readiness — non-blocking. */}
        {fieldWarnings.has("items") && (
          <p className="text-xs text-amber-600 dark:text-amber-500">{fieldWarnings.get("items")}</p>
        )}
      </div>
    </SectionShell>
  );
}
