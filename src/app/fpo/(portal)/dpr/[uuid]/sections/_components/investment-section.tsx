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

import { SectionShell } from "./section-shell";

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
    >
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-2">
            <Label htmlFor="estimated_project_cost">
              Estimated Total Project Cost (₹)
            </Label>
            <Input
              id="estimated_project_cost"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 5000000"
              {...form.register("estimated_project_cost")}
            />
            <p className="text-xs text-muted-foreground">
              Optional. If provided, the system compares against the auto-computed cost during DPR generation.
            </p>
          </div>

          <div className="space-y-2">
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
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              placeholder="Optional notes about this estimate…"
              rows={3}
              {...form.register("remarks")}
            />
          </div>
        </CardContent>
      </Card>
    </SectionShell>
  );
}
