"use client";

import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { useWatch } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { dprMasterApi, type DprMasterItem } from "@/lib/api/dpr-master";

import { SectionShell } from "./section-shell";

/**
 * §2.3.19 Compliance — unified through-table for all 6 spec categories.
 * UI: 6 grouped panels (business/project/environmental/food_quality/labour/insurance).
 * For each master registration in that category: user optionally picks a status +
 * fills issuing authority / date / remarks. Only rows with a non-empty status get sent.
 */

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

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, save, discard } = useDprSectionForm<Data>({
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
    >
      <div className="space-y-4">
        {Object.entries(CATEGORY_LABELS).map(([catKey, catLabel]) => (
          <Card key={catKey}>
            <CardContent className="space-y-3 p-6">
              <h3 className="text-sm font-semibold">{catLabel}</h3>
              <div className="space-y-2">
                {(grouped[catKey] ?? []).map((reg) => {
                  const { item } = findItem(reg.id);
                  const hasStatus = item?.status && item.status !== "";
                  return (
                    <div
                      key={reg.id}
                      className={`rounded-md border p-3 transition-colors ${
                        hasStatus ? "border-primary/30 bg-primary/[0.03]" : "border-transparent hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex-1 text-sm">{reg.label}</span>
                        <Select
                          value={item?.status ?? ""}
                          onValueChange={(v) => updateFieldFor(reg.id, "status", v as typeof StatusValues[number])}
                        >
                          <SelectTrigger className="h-8 w-48 text-xs">
                            <SelectValue placeholder="Not tracked" />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {hasStatus && (
                        <div className="mt-3 grid gap-2 pl-2 sm:grid-cols-2">
                          <Input
                            className="h-8 text-xs"
                            placeholder="Issuing authority"
                            value={item?.issuing_authority ?? ""}
                            onChange={(e) => updateFieldFor(reg.id, "issuing_authority", e.target.value)}
                          />
                          <Input
                            type="date"
                            className="h-8 text-xs"
                            value={item?.expected_date_of_approval ?? ""}
                            onChange={(e) => updateFieldFor(reg.id, "expected_date_of_approval", e.target.value || null)}
                          />
                          <Input
                            className="h-8 text-xs sm:col-span-2"
                            placeholder="Remarks"
                            value={item?.remarks ?? ""}
                            onChange={(e) => updateFieldFor(reg.id, "remarks", e.target.value)}
                          />
                        </div>
                      )}
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
                onCheckedChange={(c) => form.setValue("has_pending_legal_issues", !!c, { shouldDirty: true })}
              />
              <span>The FPO has pending legal issues</span>
            </label>
            {hasLegal && (
              <div className="space-y-3 border-l-2 border-primary/30 pl-4">
                <div className="space-y-1.5">
                  <Label>Nature of case *</Label>
                  <Textarea rows={2} {...form.register("nature_of_case")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Possible impact on project *</Label>
                  <Textarea rows={2} {...form.register("possible_impact")} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Present status</Label>
                    <Input {...form.register("present_status")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Expected resolution timeline</Label>
                    <Input {...form.register("expected_resolution_timeline")} />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SectionShell>
  );
}
