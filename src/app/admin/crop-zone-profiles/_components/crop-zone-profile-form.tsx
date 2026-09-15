"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { KAU_ZONES, adminCropZoneProfilesApi, type CropZoneProfilePayload } from "@/app/admin/_api/crop-zone-profiles";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type T = Record<string, string>;

const schema = z
  .object({
    crop_name: z.string().min(1, { message: "Crop name is required" }).max(150),
    crop_group: z.string().optional(),
    kau_zone: z.enum(KAU_ZONES, { message: "KAU zone is required" }),
    temp_lo: z.number(),
    temp_hi: z.number(),
    ph_lo: z.number(),
    ph_hi: z.number(),
    seasons_text: z.string().optional(),
    temp_is_real: z.boolean(),
    ph_is_real: z.boolean(),
    is_active: z.boolean(),
  })
  .refine((v) => v.temp_lo <= v.temp_hi, { message: "Must be ≥ min temperature", path: ["temp_hi"] })
  .refine((v) => v.ph_lo <= v.ph_hi, { message: "Must be ≥ min pH", path: ["ph_hi"] });

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  crop_name: "",
  crop_group: "",
  kau_zone: "General (all zones)",
  temp_lo: 20,
  temp_hi: 32,
  ph_lo: 5.0,
  ph_hi: 6.5,
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
      const payload: CropZoneProfilePayload = { ...values };
      return mode === "create" ? adminCropZoneProfilesApi.create(payload) : adminCropZoneProfilesApi.update(id!, payload);
    },
    onSuccess: () => {
      toast.success(mode === "create" ? (t.toast_created ?? "Crop zone profile created") : (t.toast_updated ?? "Crop zone profile updated"));
      queryClient.invalidateQueries({ queryKey: ["crop-zone-profiles"] });
      router.push("/admin/crop-zone-profiles");
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
                render={({ field }) => <Input id="crop_name" placeholder="e.g. Coffee" {...field} />}
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
                render={({ field }) => <Input id="crop_group" placeholder="e.g. Beverages and Stimulants" {...field} />}
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
                render={({ field }) => (
                  <Input
                    type="number"
                    step="0.1"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    aria-label={t.field_temp_lo ?? "Min temperature"}
                  />
                )}
              />
              <span className="text-muted-foreground text-sm">–</span>
              <Controller
                control={control}
                name="temp_hi"
                render={({ field }) => (
                  <Input
                    type="number"
                    step="0.1"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    aria-label={t.field_temp_hi ?? "Max temperature"}
                  />
                )}
              />
            </div>
            {errors.temp_hi && <FieldError errors={[errors.temp_hi]} />}
          </FieldGroup>

          <FieldGroup>
            <FieldLabel>{t.field_ph_range ?? "Soil pH range"}</FieldLabel>
            <div className="flex items-center gap-2">
              <Controller
                control={control}
                name="ph_lo"
                render={({ field }) => (
                  <Input
                    type="number"
                    step="0.1"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    aria-label={t.field_ph_lo ?? "Min pH"}
                  />
                )}
              />
              <span className="text-muted-foreground text-sm">–</span>
              <Controller
                control={control}
                name="ph_hi"
                render={({ field }) => (
                  <Input
                    type="number"
                    step="0.1"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    aria-label={t.field_ph_hi ?? "Max pH"}
                  />
                )}
              />
            </div>
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
                  placeholder={t.placeholder_seasons_text ?? "e.g. Onset of southwest monsoon (main field planting, before heavy rains)"}
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
                {t.field_temp_is_real_help ?? "Off if this is a fallback estimate, not the PoP text's own stated range."}
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
        <Button type="button" variant="outline" onClick={() => router.push("/admin/crop-zone-profiles")}>
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
