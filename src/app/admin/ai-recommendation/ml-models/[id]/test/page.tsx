"use client";

import { useState } from "react";

import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, FlaskConical, Loader2, ThumbsUp, TrendingUp } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  adminMlModelsApi,
  type ModelTestLocation,
  type ModelTestLocationQuery,
  type ModelTestResult,
} from "@/app/admin/_api/ml-models";
import { CropPopSheet } from "@/components/shared/crop-pop-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Leaflet needs the browser, so the map panel is client-only.
const TestLocationPanel = dynamic(
  () => import("./_components/test-location-panel").then((m) => ({ default: m.TestLocationPanel })),
  {
    ssr: false,
    loading: () => <div className="h-[460px] animate-pulse rounded-md bg-muted motion-reduce:animate-none" />,
  },
);

// Radix Select can't use "" as an item value, so "not specified" gets a sentinel.
const NONE = "__none__";
const PAGE_SIZE = 10;

const optionalNumber = (min: number, max: number, message: string) =>
  z.string().refine((v) => v.trim() === "" || (Number(v) >= min && Number(v) <= max), { message });

const schema = z.object({
  agro_zone: z.string().min(1, { message: "Zone is required" }),
  season: z.string().min(1, { message: "Season is required" }),
  soil_type: z.string(),
  soil_ph: optionalNumber(3, 10, "Soil pH must be between 3 and 10"),
  commodities: z.string(),
  tier: z.string(),
  temperature: optionalNumber(-10, 50, "Temperature must be between -10 and 50 °C"),
  humidity: optionalNumber(0, 100, "Humidity must be between 0 and 100%"),
});

type FormValues = z.infer<typeof schema>;

const toNumberOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

// "high_ranges" -> "High ranges"
const humanize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1).replaceAll("_", " ");

export default function ModelTestPage() {
  const router = useRouter();
  const params = useParams();
  const modelId = Number(params.id);
  const [result, setResult] = useState<ModelTestResult | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [location, setLocation] = useState<ModelTestLocation | null>(null);
  const [popCrop, setPopCrop] = useState<string | null>(null);

  const { data: models } = useQuery({
    queryKey: ["ml-models-all"],
    queryFn: () => adminMlModelsApi.getAll({ page: 1, page_size: 100 }),
  });
  const model = models?.data.find((m) => m.id === modelId);

  const {
    data: options,
    isLoading: optionsLoading,
    isError: optionsError,
    refetch: refetchOptions,
  } = useQuery({
    queryKey: ["ml-model-test-options"],
    queryFn: adminMlModelsApi.getTestOptions,
    retry: false,
  });

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      agro_zone: "",
      season: "",
      soil_type: NONE,
      soil_ph: "",
      commodities: "",
      tier: NONE,
      temperature: "",
      humidity: "",
    },
  });

  // A map pick fills the form the way the FPO flow would derive the inputs,
  // plus today's temperature/humidity. Everything stays editable afterwards.
  const locationMutation = useMutation({
    mutationFn: (query: ModelTestLocationQuery) => adminMlModelsApi.lookupTestLocation(query),
    onSuccess: (loc) => {
      setLocation(loc);
      if (loc.zone) setValue("agro_zone", loc.zone.code, { shouldValidate: true });
      setValue("soil_type", loc.soil_category ?? NONE);
      setValue("season", loc.season, { shouldValidate: true });
      setValue("temperature", String(loc.weather.temperature_c));
      setValue("humidity", String(loc.weather.humidity_percent));
    },
    onError: (error: unknown) => {
      const msg = (error as { message?: string })?.message;
      toast.error(msg ?? "Couldn't look up that location", { duration: 12_000 });
    },
  });

  const testMutation = useMutation({
    mutationFn: (values: FormValues) =>
      adminMlModelsApi.test(modelId, {
        agro_zone: values.agro_zone,
        season: values.season,
        soil_type: values.soil_type === NONE ? "" : values.soil_type,
        soil_ph: toNumberOrNull(values.soil_ph),
        commodities: values.commodities
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        tier: values.tier === NONE ? null : values.tier,
        temperature_override: toNumberOrNull(values.temperature),
        humidity_override: toNumberOrNull(values.humidity),
      }),
    onSuccess: (data) => {
      setResult(data);
      setVisibleCount(PAGE_SIZE);
    },
    onError: (error: unknown) => {
      const msg = (error as { message?: string })?.message;
      toast.error(msg ?? "Test prediction failed", { duration: 12_000 });
    },
  });

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/ai-recommendation/ml-models")}
          className="mb-2 -ml-2"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to model versions
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-bold text-2xl">Test model{model ? `: ${model.version_code}` : ""}</h1>
          {model?.is_active && <Badge>Active</Badge>}
        </div>
        <p className="mt-0.5 text-muted-foreground text-sm">
          Run a crop prediction with this version for a place on the map or inputs you choose. The model FPOs are served
          from is not changed, and nothing is saved.
          {model &&
            !model.is_active &&
            " This version isn't active, so its model file is loaded for each test (a few seconds)."}
        </p>
      </div>

      {optionsError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 text-sm dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="font-medium">AI service is unreachable.</span> Models can't be tested until it's back up.{" "}
            <button type="button" className="underline underline-offset-2" onClick={() => refetchOptions()}>
              Retry
            </button>
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Location</CardTitle>
        </CardHeader>
        <CardContent>
          <TestLocationPanel
            location={location}
            loading={locationMutation.isPending}
            onLookup={(q) => locationMutation.mutate(q)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inputs</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => testMutation.mutate(v))} className="flex flex-col gap-5">
            <FieldGroup className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="agro_zone">
                  Zone <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="agro_zone"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={!options}>
                      <SelectTrigger id="agro_zone" className="w-full">
                        <SelectValue placeholder={optionsLoading ? "Loading…" : "Select a zone"} />
                      </SelectTrigger>
                      <SelectContent>
                        {options?.zones.map((z) => (
                          <SelectItem key={z} value={z}>
                            {humanize(z)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.agro_zone && <FieldError errors={[errors.agro_zone]} />}
              </Field>

              <Field>
                <FieldLabel htmlFor="season">
                  Season <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="season"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={!options}>
                      <SelectTrigger id="season" className="w-full">
                        <SelectValue placeholder={optionsLoading ? "Loading…" : "Select a season"} />
                      </SelectTrigger>
                      <SelectContent>
                        {options?.seasons.map((s) => (
                          <SelectItem key={s} value={s}>
                            {humanize(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.season && <FieldError errors={[errors.season]} />}
              </Field>

              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="soil_type">Soil type</FieldLabel>
                <Controller
                  control={control}
                  name="soil_type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={!options}>
                      <SelectTrigger id="soil_type" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Not specified (average the zone's soil mix)</SelectItem>
                        {options?.soil_types.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.value} — pH {s.ph_lo}–{s.ph_hi}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="temperature">Temperature (°C)</FieldLabel>
                <Controller
                  control={control}
                  name="temperature"
                  render={({ field }) => (
                    <Input id="temperature" type="number" step="0.1" placeholder="Zone's seasonal average" {...field} />
                  )}
                />
                <FieldDescription>Empty uses the zone's seasonal average.</FieldDescription>
                {errors.temperature && <FieldError errors={[errors.temperature]} />}
              </Field>

              <Field>
                <FieldLabel htmlFor="humidity">Humidity (%)</FieldLabel>
                <Controller
                  control={control}
                  name="humidity"
                  render={({ field }) => (
                    <Input id="humidity" type="number" step="1" placeholder="Zone's seasonal average" {...field} />
                  )}
                />
                <FieldDescription>Empty uses the zone's seasonal average.</FieldDescription>
                {errors.humidity && <FieldError errors={[errors.humidity]} />}
              </Field>

              <Field>
                <FieldLabel htmlFor="soil_ph">Soil pH</FieldLabel>
                <Controller
                  control={control}
                  name="soil_ph"
                  render={({ field }) => (
                    <Input
                      id="soil_ph"
                      type="number"
                      step="0.1"
                      min={3}
                      max={10}
                      placeholder="Soil type's typical pH"
                      {...field}
                    />
                  )}
                />
                {errors.soil_ph && <FieldError errors={[errors.soil_ph]} />}
              </Field>

              <Field>
                <FieldLabel htmlFor="tier">FPO tier</FieldLabel>
                <Controller
                  control={control}
                  name="tier"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={!options}>
                      <SelectTrigger id="tier" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>None</SelectItem>
                        {options?.tiers.map((tier) => (
                          <SelectItem key={tier} value={tier}>
                            Tier {tier}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="commodities">Commodities the FPO already handles</FieldLabel>
                <Controller
                  control={control}
                  name="commodities"
                  render={({ field }) => (
                    <Input id="commodities" placeholder="Comma-separated, e.g. Rice, Coconut, Pepper" {...field} />
                  )}
                />
              </Field>
            </FieldGroup>

            <div>
              <Button type="submit" disabled={!options || testMutation.isPending}>
                {testMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <FlaskConical className="mr-1.5 h-4 w-4" />
                )}
                {testMutation.isPending ? "Running…" : "Run test"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              Results
              <Badge variant="outline" className="font-mono">
                {result.model_version}
              </Badge>
              <Badge variant="secondary">{result.used_live_model ? "Live model" : "Loaded for this test"}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ResolvedInputs result={result} />

            <p className="text-muted-foreground text-sm">
              {result.recommendations.length} crops ranked. This is how an FPO with these inputs would see them. Click a
              crop for its Package of Practices.
            </p>

            <div className="flex flex-col gap-3">
              {result.recommendations.slice(0, visibleCount).map((item, i) => (
                <CropCard key={item.crop} rank={i + 1} item={item} onOpen={() => setPopCrop(item.crop)} />
              ))}
            </div>

            {visibleCount < result.recommendations.length && (
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="self-center rounded-md border px-4 py-1.5 font-medium text-sm hover:bg-muted"
              >
                View more ({result.recommendations.length - visibleCount} of {result.recommendations.length})
              </button>
            )}
          </CardContent>
        </Card>
      )}

      <CropPopSheet crop={popCrop} onClose={() => setPopCrop(null)} />
    </div>
  );
}

// Same card an FPO sees on their recommendations page
// (fpo/(portal)/recommendations/_components/crop-recommendation-display.tsx), plus the rank.
function CropCard({
  rank,
  item,
  onOpen,
}: {
  rank: number;
  item: ModelTestResult["recommendations"][number];
  onOpen: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition-colors hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-ring"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium capitalize">
          <span className="mr-2 text-muted-foreground tabular-nums">{rank}.</span>
          {item.crop}
        </h3>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
          {Math.round(item.confidence * 100)}% match
        </span>
      </div>
      <p className="text-muted-foreground text-sm">{item.reasoning}</p>
      {item.fit && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <FitChip label="Temp" value={item.fit.temperature} />
          <FitChip label="pH" value={item.fit.ph} />
          <FitChip label="Season" value={item.fit.season} />
          <FitChip label="Soil" value={item.fit.soil} />
          {item.fit.zone_documented && (
            <span className="rounded-full border px-2 py-0.5 text-muted-foreground">Zone-documented</span>
          )}
          {item.fit.estimated && (
            <span className="rounded-full border border-amber-300 px-2 py-0.5 text-amber-700 dark:border-amber-800 dark:text-amber-400">
              Requirements estimated
            </span>
          )}
        </div>
      )}
      <div className="flex items-center gap-1.5 text-xs">
        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
        <span>
          Estimated yield: <span className="font-medium text-foreground">{item.estimated_yield}</span>
        </span>
      </div>
      <div className="flex items-start gap-1.5 border-t pt-2 text-xs">
        <ThumbsUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="text-muted-foreground">{item.business_guidance}</span>
      </div>
    </div>
  );
}

// One fit component as "label 87%", colour-coded by how well it fits.
function FitChip({ label, value }: { label: string; value: number }) {
  const tone =
    value >= 0.8
      ? "border-green-300 text-green-700 dark:border-green-900 dark:text-green-400"
      : value >= 0.5
        ? "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400"
        : "border-red-300 text-red-700 dark:border-red-900 dark:text-red-400";
  return (
    <span className={`rounded-full border px-2 py-0.5 tabular-nums ${tone}`}>
      {label} {Math.round(value * 100)}%
    </span>
  );
}

// What the model actually saw -- the service may average soil types, fill in
// pH from the soil type, and ignore commodity names it doesn't recognise.
function ResolvedInputs({ result }: { result: ModelTestResult }) {
  const r = result.resolved_inputs;
  const overridden = new Set(r.climate_overridden);
  const src = (key: string) => (overridden.has(key) ? " (entered)" : " (seasonal avg)");
  const rows: [string, string][] = [
    ["Zone / season", `${humanize(r.zone)} · ${humanize(r.season)}`],
    ["Soil", r.soil_categories.length === 1 ? r.soil_categories[0] : `Average of ${r.soil_categories.join("; ")}`],
    ["Soil pH used", r.soil_ph_used.join(", ")],
    [
      "Climate",
      `${r.climate.temperature_avg_C} °C${src("temperature_avg_C")} · ${r.climate.humidity_pct}% humidity${src("humidity_pct")} · ${r.climate.rainfall_mm} mm rain/month (seasonal avg)`,
    ],
    ["Commodities matched", r.matched_commodities.length ? r.matched_commodities.join(", ") : "None"],
    ["Crops considered", String(r.n_candidates)],
  ];
  return (
    <div className="flex flex-col gap-2">
      <dl className="grid gap-x-6 gap-y-1.5 rounded-md border bg-muted/30 p-3 text-sm sm:grid-cols-[max-content_1fr]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {r.unmatched_commodities.length > 0 && (
        <p className="text-amber-700 text-sm dark:text-amber-400">
          Not recognised, so ignored: {r.unmatched_commodities.join(", ")}
        </p>
      )}
    </div>
  );
}
