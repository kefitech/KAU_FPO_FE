"use client";

import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { useWatch } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDprSectionForm } from "@/hooks/use-dpr-section-form";
import { dprMasterApi, type DprMasterItem } from "@/lib/api/dpr-master";

import { SectionHelp } from "./section-help";
import { SectionShell } from "./section-shell";

const ComponentsSchema = z.object({
  components: z.array(z.number()),
  other_primary_production: z.string(),
  other_processing: z.string(),
  other_storage: z.string(),
  other_marketing: z.string(),
  other_service: z.string(),
  other_supporting: z.string(),
});
type ComponentsData = z.infer<typeof ComponentsSchema>;

const GROUP_LABELS: Record<string, string> = {
  primary_production: "Primary Production",
  processing_value_addition: "Processing & Value Addition",
  storage_post_harvest: "Storage & Post-Harvest",
  marketing_business_dev: "Marketing & Business Development",
  service_enterprises: "Service-Based Enterprises",
  supporting_infrastructure: "Supporting Infrastructure",
};

// Maps DPRComponent.group -> DPRSectionComponents CharField for "Others (Specify)"
const GROUP_TO_OTHER_FIELD: Record<
  string,
  Extract<
    keyof ComponentsData,
    | "other_primary_production"
    | "other_processing"
    | "other_storage"
    | "other_marketing"
    | "other_service"
    | "other_supporting"
  >
> = {
  primary_production: "other_primary_production",
  processing_value_addition: "other_processing",
  storage_post_harvest: "other_storage",
  marketing_business_dev: "other_marketing",
  service_enterprises: "other_service",
  supporting_infrastructure: "other_supporting",
};

export function ComponentsSection({ uuid }: { uuid: string }) {
  const masterQuery = useQuery({
    queryKey: ["dpr-master", "components"],
    queryFn: () => dprMasterApi.list("components"),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, fieldErrors, fieldWarnings, save, discard } = useDprSectionForm<ComponentsData>({
    uuid,
    sectionKey: "components",
    schema: ComponentsSchema,
    defaultValues: {
      components: [],
      other_primary_production: "",
      other_processing: "",
      other_storage: "",
      other_marketing: "",
      other_service: "",
      other_supporting: "",
    },
  });

  const groupedComponents = useMemo(() => {
    if (!masterQuery.data) return {} as Record<string, DprMasterItem[]>;
    const groups: Record<string, DprMasterItem[]> = {};
    for (const c of masterQuery.data) {
      const group = (c.group as string) || "other";
      (groups[group] ??= []).push(c);
    }
    return groups;
  }, [masterQuery.data]);

  // Use `useWatch` (not `form.watch`) — reliable subscription so checkboxes
  // reflect server-loaded selections on page reload.
  const selectedIds =
    useWatch({ control: form.control, name: "components" }) ?? [];

  function toggleComponent(id: number, checked: boolean) {
    const current = form.getValues("components") ?? [];
    const next = checked ? [...current, id] : current.filter((i) => i !== id);
    form.setValue("components", next, { shouldDirty: true });
  }

  function hasOtherSelected(group: string): boolean {
    const otherId = groupedComponents[group]?.find((c) =>
      (c.code as string).endsWith("_other"),
    )?.id;
    return otherId !== undefined && selectedIds.includes(otherId);
  }

  const loading = isLoading || masterQuery.isLoading;

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="components"
      loading={loading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
      help={
        <SectionHelp
          title="Project Components"
          purpose="Tick every business activity your project will undertake. A single FPO can run one or more activities under the same project — for example, a coconut oil unit may combine processing, storage and marketing. Your selection here is the primary driver of the whole DPR: sections and fields in the rest of the wizard are shown or hidden automatically based on which components apply. Pick carefully."
          whatToFill={[
            "Browse the 6 KAU groups (Primary Production / Processing & Value Addition / Storage & Post-Harvest / Marketing & Business Development / Service-Based Enterprises / Supporting Infrastructure).",
            "Tick every component that describes an activity your project will perform. At least one is required.",
            "For a single-activity project, one tick is enough. For an integrated project (typical for FPOs), tick as many as apply — no limit.",
            "If your activity isn't listed under a group, tick 'Others (Specify)' at the bottom of that group.",
            "When you tick 'Others (Specify)', a text field appears — describe the activity clearly (e.g. 'Aquaponics unit for tilapia'). This is required whenever Others is ticked.",
          ]}
          tips={[
            "Your component choice drives the rest of the wizard. If you later add or remove a component, the sidebar refreshes — sections may appear or disappear based on what's relevant to the new mix.",
            "Cold Storage projects don't process raw material, so the Raw Material section is hidden for cold-storage-only projects.",
            "Custom Hiring Centres rent out equipment, so Raw Material is hidden for them too.",
            "If you're not sure which group an activity belongs to, hover over the checkboxes — the closest category is usually the right one.",
            "The 'Others' text stays in the database even if you un-tick the checkbox — so re-ticking it later restores what you typed.",
          ]}
          downstream={[
            "Wizard sidebar — irrelevant sections are hidden based on your component mix",
            "Land & Site section — each land parcel can be mapped to specific components",
            "Financial calculations — component-specific cost defaults inform the capex baseline",
            "AI-generated narrative — component list appears in the Executive Summary and Project Background chapters",
            "PDF cover page — lists project components underneath the title",
          ]}
        />
      }
    >
      {/* id="dpr-field-components" is the scroll target used by the readiness
          panel — clicking the "At least one project component shall be
          selected" error deep-links here. Kept on the outer Card so the
          scroll lands above the section-level banner + heading. */}
      <Card id="dpr-field-components">
        <CardContent className="space-y-6 p-6">
          {/* Section-level readiness for the `components` M2M — surfaced once at
              the top since checkboxes are split across 5 group cards below. */}
          {fieldErrors.has("components") && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {fieldErrors.get("components")}
            </div>
          )}
          {!fieldErrors.has("components") && fieldWarnings.has("components") && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-500">
              {fieldWarnings.get("components")}
            </div>
          )}

          {Object.entries(groupedComponents).map(([group, items]) => {
            const otherField = GROUP_TO_OTHER_FIELD[group];
            return (
              <div key={group}>
                <h3 className="mb-3 text-sm font-semibold">
                  {GROUP_LABELS[group] ?? group}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {items.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={selectedIds.includes(item.id)}
                        onCheckedChange={(c) => toggleComponent(item.id, !!c)}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
                {hasOtherSelected(group) && otherField && (
                  <div className="mt-3 space-y-1.5">
                    <Label htmlFor={otherField}>Please specify (Others)</Label>
                    <Input
                      id={otherField}
                      placeholder="Describe the other component…"
                      {...form.register(otherField)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </SectionShell>
  );
}
