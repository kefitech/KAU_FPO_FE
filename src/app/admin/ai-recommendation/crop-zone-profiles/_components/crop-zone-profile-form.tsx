"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { adminCropZoneProfilesApi, type CropZoneProfilePayload, KAU_ZONES } from "@/app/admin/_api/crop-zone-profiles";
import { MasterDataSelect } from "@/components/common/master-data-select";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type T = Record<string, string>;

// Applied silently when the corresponding field is left blank.
const FIELD_DEFAULTS = {
  temp_lo: 20,
  temp_hi: 32,
  ph_lo: 5.0,
  ph_hi: 6.5,
};

const schema = z
  .object({
    crop_name: z.string().min(1, { message: "Crop name is required" }).max(150),
    crop_group: z.string().optional(),
    kau_zone: z.enum(KAU_ZONES, { message: "KAU zone is required" }),
    temp_lo: z
      .number()
      .min(-60, { message: "Temperature must be at least -60°C" })
      .max(60, { message: "Temperature must be at most 60°C" })
      .optional(),
    temp_hi: z
      .number()
      .min(-60, { message: "Temperature must be at least -60°C" })
      .max(60, { message: "Temperature must be at most 60°C" })
      .optional(),
    ph_lo: z
      .number()
      .min(3, { message: "pH must be at least 3" })
      .max(10, { message: "pH must be at most 10" })
      .optional(),
    ph_hi: z
      .number()
      .min(3, { message: "pH must be at least 3" })
      .max(10, { message: "pH must be at most 10" })
      .optional(),
    seasons_text: z.string().optional(),
    temp_is_real: z.boolean(),
    ph_is_real: z.boolean(),
    is_active: z.boolean(),
  })
  .refine((v) => (v.temp_lo ?? FIELD_DEFAULTS.temp_lo) <= (v.temp_hi ?? FIELD_DEFAULTS.temp_hi), {
    message: "Max temperature must be greater than or equal to min temperature",
    path: ["temp_hi"],
  })
  .refine((v) => (v.ph_lo ?? FIELD_DEFAULTS.ph_lo) <= (v.ph_hi ?? FIELD_DEFAULTS.ph_hi), {
    message: "Max pH must be greater than or equal to min pH",
    path: ["ph_hi"],
  });

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  crop_name: "",
  crop_group: "",
  kau_zone: "General (all zones)",
  temp_lo: undefined,
  temp_hi: undefined,
  ph_lo: undefined,
  ph_hi: undefined,
  seasons_text: "",
  temp_is_real: true,
  ph_is_real: true,
  is_active: false,
};

interface Props {
  mode: "create" | "edit";
  id?: number;
  t?: T;
  tCommon?: T;
}

export function CropZoneProfileForm({ mode, id, t = {}, tCommon = {} }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ["crop-zone-profile", id],
    queryFn: () => adminCropZoneProfilesApi.getById(id!),
    enabled: mode === "edit" && !!id,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (existing) {
      reset({
        crop_name: existing.crop_name,
        crop_group: existing.crop_group,
        kau_zone: existing.kau_zone,
        temp_lo: existing.temp_lo,
        temp_hi: existing.temp_hi,
        ph_lo: existing.ph_lo,
        ph_hi: existing.ph_hi,
        seasons_text: existing.seasons_text,
        temp_is_real: existing.temp_is_real,
        ph_is_real: existing.ph_is_real,
        is_active: existing.is_active,
      });
    }
  }, [existing, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: CropZoneProfilePayload = {
        ...values,
        temp_lo: values.temp_lo ?? FIELD_DEFAULTS.temp_lo,
        temp_hi: values.temp_hi ?? FIELD_DEFAULTS.temp_hi,
        ph_lo: values.ph_lo ?? FIELD_DEFAULTS.ph_lo,
        ph_hi: values.ph_hi ?? FIELD_DEFAULTS.ph_hi,
      };
      return mode === "create"
        ? adminCropZoneProfilesApi.create(payload)
        : adminCropZoneProfilesApi.update(id!, payload);
    },
    onSuccess: () => {
      toast.success(
        mode === "create"
          ? (t.toast_created ?? "Crop zone profile created")
          : (t.toast_updated ?? "Crop zone profile updated"),
      );
      queryClient.invalidateQueries({ queryKey: ["crop-zone-profiles"] });
      router.push("/admin/ai-recommendation/crop-zone-profiles");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || (t.toast_save_failed ?? "Failed to save crop zone profile"));
    },
  });

  const isLoading = mode === "edit" && existingLoading;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-lg border p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Field>
              <FieldLabel htmlFor="crop_name">
                {t.field_crop_name ?? "Crop Name"} <span className="text-destructive">*</span>
              </FieldLabel>
              <Controller
                control={control}
                name="crop_name"
                render={({ field }) => (
                  <MasterDataSelect
                    category="crop_name"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={t.placeholder_crop_name ?? "Select crop…"}
                  />
                )}
              />
              {errors.crop_name && <FieldError errors={[errors.crop_name]} />}
            </Field>
          </div>
          <div>
            <Field>
              <FieldLabel htmlFor="crop_group">{t.field_crop_group ?? "Crop Group"}</FieldLabel>
              <Controller
                control={control}
                name="crop_group"
                render={({ field }) => (
                  <MasterDataSelect
                    category="crop_group"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder={t.placeholder_crop_group ?? "Select group…"}
                  />
                )}
              />
            </Field>
          </div>
        </div>

        <div>
          <Field>
            <FieldLabel htmlFor="kau_zone">
              {t.field_kau_zone ?? "KAU Zone"} <span className="text-destructive">*</span>
            </FieldLabel>
            <Controller
              control={control}
              name="kau_zone"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KAU_ZONES.map((z) => (
                      <SelectItem key={z} value={z}>
                        {z}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="mt-1 text-muted-foreground text-xs">
              {t.field_kau_zone_help ??
                "The book's own zone for this documented profile — it's expanded into the matching service zones automatically (e.g. Foothills → northern, central & southern service zones)."}
            </p>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldGroup>
            <FieldLabel>{t.field_temp_range ?? "Temperature range (°C)"}</FieldLabel>
            <div className="flex items-center gap-2">
              <Controller
                control={control}
                name="temp_lo"
                render={({ field: { value, onChange, ...field } }) => (
                  <Input
                    type="number"
                    step="0.1"
                    min={-60}
                    max={60}
                    value={Number.isNaN(value) || value == null ? "" : value}
                    onChange={(e) => {
                      onChange(e.target.value === "" ? undefined : e.target.valueAsNumber);
                    }}
                    placeholder={t.placeholder_temp_lo ?? `Default: ${FIELD_DEFAULTS.temp_lo}`}
                    aria-label={t.field_temp_lo ?? "Min temperature"}
                  />
                )}
              />
              <span className="text-muted-foreground text-sm">–</span>
              <Controller
                control={control}
                name="temp_hi"
                render={({ field: { value, onChange, ...field } }) => (
                  <Input
                    type="number"
                    step="0.1"
                    min={-60}
                    max={60}
                    value={Number.isNaN(value) || value == null ? "" : value}
                    onChange={(e) => {
                      onChange(e.target.value === "" ? undefined : e.target.valueAsNumber);
                    }}
                    placeholder={t.placeholder_temp_hi ?? `Default: ${FIELD_DEFAULTS.temp_hi}`}
                    aria-label={t.field_temp_hi ?? "Max temperature"}
                  />
                )}
              />
            </div>
            {errors.temp_lo && <FieldError errors={[errors.temp_lo]} />}
            {errors.temp_hi && <FieldError errors={[errors.temp_hi]} />}
          </FieldGroup>

          <FieldGroup>
            <FieldLabel>{t.field_ph_range ?? "Soil pH range"}</FieldLabel>
            <div className="flex items-center gap-2">
              <Controller
                control={control}
                name="ph_lo"
                render={({ field: { value, onChange, ...field } }) => (
                  <Input
                    {...field}
                    type="number"
                    step="0.1"
                    min={3}
                    max={10}
                    value={Number.isNaN(value) || value == null ? "" : value}
                    onChange={(e) => {
                      onChange(e.target.value === "" ? undefined : e.target.valueAsNumber);
                    }}
                    placeholder={t.placeholder_ph_lo ?? `Default: ${FIELD_DEFAULTS.ph_lo}`}
                    aria-label={t.field_ph_lo ?? "Min pH"}
                  />
                )}
              />
              <span className="text-muted-foreground text-sm">–</span>
              <Controller
                control={control}
                name="ph_hi"
                render={({ field: { value, onChange, ...field } }) => (
                  <Input
                    {...field}
                    type="number"
                    step="0.1"
                    min={3}
                    max={10}
                    value={Number.isNaN(value) || value == null ? "" : value}
                    onChange={(e) => {
                      onChange(e.target.value === "" ? undefined : e.target.valueAsNumber);
                    }}
                    placeholder={t.placeholder_ph_hi ?? `Default: ${FIELD_DEFAULTS.ph_hi}`}
                    aria-label={t.field_ph_hi ?? "Max pH"}
                  />
                )}
              />
            </div>
            {errors.ph_lo && <FieldError errors={[errors.ph_lo]} />}
            {errors.ph_hi && <FieldError errors={[errors.ph_hi]} />}
          </FieldGroup>
        </div>

        <div>
          <Field>
            <FieldLabel htmlFor="seasons_text">{t.field_seasons_text ?? "Season / planting window"}</FieldLabel>
            <Controller
              control={control}
              name="seasons_text"
              render={({ field }) => (
                <Textarea
                  id="seasons_text"
                  rows={3}
                  placeholder={
                    t.placeholder_seasons_text ??
                    "e.g. Onset of southwest monsoon (main field planting, before heavy rains)"
                  }
                  {...field}
                />
              )}
            />
          </Field>
        </div>
      </div>

      <div className="rounded-lg border p-5 space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          {t.settings_heading ?? "Settings"}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="temp_is_real"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
            <div>
              <FieldLabel>{t.field_temp_is_real ?? "Temperature range is from the book"}</FieldLabel>
              <p className="text-muted-foreground text-xs">
                {t.field_temp_is_real_help ??
                  "Off if this is a fallback estimate, not the PoP text's own stated range."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="ph_is_real"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
            <div>
              <FieldLabel>{t.field_ph_is_real ?? "pH range is from the book"}</FieldLabel>
              <p className="text-muted-foreground text-xs">
                {t.field_ph_is_real_help ?? "Off if this is a fallback estimate, not the PoP text's own stated range."}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
          />
          <div>
            <FieldLabel>{t.field_is_active ?? "Active"}</FieldLabel>
            <p className="text-muted-foreground text-xs">
              {t.field_is_active_help ??
                "Only active profiles are exported to the recommendation service — saved as a draft until switched on."}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/ai-recommendation/crop-zone-profiles")}
        >
          {tCommon.cancel ?? "Cancel"}
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? (t.btn_saving ?? "Saving…")
            : mode === "create"
              ? (t.btn_create ?? "Create")
              : (t.btn_save ?? "Save Changes")}
        </Button>
      </div>
    </form>
  );
}
