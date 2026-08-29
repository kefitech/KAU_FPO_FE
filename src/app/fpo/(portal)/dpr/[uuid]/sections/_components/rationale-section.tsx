"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDprSectionForm } from "@/hooks/use-dpr-section-form";
import { dprMasterApi } from "@/lib/api/dpr-master";

import { SectionShell } from "./section-shell";

/**
 * §2.3.7 Rationale
 *
 * Backend shape:
 *   { rationale_other, selections: [{ rationale: id, justification: text }] }
 *
 * Form shape (easier for UI — one row per master rationale):
 *   { rationale_other, selectedIds: number[], justifications: Record<id, text> }
 *
 * `mapServerToForm` + `serializePayload` translate between the two.
 * Justifications are preserved for unchecked rows so the user can uncheck→recheck
 * without losing typed text (stripped by serializePayload before PATCH).
 */

const MAX_WORDS = 100;

const Schema = z.object({
  rationale_other: z.string(),
  selectedIds: z.array(z.number()),
  justifications: z.record(z.string(), z.string()),
});
type Data = z.infer<typeof Schema>;

interface ServerSelection {
  rationale: number;
  justification: string;
}
interface ServerData {
  rationale_other?: string;
  selections?: ServerSelection[];
}

function mapServerToForm(server: unknown): Data {
  const s = (server ?? {}) as ServerData;
  const selections = s.selections ?? [];
  return {
    rationale_other: s.rationale_other ?? "",
    selectedIds: selections.map((sel) => sel.rationale),
    justifications: Object.fromEntries(
      selections.map((sel) => [String(sel.rationale), sel.justification ?? ""]),
    ),
  };
}

function serializePayload(v: Data): Record<string, unknown> {
  return {
    rationale_other: v.rationale_other,
    selections: v.selectedIds.map((id) => ({
      rationale: id,
      justification: v.justifications[String(id)] ?? "",
    })),
  };
}

function wordCount(text: string): number {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

export function RationaleSection({ uuid }: { uuid: string }) {
  const masterQuery = useQuery({
    queryKey: ["dpr-master", "project-rationales"],
    queryFn: () => dprMasterApi.list("project-rationales"),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, save, discard } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "rationale",
    schema: Schema,
    defaultValues: {
      rationale_other: "",
      selectedIds: [],
      justifications: {},
    },
    mapServerToForm,
    serializePayload,
  });

  const selectedIds = form.watch("selectedIds") ?? [];
  const justifications = form.watch("justifications") ?? {};

  function toggle(id: number, checked: boolean) {
    const current = form.getValues("selectedIds") ?? [];
    const next = checked ? [...current, id] : current.filter((i) => i !== id);
    form.setValue("selectedIds", next, { shouldDirty: true });
  }

  function updateJustification(id: number, text: string) {
    const current = form.getValues("justifications") ?? {};
    form.setValue(
      "justifications",
      { ...current, [String(id)]: text },
      { shouldDirty: true },
    );
  }

  const otherId = masterQuery.data?.find((r) => r.code === "other")?.id;
  const showOther = otherId !== undefined && selectedIds.includes(otherId);

  const loading = isLoading || masterQuery.isLoading;

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="rationale"
      loading={loading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
    >
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="text-sm text-muted-foreground">
            Select all applicable reasons. For each, provide a brief justification (max {MAX_WORDS} words).
          </div>

          <div className="space-y-3">
            {(masterQuery.data ?? []).map((item) => {
              const isChecked = selectedIds.includes(item.id);
              const justText = justifications[String(item.id)] ?? "";
              const wc = wordCount(justText);
              const wcClass =
                wc > MAX_WORDS
                  ? "text-destructive"
                  : wc > MAX_WORDS * 0.8
                    ? "text-amber-600"
                    : "text-muted-foreground";
              return (
                <div
                  key={item.id}
                  className={`rounded-md border ${isChecked ? "border-primary/30 bg-primary/[0.03]" : "border-transparent"} p-3 transition-colors`}
                >
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <Checkbox
                      className="mt-0.5"
                      checked={isChecked}
                      onCheckedChange={(c) => toggle(item.id, !!c)}
                    />
                    <span className="flex-1">{item.label}</span>
                  </label>
                  {isChecked && (
                    <div className="mt-2 space-y-1 pl-6">
                      <Textarea
                        rows={2}
                        placeholder="Brief justification…"
                        value={justText}
                        onChange={(e) => updateJustification(item.id, e.target.value)}
                        className="text-sm"
                      />
                      <div className={`text-xs ${wcClass}`}>
                        {wc}/{MAX_WORDS} words
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {showOther && (
            <div className="space-y-1.5 pt-2">
              <Label htmlFor="rationale_other">Please specify (Others)</Label>
              <Input
                id="rationale_other"
                placeholder="Describe the other rationale…"
                {...form.register("rationale_other")}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </SectionShell>
  );
}
