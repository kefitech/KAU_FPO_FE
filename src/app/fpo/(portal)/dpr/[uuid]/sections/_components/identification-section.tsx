"use client";

/**
 * §2.2 Project Identification — the pre-wizard header form.
 * Not stored in a section table; PATCHed onto DPRProject itself.
 *
 * 7 fields: title, project_types (M2M), brief_description (≥50 chars),
 * primary_commodity (FK), secondary_commodities (M2M), objectives+other,
 * outcomes+other. Backend validator: identification_validators.py.
 *
 * Author: Athul Gopan kefi tech solutions
 */

import { useEffect, useRef, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import {
  type BoardMeetingFrequency,
  dprApi,
  type DprProjectIdentification,
  type PscMember,
} from "@/lib/api/dpr";
import { dprMasterApi } from "@/lib/api/dpr-master";
import { useDprWizardStore } from "@/stores/dpr-store";

import { FieldError } from "./field-error";
import { SectionHelp } from "./section-help";
import { SectionShell } from "./section-shell";

const AUTOSAVE_DEBOUNCE_MS = 5000;
// Matches DPRProject.title max_length on the backend.
const TITLE_MAX_CHARS = 255;

// Public master-data commodity endpoint (not DPR-specific, from Section §2.2 field 4/5).
type CommodityRow = { id: number; code: string; name: string };
type MasterDataResponse = { category: string; count: number; results: CommodityRow[] };
async function fetchCommodities(): Promise<{ id: number; label: string }[]> {
  const r = await api.get<MasterDataResponse>("/public/master-data/", {
    params: { category: "commodity" },
  });
  return (r.data.results ?? []).map((x) => ({ id: x.id, label: x.name }));
}

export function IdentificationSection({ uuid }: { uuid: string }) {
  const queryClient = useQueryClient();
  const markDirty = useDprWizardStore((s) => s.markDirty);
  const markClean = useDprWizardStore((s) => s.markClean);
  const markSaving = useDprWizardStore((s) => s.markSaving);
  const markSaved = useDprWizardStore((s) => s.markSaved);

  // Master data
  const projectTypesQ = useQuery({
    queryKey: ["dpr-master", "project-types"],
    queryFn: () => dprMasterApi.list("project-types"),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const objectivesQ = useQuery({
    queryKey: ["dpr-master", "project-objectives"],
    queryFn: () => dprMasterApi.list("project-objectives"),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const outcomesQ = useQuery({
    queryKey: ["dpr-master", "project-outcomes"],
    queryFn: () => dprMasterApi.list("project-outcomes"),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const commodityQ = useQuery({
    queryKey: ["public-master", "commodity"],
    queryFn: fetchCommodities,
    staleTime: 24 * 60 * 60 * 1000,
  });

  // Server state
  const projectQ = useQuery({
    queryKey: ["dpr-identification", uuid],
    queryFn: () => dprApi.getIdentification(uuid),
    enabled: !!uuid,
  });

  // Local editable form state (mirrors server; seeded once)
  const [form, setForm] = useState<DprProjectIdentification | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const hasSeededRef = useRef(false);

  useEffect(() => {
    if (projectQ.data && !hasSeededRef.current) {
      setForm(projectQ.data);
      hasSeededRef.current = true;
    }
  }, [projectQ.data]);

  // Readiness (backend errors per field)
  const readinessQ = useQuery({
    queryKey: ["dpr-identification-readiness", uuid],
    queryFn: () => dprApi.getIdentificationReadiness(uuid),
    enabled: !!uuid,
    staleTime: 5_000,
  });
  const fieldErrors = new Map<string, string>();
  const fieldWarnings = new Map<string, string>();
  for (const e of readinessQ.data?.errors ?? []) fieldErrors.set(e.field, e.message);
  for (const w of readinessQ.data?.warnings ?? []) fieldWarnings.set(w.field, w.message);
  // Live-checked required fields — mirror identification_validators.py so the
  // user sees an inline error the moment they blank a required input.
  // Readiness-only errors are stale here: the FPO clears a field, hits Save,
  // backend rejects the PATCH (400) so the DB still holds the old value, and
  // the readiness endpoint keeps reporting "all good". Live checks override
  // whatever readiness says for these keys.
  if (form) {
    if (!(form.title ?? "").trim()) {
      fieldErrors.set("title", "Project Title is required.");
    }
    if (!form.project_types || form.project_types.length === 0) {
      fieldErrors.set("project_types", "At least one project type shall be selected.");
    }
    const desc = (form.brief_description ?? "").trim();
    if (!desc) {
      fieldErrors.set("brief_description", "Brief Description of the Project is required.");
    } else if (desc.length < 50) {
      fieldErrors.set(
        "brief_description",
        `Brief Description shall be at least 50 characters (currently ${desc.length}).`,
      );
    }
    if (form.primary_commodity === null || form.primary_commodity === undefined) {
      fieldErrors.set("primary_commodity", "Primary Commodity is required.");
    }
    if ((!form.project_objectives || form.project_objectives.length === 0) && !(form.project_objectives_other ?? "").trim()) {
      fieldErrors.set("project_objectives", "At least one Project Objective shall be specified.");
    }
    if ((!form.expected_outcomes || form.expected_outcomes.length === 0) && !(form.expected_outcomes_other ?? "").trim()) {
      fieldErrors.set("expected_outcomes", "At least one Expected Outcome shall be specified.");
    }
  }

  // Mutation
  const mutation = useMutation({
    mutationFn: (payload: Partial<DprProjectIdentification>) =>
      dprApi.saveIdentification(uuid, payload),
    onMutate: () => {
      markSaving("identification");
      setSaveError(null);
    },
    onSuccess: (data) => {
      markSaved("identification");
      markClean("identification");
      setForm(data);
      queryClient.setQueryData(["dpr-identification", uuid], data);
      // Two readiness query keys reference the same underlying data:
      //   • ["dpr-identification-readiness", uuid]     → this file's own inline FieldError map
      //   • ["dpr-readiness", uuid, "identification"] → the visible <ReadinessPanel> + sidebar dot
      // Both must be refetched after a save, otherwise the panel + sidebar
      // silently stay stale until React Query's natural expiry.
      queryClient.refetchQueries({ queryKey: ["dpr-identification-readiness", uuid] });
      queryClient.refetchQueries({ queryKey: ["dpr-readiness", uuid, "identification"] });
      setIsDirty(false);
      setLastSavedAt(new Date());
    },
    onError: (err) => {
      markSaved("identification");
      setSaveError(err instanceof Error ? err : new Error("Unknown error"));
      // Surface the backend's exact reason ("Project Title is required.", …)
      // instead of a generic "Failed to save". Axios interceptor rewrites
      // rejections to { message, status, data }; DRF field-error payloads
      // arrive under `data.errors` as { field: [msg1, msg2] }.
      const errObj = err as {
        message?: string | Record<string, unknown>;
        data?: { message?: string | Record<string, unknown>; errors?: unknown };
        response?: { data?: { message?: string | Record<string, unknown>; errors?: unknown } };
      };
      const source =
        errObj?.data?.errors ??
        errObj?.response?.data?.errors ??
        errObj?.data?.message ??
        errObj?.response?.data?.message ??
        errObj?.message;
      let msg = "Failed to save. Please try again.";
      if (source) {
        if (typeof source === "string") {
          msg = source;
        } else if (typeof source === "object") {
          const lines: string[] = [];
          for (const [field, value] of Object.entries(source as Record<string, unknown>)) {
            const text = Array.isArray(value) ? value.join(" · ") : String(value);
            lines.push(field === "non_field_errors" ? text : `${field}: ${text}`);
          }
          if (lines.length) msg = lines.join("\n");
        }
      }
      toast.error(msg);
    },
  });

  // Autosave timer
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function update<K extends keyof DprProjectIdentification>(k: K, v: DprProjectIdentification[K]) {
    setForm((prev) => (prev ? { ...prev, [k]: v } : prev));
    setIsDirty(true);
    markDirty("identification");
    if (timerRef.current) clearTimeout(timerRef.current);
    // The autosave callback calls `mutation.mutate()` directly — NOT wrapped
    // in another `setForm(cur => { … })` updater. React 19 warns loudly when
    // a state-updater function has side effects (mutation.mutate → onMutate
    // → markSaving on a Zustand store → setState on <SaveIndicator/> during
    // <IdentificationSection/>'s render commit). We already have `k` and
    // `v` in closure — no need to peek at current `form` to fire the patch.
    timerRef.current = setTimeout(() => {
      mutation.mutate({ [k]: v } as Partial<DprProjectIdentification>);
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  function save() {
    if (!form) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const payload: Partial<DprProjectIdentification> = {
      title: form.title,
      project_types: form.project_types,
      brief_description: form.brief_description,
      primary_commodity: form.primary_commodity,
      secondary_commodities: form.secondary_commodities,
      project_objectives: form.project_objectives,
      project_objectives_other: form.project_objectives_other,
      expected_outcomes: form.expected_outcomes,
      expected_outcomes_other: form.expected_outcomes_other,
      // Promoter Profile detail (KAU AI review 2026-09-19)
      ceo_name: form.ceo_name,
      ceo_qualification: form.ceo_qualification,
      ceo_experience_years: form.ceo_experience_years,
      total_area_acreage: form.total_area_acreage,
      women_shareholding_pct: form.women_shareholding_pct,
      landholding_summary: form.landholding_summary,
      board_meeting_frequency: form.board_meeting_frequency,
      psc_members: form.psc_members,
    };
    mutation.mutate(payload);
  }

  function discard() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (projectQ.data) {
      setForm(projectQ.data);
      setIsDirty(false);
      markClean("identification");
    }
  }

  const loading =
    projectQ.isLoading || projectTypesQ.isLoading || objectivesQ.isLoading ||
    outcomesQ.isLoading || commodityQ.isLoading || form === null;

  const descLen = (form?.brief_description ?? "").length;

  const toggleId = (arr: number[], id: number): number[] =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="identification"
      loading={loading}
      isDirty={isDirty}
      isSaving={mutation.isPending}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
      help={
        <SectionHelp
          title="Project Identification"
          purpose="This is the foundation of your DPR. It captures the high-level identity of the project — what it is, what it produces, and what you hope to achieve. Every downstream section, the financial calculation, and the AI-generated narrative all pull from what you fill in here, so it is worth being clear and specific."
          whatToFill={[
            "Project title — a short, descriptive name (e.g. 'Coconut Oil Extraction — 500 L/day'). Shows on the DPR cover page.",
            "Project type — tick one or more (New / Expansion / Diversification …). Multi-select supported.",
            "Brief description — 2–3 sentences (minimum 50 characters). Explain what you plan to do in plain language.",
            "Primary commodity — pick the ONE commodity you're producing most of. Drives AI knowledge-base retrieval + narrative context.",
            "Secondary commodities — optional; pick any additional ones you also produce.",
            "Project objectives — tick at least one, or type your own in 'Other'. This is your stated intent for the project.",
            "Expected outcomes — tick at least one, or type your own in 'Other'. What success looks like when the project is running.",
          ]}
          tips={[
            "Your commodity choice matters — the AI narrative and the Knowledge Base filter both use it to pick relevant Kerala PoP practices, market prices, and applicable schemes.",
            "Description too short? The 'X / 50 chars minimum' counter turns amber when you're under. The validator won't accept anything shorter than 50 chars.",
            "You can leave the 'Other' text blank for objectives / outcomes as long as you tick at least one from the pre-defined list.",
            "Auto-save fires ~5 seconds after your last keystroke. You'll see 'All changes saved' in the header. No need to click Save manually.",
            "Click any error in the readiness panel on the right — the page scrolls to the offending field.",
          ]}
          downstream={[
            "DPR PDF cover page — title + commodity + brief description",
            "AI Executive Summary chapter — uses the description, objectives and outcomes as prompt context",
            "Knowledge Base retrieval — every section queries the KB using this commodity to surface Kerala-specific practices, schemes and market data",
            "PDF header on every page — 'DPR for <title>'",
          ]}
        />
      }
    >
      {form && (
        <div className="space-y-4">
          {/* 1. Project title */}
          <Card><CardContent className="space-y-4 p-6">
            <h3 className="text-sm font-semibold">1. Proposed Project Title</h3>
            <div id="dpr-field-title" className="space-y-1.5">
              <Label className={`text-xs ${fieldErrors.has("title") ? "text-destructive" : ""}`}>
                Project title *
              </Label>
              <Input
                value={form.title}
                maxLength={TITLE_MAX_CHARS}
                onChange={(e) => update("title", e.target.value.slice(0, TITLE_MAX_CHARS))}
                placeholder="e.g. Kerala Spices Value Addition Cluster"
              />
              <div className="flex items-center justify-between">
                <FieldError name="title" errors={fieldErrors} warnings={fieldWarnings} />
                <span
                  className={`text-[10px] ${
                    (form.title?.length ?? 0) >= TITLE_MAX_CHARS
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {form.title?.length ?? 0}/{TITLE_MAX_CHARS}
                </span>
              </div>
            </div>
          </CardContent></Card>

          {/* 2. Project type */}
          <Card id="dpr-field-project_types"><CardContent className="space-y-4 p-6">
            <h3 className={`text-sm font-semibold ${fieldErrors.has("project_types") ? "text-destructive" : ""}`}>
              2. Project Type *
            </h3>
            <p className="text-xs text-muted-foreground">
              Select all that apply.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {(projectTypesQ.data ?? []).map((t) => (
                <label key={t.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.project_types.includes(t.id)}
                    onCheckedChange={() => update("project_types", toggleId(form.project_types, t.id))}
                  />
                  <span>{t.label}</span>
                </label>
              ))}
            </div>
            <FieldError name="project_types" errors={fieldErrors} warnings={fieldWarnings} />
          </CardContent></Card>

          {/* 3. Brief description */}
          <Card id="dpr-field-brief_description"><CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-semibold ${fieldErrors.has("brief_description") ? "text-destructive" : ""}`}>
                3. Brief Description *
              </h3>
              <span className={`text-xs ${descLen < 50 ? "text-amber-600" : "text-muted-foreground"}`}>
                {descLen} / 50 chars minimum
              </span>
            </div>
            <Textarea
              rows={4}
              value={form.brief_description}
              onChange={(e) => update("brief_description", e.target.value)}
              placeholder="Describe the proposed project in 2-3 sentences (minimum 50 characters)…"
            />
            <FieldError name="brief_description" errors={fieldErrors} warnings={fieldWarnings} />
          </CardContent></Card>

          {/* 4 + 5. Commodities */}
          <Card><CardContent className="space-y-4 p-6">
            <h3 className="text-sm font-semibold">4 & 5. Commodities</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div id="dpr-field-primary_commodity" className="space-y-1.5">
                <Label className={`text-xs ${fieldErrors.has("primary_commodity") ? "text-destructive" : ""}`}>
                  Primary commodity *
                </Label>
                {/* KAU spec §2.2 field 4: "Dropdown + Search" — 83 commodities is too
                    long to scroll. SearchableSelect gives a type-to-filter input. */}
                <SearchableSelect
                  value={form.primary_commodity !== null ? String(form.primary_commodity) : ""}
                  onChange={(v) => update("primary_commodity", v === "" ? null : Number(v))}
                  options={(commodityQ.data ?? []).map((c) => ({ value: String(c.id), label: c.label }))}
                  placeholder="Type to search commodity…"
                />
                {/* Original shadcn Select left commented for reference (no built-in search):
                <Select value={form.primary_commodity !== null ? String(form.primary_commodity) : ""} onValueChange={(v) => update("primary_commodity", v === "" ? null : Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Select commodity" /></SelectTrigger>
                  <SelectContent>{(commodityQ.data ?? []).map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.label}</SelectItem>))}</SelectContent>
                </Select> */}
                <FieldError name="primary_commodity" errors={fieldErrors} warnings={fieldWarnings} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Secondary commodities (optional)</Label>
                <div className="max-h-40 overflow-y-auto rounded-md border p-2 text-sm">
                  {(commodityQ.data ?? []).map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-2 py-1 text-xs">
                      <Checkbox
                        checked={form.secondary_commodities.includes(c.id)}
                        onCheckedChange={() => update("secondary_commodities", toggleId(form.secondary_commodities, c.id))}
                      />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </CardContent></Card>

          {/* 6. Objectives — "Other" text box only shows when the user
              ticks the master option with code === 'other'. */}
          {(() => {
            const otherObjectiveId = (objectivesQ.data ?? []).find(
              (o) => o.code === "other",
            )?.id;
            const otherObjectiveChecked =
              otherObjectiveId !== undefined &&
              form.project_objectives.includes(otherObjectiveId);
            return (
              <Card id="dpr-field-project_objectives"><CardContent className="space-y-4 p-6">
                <h3 className={`text-sm font-semibold ${fieldErrors.has("project_objectives") ? "text-destructive" : ""}`}>
                  6. Project Objective(s) *
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(objectivesQ.data ?? []).map((o) => (
                    <label key={o.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.project_objectives.includes(o.id)}
                        onCheckedChange={() => {
                          const next = toggleId(form.project_objectives, o.id);
                          update("project_objectives", next);
                          // Clear the "Other" text when unchecking the "Other" option
                          if (o.id === otherObjectiveId && !next.includes(o.id)) {
                            update("project_objectives_other", "");
                          }
                        }}
                      />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
                {otherObjectiveChecked && (
                  <div id="dpr-field-project_objectives_other" className="space-y-1.5 border-l-2 border-primary/30 pl-4">
                    <Label className={`text-xs ${fieldErrors.has("project_objectives_other") ? "text-destructive" : ""}`}>
                      Other objective — please specify *
                    </Label>
                    <Input
                      value={form.project_objectives_other}
                      onChange={(e) => update("project_objectives_other", e.target.value)}
                      placeholder="Describe the objective you selected 'Other' for"
                      autoFocus
                    />
                    <FieldError name="project_objectives_other" errors={fieldErrors} warnings={fieldWarnings} />
                  </div>
                )}
                <FieldError name="project_objectives" errors={fieldErrors} warnings={fieldWarnings} />
              </CardContent></Card>
            );
          })()}

          {/* 7. Outcomes — same "Other" pattern. */}
          {(() => {
            const otherOutcomeId = (outcomesQ.data ?? []).find(
              (o) => o.code === "other",
            )?.id;
            const otherOutcomeChecked =
              otherOutcomeId !== undefined &&
              form.expected_outcomes.includes(otherOutcomeId);
            return (
              <Card id="dpr-field-expected_outcomes"><CardContent className="space-y-4 p-6">
                <h3 className={`text-sm font-semibold ${fieldErrors.has("expected_outcomes") ? "text-destructive" : ""}`}>
                  7. Expected Outcome(s) *
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(outcomesQ.data ?? []).map((o) => (
                    <label key={o.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.expected_outcomes.includes(o.id)}
                        onCheckedChange={() => {
                          const next = toggleId(form.expected_outcomes, o.id);
                          update("expected_outcomes", next);
                          if (o.id === otherOutcomeId && !next.includes(o.id)) {
                            update("expected_outcomes_other", "");
                          }
                        }}
                      />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
                {otherOutcomeChecked && (
                  <div id="dpr-field-expected_outcomes_other" className="space-y-1.5 border-l-2 border-primary/30 pl-4">
                    <Label className={`text-xs ${fieldErrors.has("expected_outcomes_other") ? "text-destructive" : ""}`}>
                      Other outcome — please specify *
                    </Label>
                    <Input
                      value={form.expected_outcomes_other}
                      onChange={(e) => update("expected_outcomes_other", e.target.value)}
                      placeholder="Describe the outcome you selected 'Other' for"
                      autoFocus
                    />
                    <FieldError name="expected_outcomes_other" errors={fieldErrors} warnings={fieldWarnings} />
                  </div>
                )}
                <FieldError name="expected_outcomes" errors={fieldErrors} warnings={fieldWarnings} />
              </CardContent></Card>
            );
          })()}

          {/* 8. Promoter Profile detail (KAU AI review 2026-09-19)
              Backend renders every filled value into the AI narrative's FACTS
              block so the LLM stops emitting [Name of the CEO] / [PSC] etc.
              All optional — blank fields degrade to "Not available" in prose. */}
          <Card id="dpr-field-promoter_profile"><CardContent className="space-y-6 p-6">
            <div>
              <h3 className="text-sm font-semibold">8. Promoter Profile detail</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Optional but strongly recommended — anything you fill here shows up in the AI-generated
                Promoter Profile chapter with your actual values. Anything left blank shows as "Not
                available" in the narrative.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">CEO name</Label>
                <Input
                  value={form.ceo_name}
                  maxLength={200}
                  onChange={(e) => update("ceo_name", e.target.value)}
                  placeholder="Full name of the CEO / Chief Executive"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CEO qualification</Label>
                <Input
                  value={form.ceo_qualification}
                  maxLength={200}
                  onChange={(e) => update("ceo_qualification", e.target.value)}
                  placeholder="e.g. B.Sc Agri, MBA Agri-business"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CEO experience (years)</Label>
                <Input
                  type="number"
                  min={0}
                  max={80}
                  value={form.ceo_experience_years ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    update("ceo_experience_years", v === "" ? null : Number(v));
                  }}
                  placeholder="e.g. 12"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Board meeting frequency</Label>
                <Select
                  value={form.board_meeting_frequency || undefined}
                  onValueChange={(v) => update("board_meeting_frequency", v as BoardMeetingFrequency)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a frequency…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="half_yearly">Half-yearly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Total farming area covered (acres)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.total_area_acreage ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    update("total_area_acreage", v === "" ? null : v);
                  }}
                  placeholder="e.g. 487.50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Women shareholding (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={form.women_shareholding_pct ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    update("women_shareholding_pct", v === "" ? null : v);
                  }}
                  placeholder="e.g. 44.00"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Landholding pattern (free text)</Label>
              <Textarea
                rows={3}
                maxLength={1000}
                value={form.landholding_summary}
                onChange={(e) => update("landholding_summary", e.target.value)}
                placeholder="e.g. 70% smallholders under 2 acres, 25% medium 2–5 acres, 5% above 5 acres"
              />
            </div>

            {/* PSC (Project Steering Committee) — variable-length repeatable list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Project Steering Committee members</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Optional. Leave blank if a PSC has not been constituted yet.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next: PscMember[] = [
                      ...form.psc_members,
                      { name: "", role: "", affiliation: "" },
                    ];
                    update("psc_members", next);
                  }}
                >
                  + Add member
                </Button>
              </div>
              {form.psc_members.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  No PSC members added yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.psc_members.map((m, idx) => (
                    <div
                      key={`psc-${idx}`}
                      className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                    >
                      <Input
                        value={m.name}
                        placeholder="Name"
                        onChange={(e) => {
                          const next = [...form.psc_members];
                          next[idx] = { ...next[idx], name: e.target.value };
                          update("psc_members", next);
                        }}
                      />
                      <Input
                        value={m.role}
                        placeholder="Role (e.g. Chair, Member)"
                        onChange={(e) => {
                          const next = [...form.psc_members];
                          next[idx] = { ...next[idx], role: e.target.value };
                          update("psc_members", next);
                        }}
                      />
                      <Input
                        value={m.affiliation}
                        placeholder="Affiliation (e.g. KAU, NABARD)"
                        onChange={(e) => {
                          const next = [...form.psc_members];
                          next[idx] = { ...next[idx], affiliation: e.target.value };
                          update("psc_members", next);
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const next = form.psc_members.filter((_, i) => i !== idx);
                          update("psc_members", next);
                        }}
                        aria-label="Remove PSC member"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent></Card>
        </div>
      )}
    </SectionShell>
  );
}
