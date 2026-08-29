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

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, save, discard } = useDprSectionForm<ComponentsData>({
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
    >
      <Card>
        <CardContent className="space-y-6 p-6">
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
