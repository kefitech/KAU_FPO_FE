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

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { dprApi, type DprProjectIdentification } from "@/lib/api/dpr";
import { dprMasterApi } from "@/lib/api/dpr-master";
import { useDprWizardStore } from "@/stores/dpr-store";

import { FieldError } from "./field-error";
import { SectionHelp } from "./section-help";
import { SectionShell } from "./section-shell";

const AUTOSAVE_DEBOUNCE_MS = 5000;

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
      toast.error("Failed to save. Please try again.");
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
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. Kerala Spices Value Addition Cluster"
              />
              <FieldError name="title" errors={fieldErrors} warnings={fieldWarnings} />
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
                        onCheckedChange={() => update("project_objectives", toggleId(form.project_objectives, o.id))}
                      />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
                {otherObjectiveChecked && (
                  <div className="space-y-1.5 border-l-2 border-primary/30 pl-4">
                    <Label className="text-xs">Other objective — please specify *</Label>
                    <Input
                      value={form.project_objectives_other}
                      onChange={(e) => update("project_objectives_other", e.target.value)}
                      placeholder="Describe the objective you selected 'Other' for"
                      autoFocus
                    />
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
                        onCheckedChange={() => update("expected_outcomes", toggleId(form.expected_outcomes, o.id))}
                      />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
                {otherOutcomeChecked && (
                  <div className="space-y-1.5 border-l-2 border-primary/30 pl-4">
                    <Label className="text-xs">Other outcome — please specify *</Label>
                    <Input
                      value={form.expected_outcomes_other}
                      onChange={(e) => update("expected_outcomes_other", e.target.value)}
                      placeholder="Describe the outcome you selected 'Other' for"
                      autoFocus
                    />
                  </div>
                )}
                <FieldError name="expected_outcomes" errors={fieldErrors} warnings={fieldWarnings} />
              </CardContent></Card>
            );
          })()}
        </div>
      )}
    </SectionShell>
  );
}
