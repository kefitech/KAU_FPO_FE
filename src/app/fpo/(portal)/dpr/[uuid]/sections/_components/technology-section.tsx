"use client";

import { useQuery } from "@tanstack/react-query";
import { useWatch } from "react-hook-form";
import { z } from "zod";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDprSectionForm } from "@/hooks/use-dpr-section-form";
import { dprMasterApi } from "@/lib/api/dpr-master";

import {
  ChoiceSelect,
  ModalField,
  ModalRow,
  NestedListCard,
} from "./nested-list";
import { SectionShell } from "./section-shell";

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

function serializePayload(v: Data): Record<string, unknown> {
  return {
    technologies: v.technologies.map((t, i) => ({
      ...t,
      order: i,
      year_introduced: toInt(t.year_introduced),
      upgradation_year: toInt(t.upgradation_year),
      upgradation_cost: toDec(t.upgradation_cost),
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

  const EMPTY_TECH: Tech = {
    order: 0, name: "", nature: "", description: "", source: "",
    technology_provider: "", country_of_origin: "", year_introduced: null,
    technology_status: "", technology_status_other: "",
    reasons: [], reasons_other: "", selection_justification: "",
    process_description: "", process_type: "", automation_level: "",
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
    >
      <div className="space-y-4">
        <NestedListCard<Tech>
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
          isValid={(row) => row.name.trim().length > 0 && !!row.source}
          addLabel="Add technology"
          editLabel="Edit technology"
          emptyHint="No technologies yet. Click Add to describe a technology (grading, processing, storage, cold chain, etc.)."
          error={fieldErrors.get("technologies")}
          warning={fieldWarnings.get("technologies")}
          renderModal={(row, set) => (
            <>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">A. Technology Details</p>
                <ModalField label="Technology name *"><Input value={row.name} onChange={(e) => set("name", e.target.value)} /></ModalField>
                <ModalRow>
                  <ModalField label="Nature of technology"><Input value={row.nature} onChange={(e) => set("nature", e.target.value)} /></ModalField>
                  <ModalField label="Source of technology *"><Input value={row.source} onChange={(e) => set("source", e.target.value)} /></ModalField>
                </ModalRow>
                <ModalField label="Description (max 150 words)"><Textarea rows={3} value={row.description} onChange={(e) => set("description", e.target.value)} /></ModalField>
                <ModalRow>
                  <ModalField label="Technology provider"><Input value={row.technology_provider} onChange={(e) => set("technology_provider", e.target.value)} /></ModalField>
                  <ModalField label="Country of origin"><Input value={row.country_of_origin} onChange={(e) => set("country_of_origin", e.target.value)} /></ModalField>
                </ModalRow>
                <ModalRow>
                  <ModalField label="Year introduced"><Input type="number" value={row.year_introduced ?? ""} onChange={(e) => set("year_introduced", e.target.value || null)} /></ModalField>
                  <ModalField label="Technology status"><ChoiceSelect value={row.technology_status} options={TECH_STATUS} onChange={(v) => set("technology_status", v)} /></ModalField>
                </ModalRow>
              </div>

              <div className="mt-4 space-y-3 border-t pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">B. Reasons for selection</p>
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
                <ModalField label="Brief justification (max 100 words)"><Textarea rows={2} value={row.selection_justification} onChange={(e) => set("selection_justification", e.target.value)} /></ModalField>
              </div>

              <div className="mt-4 space-y-3 border-t pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">C. Production process</p>
                <ModalField label="Process description"><Textarea rows={2} value={row.process_description} onChange={(e) => set("process_description", e.target.value)} /></ModalField>
                <ModalRow>
                  <ModalField label="Process type *"><ChoiceSelect value={row.process_type} options={PROCESS_TYPES} onChange={(v) => set("process_type", v)} /></ModalField>
                  <ModalField label="Automation level *"><ChoiceSelect value={row.automation_level} options={AUTOMATION} onChange={(v) => set("automation_level", v)} /></ModalField>
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
                    <ModalField label="Product quality standard"><Input value={row.product_quality_standard} onChange={(e) => set("product_quality_standard", e.target.value)} /></ModalField>
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
                <div className="flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={row.requires_skilled_operators === true} onCheckedChange={(c) => set("requires_skilled_operators", !!c)} />
                    Skilled operators required
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={row.requires_training === true} onCheckedChange={(c) => set("requires_training", !!c)} />
                    Training required
                  </label>
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
                      <ModalField label="Expected upgradation year"><Input type="number" value={row.upgradation_year ?? ""} onChange={(e) => set("upgradation_year", e.target.value || null)} /></ModalField>
                      <ModalField label="Estimated cost (₹)"><Input type="number" step="0.01" value={row.upgradation_cost ?? ""} onChange={(e) => set("upgradation_cost", e.target.value || null)} /></ModalField>
                    </ModalRow>
                    <ModalField label="Brief description"><Textarea rows={2} value={row.upgradation_description} onChange={(e) => set("upgradation_description", e.target.value)} /></ModalField>
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
                {row.risks.map((r, i) => (
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
                    <ChoiceSelect
                      value={r.risk_type}
                      options={TECH_RISKS}
                      onChange={(v) => {
                        const next = [...row.risks];
                        next[i] = { ...next[i], risk_type: v };
                        set("risks", next as Risk[]);
                      }}
                    />
                    <Textarea
                      rows={2}
                      placeholder="Mitigation measure *"
                      value={r.mitigation_measure}
                      onChange={(e) => {
                        const next = [...row.risks];
                        next[i] = { ...next[i], mitigation_measure: e.target.value };
                        set("risks", next as Risk[]);
                      }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        />
      </div>
    </SectionShell>
  );
}
