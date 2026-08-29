"use client";

import { useQuery } from "@tanstack/react-query";
import { useWatch } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDprSectionForm } from "@/hooks/use-dpr-section-form";
import { dprMasterApi } from "@/lib/api/dpr-master";

import { SectionShell } from "./section-shell";

const Schema = z.object({
  natures: z.array(z.number()),
  nature_other: z.string(),
});
type Data = z.infer<typeof Schema>;

export function NatureOfBusinessSection({ uuid }: { uuid: string }) {
  const masterQuery = useQuery({
    queryKey: ["dpr-master", "nature-of-business"],
    queryFn: () => dprMasterApi.list("nature-of-business"),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, save, discard } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "nature-of-business",
    schema: Schema,
    defaultValues: {
      natures: [],
      nature_other: "",
    },
  });

  // Use `useWatch` (not `form.watch`) — more reliable subscription for arrays
  // that are set via `form.reset()`. Ensures checkboxes re-render when server
  // data hydrates the form on initial load.
  const selectedIds =
    useWatch({ control: form.control, name: "natures" }) ?? [];

  function toggle(id: number, checked: boolean) {
    const current = form.getValues("natures") ?? [];
    const next = checked ? [...current, id] : current.filter((i) => i !== id);
    form.setValue("natures", next, { shouldDirty: true });
  }

  const otherId = masterQuery.data?.find((r) => r.code === "other")?.id;
  const showOther = otherId !== undefined && selectedIds.includes(otherId);

  const loading = isLoading || masterQuery.isLoading;

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="nature-of-business"
      loading={loading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
    >
      <Card>
        <CardContent className="space-y-5 p-6">
          <div>
            <div className="mb-3 text-sm font-semibold">
              Select all business models that apply to this project
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {(masterQuery.data ?? []).map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={selectedIds.includes(item.id)}
                    onCheckedChange={(c) => toggle(item.id, !!c)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {showOther && (
            <div className="space-y-1.5">
              <Label htmlFor="nature_other">Please specify (Others)</Label>
              <Input
                id="nature_other"
                placeholder="Describe the other business model…"
                {...form.register("nature_other")}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </SectionShell>
  );
}
