"use client";

import { useEffect, useState } from "react";

import dynamic from "next/dynamic";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { fpoRegistrationApi } from "@/app/fpo/_api/fpo-registration";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useVoiceGuidance } from "@/hooks/use-voice-guidance";
import { type MasterDataItem, masterDataApi } from "@/lib/api/master-data";
import { DISTRICT_OPTIONS, type FpoProfile } from "@/types/fpo";

import type { LatLng } from "./map-pin-picker";

const MapPinPicker = dynamic(() => import("./map-pin-picker").then((m) => ({ default: m.MapPinPicker })), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-lg border bg-muted/30">
      <p className="text-muted-foreground text-sm">Loading map…</p>
    </div>
  ),
});

// District name → code mapping for auto-fill from pincode/GPS APIs
const DISTRICT_NAME_TO_CODE: Record<string, string> = {
  Thiruvananthapuram: "TVM",
  Kollam: "KLM",
  Pathanamthitta: "PTA",
  Alappuzha: "ALP",
  Kottayam: "KTM",
  Idukki: "IDK",
  Ernakulam: "EKM",
  Thrissur: "TSR",
  Palakkad: "PKD",
  Malappuram: "MLP",
  Kozhikode: "KZD",
  Wayanad: "WYD",
  Kannur: "KNR",
  Kasaragod: "KSD",
};

function resolveDistrictCode(name: string): string | null {
  if (!name) return null;
  // Try exact match first, then partial match
  const exact = DISTRICT_NAME_TO_CODE[name];
  if (exact) return exact;
  const key = Object.keys(DISTRICT_NAME_TO_CODE).find((k) => name.toLowerCase().includes(k.toLowerCase()));
  return key ? DISTRICT_NAME_TO_CODE[key] : null;
}

const schema = z.object({
  district: z.string().min(1, { message: "District is required" }),
  block_taluk: z.string().min(1, { message: "Block / Taluk is required" }),
  village_town: z.string().min(1, { message: "Village / Town is required" }),
  address_line1: z.string().min(1, { message: "Address is required" }),
  address_line2: z.string().optional(),
  pincode: z.string().refine((v) => /^\d{6}$/.test(v), { message: "Enter a valid 6-digit pincode" }),
  office_phone: z.string().refine((v) => /^\d{10}$/.test(v), { message: "Enter a valid 10-digit phone number" }),
  office_email: z.string().email({ message: "Enter a valid email address" }),
  website: z.string().optional(),
  location: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

type FieldValidationState = Record<string, { error: string | null; duplicate: boolean }>;

interface Step2Props {
  profile: FpoProfile;
  onSave?: () => void;
  onSuccess: () => void;
  onBack: () => void;
}

const FIELD_LABELS: Partial<Record<keyof FormValues, string>> = {
  district: "District",
  block_taluk: "Block / Taluk",
  village_town: "Village / Town",
  address_line1: "Address",
  pincode: "Pincode",
  office_phone: "Office Phone",
  office_email: "Office Email",
};

export function Step2Contact({ profile, onSave, onSuccess, onBack }: Step2Props) {
  const { speak } = useVoiceGuidance();
  const [fieldErrors, setFieldErrors] = useState<FieldValidationState>({});
  const [saveMode, setSaveMode] = useState<"save" | "next" | null>(null);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<MasterDataItem[]>([]);
  const [blocksLoaded, setBlocksLoaded] = useState(false);
  const [mapFlyTarget, setMapFlyTarget] = useState<LatLng | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      district: profile.district || "",
      block_taluk: profile.block_taluk || "",
      village_town: profile.village_town || "",
      address_line1: profile.address_line1 || "",
      address_line2: profile.address_line2 || "",
      pincode: profile.pincode || "",
      office_phone: profile.office_phone || "",
      office_email: profile.office_email || "",
      website: profile.website || "",
      location:
        profile.latitude != null && profile.longitude != null
          ? { lat: Number(profile.latitude), lng: Number(profile.longitude) }
          : null,
    },
  });

  const selectedDistrict = watch("district");

  useEffect(() => {
    if (!selectedDistrict) {
      setBlocks([]);
      setBlocksLoaded(false);
      return;
    }
    setBlocksLoaded(false);
    masterDataApi.get("block", selectedDistrict).then((data) => {
      setBlocks(data);
      setBlocksLoaded(true);
      if (!profile.block_taluk) setValue("block_taluk", "", { shouldValidate: false });
    });
  }, [selectedDistrict, setValue, profile.block_taluk]);

  const validateMutation = useMutation({
    mutationFn: ({ field, value }: { field: string; value: string }) => fpoRegistrationApi.validateField(field, value),
    onSuccess: (data) => {
      setFieldErrors((prev) => ({
        ...prev,
        [data.field]: { error: data.error, duplicate: data.duplicate },
      }));
    },
  });

  function handleInvalidSubmit(formErrors: Record<string, { message?: string }>) {
    const firstField = Object.keys(formErrors)[0] as keyof FormValues;
    if (!firstField) return;
    const label = FIELD_LABELS[firstField] ?? String(firstField);
    const val = getValues(firstField);
    const isEmpty = !val || val === "";
    speak(isEmpty ? `You haven't filled ${label}. This is a required field.` : `Please enter a valid ${label}.`);
  }

  function handleBlurValidation(field: string) {
    const value = getValues(field as keyof FormValues) as string;
    if (!value?.trim()) return;
    validateMutation.mutate({ field, value });
  }

  async function handlePincodeLookup(pincode: string, flyMap = true) {
    if (!/^\d{6}$/.test(pincode)) return;
    setPincodeLoading(true);
    setPincodeError(null);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await res.json();
      if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        if (po.State !== "Kerala") {
          setPincodeError("Only Kerala pincodes are supported");
          return;
        }
        const distCode = resolveDistrictCode(po.District);
        if (distCode && !getValues("district")) setValue("district", distCode, { shouldValidate: true });
        if (po.Name && !getValues("village_town")) setValue("village_town", po.Name, { shouldValidate: true });

        // Forward geocode to center the map on the pincode location
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(po.Name)}+${encodeURIComponent(po.District)}+Kerala&format=json&limit=1`,
            { headers: { "Accept-Language": "en" } },
          );
          const geoData = await geoRes.json();
          if (geoData[0]?.lat && geoData[0]?.lon) {
            const pinCoords = {
              lat: Number(Number(geoData[0].lat).toFixed(6)),
              lng: Number(Number(geoData[0].lon).toFixed(6)),
            };
            setValue("location", pinCoords, { shouldValidate: false });
            if (flyMap) setMapFlyTarget({ ...pinCoords });
          }
        } catch {
          // silently skip — map centering is optional
        }

        toast.success("Location auto-filled from pincode");
      } else {
        setPincodeError("Pincode not found");
      }
    } catch {
      // silently skip on network error
    } finally {
      setPincodeLoading(false);
    }
  }

  async function handleGpsLocation(coords: LatLng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json`,
        { headers: { "Accept-Language": "en" } },
      );
      const data = await res.json();
      const address = data.address ?? {};

      // Pincode
      const postcode = address.postcode?.replace(/\s/g, "");
      if (postcode && /^\d{6}$/.test(postcode)) {
        if (!getValues("pincode")) setValue("pincode", postcode, { shouldValidate: true });
        await handlePincodeLookup(postcode, false);
      } else {
        // Try to fill district directly from Nominatim
        const districtName = address.county || address.state_district || "";
        const distCode = resolveDistrictCode(districtName);
        if (distCode && !getValues("district")) setValue("district", distCode, { shouldValidate: true });

        const village = address.village || address.suburb || address.town || address.city_district || "";
        if (village && !getValues("village_town")) setValue("village_town", village, { shouldValidate: true });
      }

      toast.success("Location fields auto-filled from GPS");
    } catch {
      // silently skip — GPS pin is still set on the map
    }
  }

  const submitMutation = useMutation({
    mutationFn: (values: FormValues) =>
      fpoRegistrationApi.updateStep({
        step: 2,
        district: values.district,
        block_taluk: values.block_taluk,
        village_town: values.village_town,
        address_line1: values.address_line1,
        address_line2: values.address_line2 || undefined,
        pincode: values.pincode,
        office_phone: values.office_phone,
        office_email: values.office_email,
        website: values.website || undefined,
        latitude: values.location?.lat ?? null,
        longitude: values.location?.lng ?? null,
      }),
    onSuccess: () => {
      toast.success("Contact details saved");
    },
    onSettled: () => setSaveMode(null),
    onError: (err: unknown) => {
      const apiErr = err as { data?: { errors?: Record<string, string[]> }; message?: string } | undefined;
      const serverErrors = apiErr?.data?.errors;
      if (serverErrors) {
        Object.entries(serverErrors).forEach(([field, messages]) => {
          setError(field as keyof FormValues, { type: "server", message: messages[0] });
        });
      } else {
        toast.error(apiErr?.message ?? "Failed to save. Please try again.");
      }
    },
  });

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-5">
      <div>
        <h2 className="font-semibold text-lg">Contact & Location</h2>
        <p className="mt-0.5 text-muted-foreground text-sm">Office address, contact information and map location</p>
      </div>

      {/* District */}
      <Field>
        <FieldLabel htmlFor="district">
          District <span className="text-destructive">*</span>
        </FieldLabel>
        <Controller
          control={control}
          name="district"
          render={({ field }) => (
            <SearchableSelect
              value={field.value}
              onChange={field.onChange}
              options={DISTRICT_OPTIONS}
              placeholder="Search district…"
            />
          )}
        />
        {errors.district && <FieldError errors={[errors.district]} />}
      </Field>

      {/* Block & Village */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="block_taluk">
            Block / Taluk <span className="text-destructive">*</span>
          </FieldLabel>
          {selectedDistrict && !blocksLoaded ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Controller
              control={control}
              name="block_taluk"
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={blocks.map((b) => ({ value: b.code, label: b.name }))}
                  placeholder={selectedDistrict ? "Search block…" : "Select district first…"}
                  disabled={!selectedDistrict}
                />
              )}
            />
          )}
          {errors.block_taluk && <FieldError errors={[errors.block_taluk]} />}
        </Field>

        <Field>
          <FieldLabel htmlFor="village_town">
            Village / Town <span className="text-destructive">*</span>
          </FieldLabel>
          <Input id="village_town" placeholder="e.g. Irinjalakuda" {...register("village_town")} />
          {errors.village_town && <FieldError errors={[errors.village_town]} />}
        </Field>
      </div>

      {/* Address */}
      <Field>
        <FieldLabel htmlFor="address_line1">
          Address Line 1 <span className="text-destructive">*</span>
        </FieldLabel>
        <Input
          id="address_line1"
          placeholder="House / Building / Street"
          maxLength={150}
          {...register("address_line1")}
        />
        {errors.address_line1 && <FieldError errors={[errors.address_line1]} />}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="address_line2">Address Line 2</FieldLabel>
          <Input id="address_line2" placeholder="Landmark, area (optional)" {...register("address_line2")} />
        </Field>

        <Field>
          <FieldLabel htmlFor="pincode">
            Pincode <span className="text-destructive">*</span>
          </FieldLabel>
          <div className="relative">
            <Input
              id="pincode"
              placeholder="e.g. 680121"
              maxLength={6}
              {...register("pincode")}
              onBlur={(e) => {
                handleBlurValidation("pincode");
                handlePincodeLookup(e.target.value);
              }}
            />
            {pincodeLoading && (
              <Loader2 className="absolute top-2.5 right-2.5 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {errors.pincode && <FieldError errors={[errors.pincode]} />}
          {!errors.pincode && pincodeError && <p className="mt-1 text-destructive text-xs">{pincodeError}</p>}
          {!errors.pincode && !pincodeError && fieldErrors.pincode?.error && (
            <p className="mt-1 text-destructive text-xs">{fieldErrors.pincode.error}</p>
          )}
        </Field>
      </div>

      {/* Contact */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="office_phone">
            Office Phone <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="office_phone"
            placeholder="10-digit mobile number"
            maxLength={10}
            {...register("office_phone")}
            onBlur={() => handleBlurValidation("office_phone")}
          />
          {errors.office_phone && <FieldError errors={[errors.office_phone]} />}
          {!errors.office_phone && fieldErrors.office_phone?.error && (
            <p className="mt-1 text-destructive text-xs">{fieldErrors.office_phone.error}</p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="office_email">
            Office Email <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="office_email"
            type="email"
            placeholder="info@yourfpo.com"
            {...register("office_email")}
            onBlur={() => handleBlurValidation("office_email")}
          />
          {errors.office_email && <FieldError errors={[errors.office_email]} />}
          {!errors.office_email && fieldErrors.office_email?.error && (
            <p className="mt-1 text-destructive text-xs">{fieldErrors.office_email.error}</p>
          )}
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="website">Website</FieldLabel>
        <Input id="website" placeholder="https://yourfpo.com (optional)" maxLength={60} {...register("website")} />
      </Field>

      {/* Map Pin Picker */}
      <Controller
        control={control}
        name="location"
        render={({ field }) => (
          <Field>
            <FieldLabel>
              FPO Location on Map <span className="text-destructive">*</span>
            </FieldLabel>
            <MapPinPicker
              value={field.value as LatLng | null}
              onChange={field.onChange}
              onGpsLocation={handleGpsLocation}
              flyTo={mapFlyTarget}
            />
            {errors.location && <FieldError errors={[errors.location]} />}
          </Field>
        )}
      />

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={submitMutation.isPending}
            onClick={handleSubmit((v) => {
              if (!v.location) {
                setError("location", { type: "manual", message: "Please pin your FPO location on the map" });
                return;
              }
              setSaveMode("save");
              submitMutation.mutate(v, { onSuccess: () => onSave?.() });
            }, handleInvalidSubmit)}
          >
            {submitMutation.isPending && saveMode === "save" ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            disabled={submitMutation.isPending}
            onClick={handleSubmit((v) => {
              if (!v.location) {
                setError("location", { type: "manual", message: "Please pin your FPO location on the map" });
                return;
              }
              setSaveMode("next");
              submitMutation.mutate(v, { onSuccess: () => onSuccess() });
            }, handleInvalidSubmit)}
          >
            {submitMutation.isPending && saveMode === "next" ? "Saving…" : "Next →"}
          </Button>
        </div>
      </div>
    </form>
  );
}
