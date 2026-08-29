"use client";

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
import { dprMasterApi } from "@/lib/api/dpr-master";

import { FieldError } from "./field-error";
import { SectionShell } from "./section-shell";

const MONTHS = [
  ["jan", "Jan"], ["feb", "Feb"], ["mar", "Mar"], ["apr", "Apr"],
  ["may", "May"], ["jun", "Jun"], ["jul", "Jul"], ["aug", "Aug"],
  ["sep", "Sep"], ["oct", "Oct"], ["nov", "Nov"], ["dec", "Dec"],
] as const;

const PROCESS_TYPES = [
  { value: "batch", label: "Batch Process" },
  { value: "continuous", label: "Continuous Process" },
  { value: "seasonal", label: "Seasonal Process" },
  { value: "service_based", label: "Service-based Operation" },
];

const AUTOMATION_LEVELS = [
  { value: "manual", label: "Manual" },
  { value: "semi_auto", label: "Semi-Automatic" },
  { value: "auto", label: "Automatic" },
  { value: "fully_auto", label: "Fully Automatic" },
];

const LOSS_SOURCES = [
  { value: "raw_material", label: "Raw Material" },
  { value: "processing", label: "Processing" },
  { value: "storage", label: "Storage" },
  { value: "transportation", label: "Transportation" },
  { value: "packaging", label: "Packaging" },
  { value: "other", label: "Others (Specify)" },
];

const EXPANSION_NATURES = [
  { value: "capacity", label: "Capacity Expansion" },
  { value: "product", label: "Product Diversification" },
  { value: "infrastructure", label: "Infrastructure Expansion" },
  { value: "technology", label: "Technology Upgradation" },
  { value: "market", label: "Market Expansion" },
  { value: "other", label: "Others (Specify)" },
];

const Schema = z.object({
  installed_capacity: z.union([z.string(), z.number()]).nullable(),
  capacity_unit: z.number().nullable(),
  capacity_basis: z.number().nullable(),
  practical_operating_capacity: z.union([z.string(), z.number()]).nullable(),
  first_year_capacity_utilisation_pct: z.union([z.string(), z.number()]).nullable(),
  has_future_expansion: z.boolean(),

  working_days_per_year: z.union([z.string(), z.number()]).nullable(),
  shifts_per_day: z.union([z.string(), z.number()]).nullable(),
  operating_hours_per_shift: z.union([z.string(), z.number()]).nullable(),
  operating_months_per_year: z.union([z.string(), z.number()]).nullable(),
  peak_production_seasons: z.array(z.string()),
  lean_production_seasons: z.array(z.string()),

  process_description: z.string(),
  process_type: z.string(),
  automation_level: z.string(),
  major_activities: z.string(),
  technology_method: z.string(),

  has_production_loss: z.boolean(),
  production_loss_pct: z.union([z.string(), z.number()]).nullable(),
  product_recovery_pct: z.union([z.string(), z.number()]).nullable(),
  loss_sources: z.array(z.string()),
  loss_source_other: z.string(),

  expected_year_of_expansion: z.union([z.string(), z.number()]).nullable(),
  expansion_nature: z.string(),
  expansion_nature_other: z.string(),
  expansion_description: z.string(),
});
type Data = z.infer<typeof Schema>;

const DECIMAL_KEYS = [
  "installed_capacity",
  "practical_operating_capacity",
  "first_year_capacity_utilisation_pct",
  "operating_hours_per_shift",
  "production_loss_pct",
  "product_recovery_pct",
] as const;
const INT_KEYS = [
  "working_days_per_year",
  "shifts_per_day",
  "operating_months_per_year",
  "expected_year_of_expansion",
] as const;

function toDecimalString(v: string | number | null): string | null {
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
  const out: Record<string, unknown> = { ...v };
  for (const k of DECIMAL_KEYS) out[k] = toDecimalString(v[k]);
  for (const k of INT_KEYS) out[k] = toInt(v[k]);
  return out;
}

export function CapacitySection({ uuid }: { uuid: string }) {
  const unitQuery = useQuery({
    queryKey: ["dpr-master", "capacity-units"],
    queryFn: () => dprMasterApi.list("capacity-units"),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const basisQuery = useQuery({
    queryKey: ["dpr-master", "capacity-basis"],
    queryFn: () => dprMasterApi.list("capacity-basis"),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { form, isLoading, isDirty, isSaving, lastSavedAt, saveError, fieldErrors, fieldWarnings, save, discard } = useDprSectionForm<Data>({
    uuid,
    sectionKey: "capacity",
    schema: Schema,
    defaultValues: {
      installed_capacity: null,
      capacity_unit: null,
      capacity_basis: null,
      practical_operating_capacity: null,
      first_year_capacity_utilisation_pct: null,
      has_future_expansion: false,
      working_days_per_year: null,
      shifts_per_day: null,
      operating_hours_per_shift: null,
      operating_months_per_year: null,
      peak_production_seasons: [],
      lean_production_seasons: [],
      process_description: "",
      process_type: "",
      automation_level: "",
      major_activities: "",
      technology_method: "",
      has_production_loss: false,
      production_loss_pct: null,
      product_recovery_pct: null,
      loss_sources: [],
      loss_source_other: "",
      expected_year_of_expansion: null,
      expansion_nature: "",
      expansion_nature_other: "",
      expansion_description: "",
    },
    serializePayload,
  });

  // useWatch — reactive subscriptions that reliably re-render after form.reset()
  // from server data. See use-dpr-section-form.ts notes.
  const peakMonths = useWatch({ control: form.control, name: "peak_production_seasons" }) ?? [];
  const leanMonths = useWatch({ control: form.control, name: "lean_production_seasons" }) ?? [];
  const lossSources = useWatch({ control: form.control, name: "loss_sources" }) ?? [];
  const hasLoss = useWatch({ control: form.control, name: "has_production_loss" });
  const hasExpansion = useWatch({ control: form.control, name: "has_future_expansion" });
  const capacityUnit = useWatch({ control: form.control, name: "capacity_unit" });
  const capacityBasis = useWatch({ control: form.control, name: "capacity_basis" });
  const processType = useWatch({ control: form.control, name: "process_type" });
  const automationLevel = useWatch({ control: form.control, name: "automation_level" });
  const expansionNature = useWatch({ control: form.control, name: "expansion_nature" });
  const processDescription = useWatch({ control: form.control, name: "process_description" }) ?? "";

  function toggleMonth(field: "peak_production_seasons" | "lean_production_seasons", code: string, checked: boolean) {
    const cur = form.getValues(field) ?? [];
    form.setValue(field, checked ? [...cur, code] : cur.filter((c) => c !== code), { shouldDirty: true });
  }
  function toggleLossSource(code: string, checked: boolean) {
    const cur = form.getValues("loss_sources") ?? [];
    form.setValue("loss_sources", checked ? [...cur, code] : cur.filter((c) => c !== code), { shouldDirty: true });
  }

  const wordCount = processDescription.trim().split(/\s+/).filter(Boolean).length;
  const charCount = processDescription.length;

  const loading = isLoading || unitQuery.isLoading || basisQuery.isLoading;

  return (
    <SectionShell
      uuid={uuid}
      sectionKey="capacity"
      loading={loading}
      isDirty={isDirty}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      onSave={save}
      onDiscard={discard}
    >
      <div className="space-y-4">
        {/* A. Production Capacity */}
        <SubCard title="A. Production Capacity">
          <FieldRow>
            <F label="Installed capacity *" name="installed_capacity" errors={fieldErrors} warnings={fieldWarnings}>
              <Input type="number" step="0.001" {...form.register("installed_capacity")} />
            </F>
            <F label="Practical operating capacity" name="practical_operating_capacity" errors={fieldErrors} warnings={fieldWarnings}>
              <Input type="number" step="0.001" {...form.register("practical_operating_capacity")} />
            </F>
          </FieldRow>
          <FieldRow>
            <F label="Capacity unit *" name="capacity_unit" errors={fieldErrors} warnings={fieldWarnings}>
              <MasterSelect
                value={capacityUnit}
                options={unitQuery.data}
                onChange={(v) => form.setValue("capacity_unit", v, { shouldDirty: true })}
              />
            </F>
            <F label="Capacity basis *" name="capacity_basis" errors={fieldErrors} warnings={fieldWarnings}>
              <MasterSelect
                value={capacityBasis}
                options={basisQuery.data}
                onChange={(v) => form.setValue("capacity_basis", v, { shouldDirty: true })}
              />
            </F>
          </FieldRow>
          <F label="Expected first-year capacity utilisation (%)" name="first_year_capacity_utilisation_pct" errors={fieldErrors} warnings={fieldWarnings}>
            <Input type="number" step="0.01" min="0" max="100" {...form.register("first_year_capacity_utilisation_pct")} />
          </F>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={hasExpansion}
              onCheckedChange={(c) => form.setValue("has_future_expansion", !!c, { shouldDirty: true })}
            />
            <span>Future expansion planned</span>
          </label>
        </SubCard>

        {/* B. Operating Schedule */}
        <SubCard title="B. Operating Schedule">
          <FieldRow>
            <F label="Working days per year (1–365)" name="working_days_per_year" errors={fieldErrors} warnings={fieldWarnings}>
              <Input type="number" min="1" max="365" {...form.register("working_days_per_year")} />
            </F>
            <F label="Shifts per day (1–3)" name="shifts_per_day" errors={fieldErrors} warnings={fieldWarnings}>
              <Input type="number" min="1" max="3" {...form.register("shifts_per_day")} />
            </F>
          </FieldRow>
          <FieldRow>
            <F label="Operating hours per shift (0–24)" name="operating_hours_per_shift" errors={fieldErrors} warnings={fieldWarnings}>
              <Input type="number" step="0.01" min="0" max="24" {...form.register("operating_hours_per_shift")} />
            </F>
            <F label="Operating months per year (1–12)" name="operating_months_per_year" errors={fieldErrors} warnings={fieldWarnings}>
              <Input type="number" min="1" max="12" {...form.register("operating_months_per_year")} />
            </F>
          </FieldRow>

          <div>
            <Label className="mb-2 inline-block">Peak production seasons</Label>
            <MonthGrid selected={peakMonths} onToggle={(m, c) => toggleMonth("peak_production_seasons", m, c)} />
          </div>
          <div>
            <Label className="mb-2 inline-block">Lean production seasons</Label>
            <MonthGrid selected={leanMonths} onToggle={(m, c) => toggleMonth("lean_production_seasons", m, c)} />
          </div>
        </SubCard>

        {/* C. Production Process */}
        <SubCard title="C. Production Process">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className={fieldErrors.has("process_description") ? "text-destructive" : undefined}>
                Process description * (max 150 words)
              </Label>
              <span className={`text-xs ${wordCount > 150 ? "text-destructive" : wordCount > 120 ? "text-amber-600" : "text-muted-foreground"}`}>
                {wordCount}/150 words · {charCount} chars
              </span>
            </div>
            <Textarea rows={4} {...form.register("process_description")} />
            <FieldError name="process_description" errors={fieldErrors} warnings={fieldWarnings} />
          </div>
          <FieldRow>
            <F label="Process type *" name="process_type" errors={fieldErrors} warnings={fieldWarnings}>
              <ChoiceSelect
                value={processType}
                options={PROCESS_TYPES}
                onChange={(v) => form.setValue("process_type", v, { shouldDirty: true })}
              />
            </F>
            <F label="Automation level *" name="automation_level" errors={fieldErrors} warnings={fieldWarnings}>
              <ChoiceSelect
                value={automationLevel}
                options={AUTOMATION_LEVELS}
                onChange={(v) => form.setValue("automation_level", v, { shouldDirty: true })}
              />
            </F>
          </FieldRow>
          <F label="Major production / processing activities" name="major_activities" errors={fieldErrors} warnings={fieldWarnings}>
            <Textarea rows={2} placeholder="e.g. grading, cleaning, packaging" {...form.register("major_activities")} />
          </F>
          <F label="Technology / production method (optional)" name="technology_method" errors={fieldErrors} warnings={fieldWarnings}>
            <Input {...form.register("technology_method")} />
          </F>
        </SubCard>

        {/* D. Production Losses */}
        <SubCard title="D. Production Losses and Recovery">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={hasLoss}
              onCheckedChange={(c) => form.setValue("has_production_loss", !!c, { shouldDirty: true })}
            />
            <span>Significant production loss expected</span>
          </label>

          {hasLoss && (
            <div className="space-y-4 border-l-2 border-primary/30 pl-4">
              <FieldRow>
                <F label="Estimated overall production loss (%) *" name="production_loss_pct" errors={fieldErrors} warnings={fieldWarnings}>
                  <Input type="number" step="0.01" min="0" max="100" {...form.register("production_loss_pct")} />
                </F>
                <F label="Estimated product recovery (%)" name="product_recovery_pct" errors={fieldErrors} warnings={fieldWarnings}>
                  <Input type="number" step="0.01" min="0" max="100" {...form.register("product_recovery_pct")} />
                </F>
              </FieldRow>
              <div>
                <Label className="mb-2 inline-block">Major sources of loss</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {LOSS_SOURCES.map((o) => (
                    <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={lossSources.includes(o.value)}
                        onCheckedChange={(c) => toggleLossSource(o.value, !!c)}
                      />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {lossSources.includes("other") && (
                <F label="Please specify (Others)" name="loss_source_other" errors={fieldErrors} warnings={fieldWarnings}>
                  <Input {...form.register("loss_source_other")} />
                </F>
              )}
            </div>
          )}
        </SubCard>

        {/* E. Future Expansion */}
        {hasExpansion && (
          <SubCard title="E. Future Expansion">
            <FieldRow>
              <F label="Expected year of expansion *" name="expected_year_of_expansion" errors={fieldErrors} warnings={fieldWarnings}>
                {/* No min= attribute — some browsers submit "" for out-of-range
                    numbers, causing our toInt("") to store null. Backend
                    validator already enforces "> current year". */}
                <Input type="number" {...form.register("expected_year_of_expansion")} />
              </F>
              <F label="Nature of expansion" name="expansion_nature" errors={fieldErrors} warnings={fieldWarnings}>
                <ChoiceSelect
                  value={expansionNature}
                  options={EXPANSION_NATURES}
                  onChange={(v) => form.setValue("expansion_nature", v, { shouldDirty: true })}
                />
              </F>
            </FieldRow>
            {expansionNature === "other" && (
              <F label="Please specify (Others)" name="expansion_nature_other" errors={fieldErrors} warnings={fieldWarnings}>
                <Input {...form.register("expansion_nature_other")} />
              </F>
            )}
            <F label="Brief description" name="expansion_description" errors={fieldErrors} warnings={fieldWarnings}>
              <Textarea rows={2} {...form.register("expansion_description")} />
            </F>
          </SubCard>
        )}
      </div>
    </SectionShell>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function MonthGrid({ selected, onToggle }: { selected: string[]; onToggle: (code: string, checked: boolean) => void }) {
  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
      {MONTHS.map(([code, label]) => {
        const active = selected.includes(code);
        return (
          <button
            key={code}
            type="button"
            onClick={() => onToggle(code, !active)}
            className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function MasterSelect({
  value,
  options,
  onChange,
}: {
  value: number | null | undefined;
  options: { id: number; label: string }[] | undefined;
  onChange: (v: number | null) => void;
}) {
  return (
    <Select
      value={value !== null && value !== undefined ? String(value) : ""}
      onValueChange={(v) => onChange(v === "" ? null : Number(v))}
    >
      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
      <SelectContent>
        {(options ?? []).map((o) => (
          <SelectItem key={o.id} value={String(o.id)}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ChoiceSelect({
  value,
  options,
  onChange,
}: {
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value ?? ""} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SubCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <h3 className="text-sm font-semibold">{title}</h3>
        {children}
      </CardContent>
    </Card>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function F({
  label,
  name,
  errors,
  warnings,
  children,
}: {
  label: string;
  name?: string;
  errors?: Map<string, string>;
  warnings?: Map<string, string>;
  children: React.ReactNode;
}) {
  const hasErr = name && errors?.has(name);
  return (
    <div className="space-y-1.5">
      <Label className={hasErr ? "text-destructive" : undefined}>{label}</Label>
      {children}
      {name && errors && <FieldError name={name} errors={errors} warnings={warnings} />}
    </div>
  );
}
