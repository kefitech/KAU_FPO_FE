"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, ExternalLink } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { fpoRegistrationApi } from "@/app/fpo/_api/fpo-registration";
import { Button } from "@/components/ui/button";
import { useVoiceGuidance } from "@/hooks/use-voice-guidance";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { masterDataApi, type MasterDataItem } from "@/lib/api/master-data";
import type { FpoProfile } from "@/types/fpo";

const schema = z.object({
  name: z.string().min(1, { message: "FPO name is required" }),
  name_ml: z.string().optional(),
  legal_structure: z.string().min(1, { message: "Please select registration type" }),
  legal_structure_detail: z.string().optional(),
  registration_number: z.string().min(1, { message: "Registration number is required" }),
  cin_number: z.string().optional(),
  date_of_registration: z.string().min(1, { message: "Date of registration is required" }),
  pan_number: z
    .string()
    .min(1, { message: "PAN number is required" })
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i, { message: "Enter a valid PAN number (e.g. AABCK1234D)" }),
  gst_number: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
type FieldValidationState = Record<string, { error: string | null; duplicate: boolean }>;

interface Step1Props {
  profile?: FpoProfile;
  onSave?: (profile: FpoProfile) => void;
  onSuccess: (profile: FpoProfile) => void;
}

const FIELD_LABELS: Partial<Record<keyof FormValues, string>> = {
  name: "FPO Name",
  legal_structure: "Registration Type",
  registration_number: "Registration Number",
  date_of_registration: "Date of Registration",
  pan_number: "PAN Number",
};

export function Step1BasicInfo({ profile, onSave, onSuccess }: Step1Props) {
  const isEdit = !!profile;
  const router = useRouter();
  const { speak } = useVoiceGuidance();
  const [fieldErrors, setFieldErrors] = useState<FieldValidationState>({});
  const [saveMode, setSaveMode] = useState<"save" | "next" | null>(null);
  const [duplicateFpo, setDuplicateFpo] = useState<{ id: number; name: string } | null>(null);
  const [legalStructures, setLegalStructures] = useState<MasterDataItem[]>([]);
  const [legalStructuresLoaded, setLegalStructuresLoaded] = useState(false);
  const [subOptions, setSubOptions] = useState<MasterDataItem[]>([]);
  const [subOptionsLoaded, setSubOptionsLoaded] = useState(false);

  useEffect(() => {
    masterDataApi.get("legal_structure").then((data) => {
      setLegalStructures(data);
      setLegalStructuresLoaded(true);
    });
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    setError,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? {
          name: profile.name ?? "",
          name_ml: profile.name_ml ?? "",
          legal_structure: profile.legal_structure ?? "",
          legal_structure_detail: profile.legal_structure_detail ?? "",
          registration_number: profile.registration_number ?? "",
          cin_number: profile.cin_number ?? "",
          date_of_registration: profile.date_of_registration ?? "",
          pan_number: profile.pan_number ?? "",
          gst_number: profile.gst_number ?? "",
        }
      : { legal_structure: "", legal_structure_detail: "" },
  });

  const selectedStructure = watch("legal_structure");
  const selectedOption = legalStructures.find((o) => o.code === selectedStructure);
  const hasSubDropdown = selectedOption?.metadata?.has_sub_dropdown === true;

  useEffect(() => {
    if (hasSubDropdown) {
      setSubOptionsLoaded(false);
      masterDataApi.get("state_csa_act").then((data) => {
        setSubOptions(data);
        setSubOptionsLoaded(true);
      });
    } else {
      setSubOptions([]);
      setSubOptionsLoaded(false);
    }
  }, [hasSubDropdown]);

  const validateMutation = useMutation({
    mutationFn: ({ field, value }: { field: string; value: string }) => fpoRegistrationApi.validateField(field, value),
    onSuccess: (data) => {
      setFieldErrors((prev) => ({ ...prev, [data.field]: { error: data.error, duplicate: data.duplicate } }));
      if (data.duplicate && data.fpo_id) {
        setDuplicateFpo({ id: data.fpo_id, name: data.fpo_name ?? "" });
      }
    },
  });

  function handleInvalidSubmit(formErrors: Record<string, { message?: string }>) {
    const firstField = Object.keys(formErrors)[0] as keyof FormValues;
    if (!firstField) return;
    const label = FIELD_LABELS[firstField] ?? String(firstField);
    const val = getValues(firstField);
    const isEmpty = !val || val === "";
    speak(
      isEmpty
        ? `You haven't filled ${label}. This is a required field.`
        : `Please enter a valid ${label}.`,
    );
  }

  function handleBlurValidation(field: string) {
    const value = getValues(field as keyof FormValues) as string;
    if (!value?.trim()) return;
    validateMutation.mutate({ field, value });
  }

  const submitMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        name: values.name,
        name_ml: values.name_ml || undefined,
        legal_structure: values.legal_structure,
        legal_structure_detail: hasSubDropdown ? values.legal_structure_detail || undefined : undefined,
        registration_number: values.registration_number,
        cin_number: values.cin_number || undefined,
        date_of_registration: values.date_of_registration,
        pan_number: values.pan_number || undefined,
        gst_number: values.gst_number || undefined,
      };
      if (isEdit) return fpoRegistrationApi.updateStep({ step: 1, ...payload });
      return fpoRegistrationApi.register(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Details updated." : "FPO created. Let's fill in the details.");
    },
    onSettled: () => setSaveMode(null),
    onError: (err: unknown) => {
      const apiErr = err as { data?: { duplicate_detected?: boolean; duplicate_field?: string; fpo_id?: number; fpo_name?: string; errors?: Record<string, string[]> }; message?: string } | undefined;
      if (apiErr?.data?.duplicate_detected) {
        setFieldErrors((prev) => ({
          ...prev,
          [apiErr.data?.duplicate_field ?? "registration_number"]: { error: apiErr?.message ?? "Already exists", duplicate: true },
        }));
        if (apiErr.data?.fpo_id) {
          setDuplicateFpo({ id: apiErr.data.fpo_id, name: apiErr.data.fpo_name ?? "" });
        }
        return;
      }
      const serverErrors = apiErr?.data?.errors;
      if (serverErrors) {
        Object.entries(serverErrors).forEach(([field, messages]) => {
          setError(field as keyof FormValues, { type: "server", message: messages[0] });
        });
      } else {
        toast.error(apiErr?.message ?? (isEdit ? "Failed to update." : "Failed to create FPO."));
      }
    },
  });

  const hasDuplicate = Object.values(fieldErrors).some((v) => v.duplicate);

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-5">
      <div>
        <h2 className="font-semibold text-lg">Basic Information</h2>
        <p className="mt-0.5 text-muted-foreground text-sm">Enter your FPO's legal registration details</p>
      </div>

      {/* FPO Name */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="name">
            FPO Name (English) <span className="text-destructive">*</span>
          </FieldLabel>
          <Input id="name" placeholder="e.g. Kerala Farmers FPO" {...register("name")} />
          {errors.name && <FieldError errors={[errors.name]} />}
        </Field>

        <Field>
          <FieldLabel htmlFor="name_ml">FPO Name (Malayalam)</FieldLabel>
          <Input id="name_ml" placeholder="e.g. കേരള കർഷകർ FPO" {...register("name_ml")} />
        </Field>
      </div>

      {/* Legal Structure */}
      <Field>
        <FieldLabel htmlFor="legal_structure">
          Registered Under <span className="text-destructive">*</span>
        </FieldLabel>
        {legalStructuresLoaded ? (
          <Controller
            control={control}
            name="legal_structure"
            render={({ field }) => (
              <SearchableSelect
                value={field.value}
                onChange={field.onChange}
                options={legalStructures.map((o) => ({ value: o.code, label: o.name }))}
                placeholder="Search registration type…"
              />
            )}
          />
        ) : (
          <Skeleton className="h-9 w-full" />
        )}
        {errors.legal_structure && <FieldError errors={[errors.legal_structure]} />}
      </Field>

      {/* Conditional sub-dropdown */}
      {hasSubDropdown && (
        <Field>
          <FieldLabel htmlFor="legal_structure_detail">
            State CSA Act <span className="text-destructive">*</span>
          </FieldLabel>
          {subOptionsLoaded ? (
            <Controller
              control={control}
              name="legal_structure_detail"
              render={({ field }) => (
                <SearchableSelect
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={subOptions.map((o) => ({ value: o.code, label: o.name }))}
                  placeholder="Search state CSA act…"
                />
              )}
            />
          ) : (
            <Skeleton className="h-9 w-full" />
          )}
          {errors.legal_structure_detail && <FieldError errors={[errors.legal_structure_detail]} />}
        </Field>
      )}

      {/* Registration & CIN */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="registration_number">
            Registration Number <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="registration_number"
            placeholder="e.g. REG/2024/001"
            {...register("registration_number")}
            onBlur={() => handleBlurValidation("registration_number")}
          />
          {errors.registration_number && <FieldError errors={[errors.registration_number]} />}
          {!errors.registration_number && fieldErrors.registration_number?.error && (
            <ServerFieldError
              error={fieldErrors.registration_number.error}
              duplicate={fieldErrors.registration_number.duplicate}
            />
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="cin_number">CIN Number</FieldLabel>
          <Input
            id="cin_number"
            placeholder="e.g. U01400KL2024PLC..."
            {...register("cin_number")}
            onBlur={() => handleBlurValidation("cin_number")}
          />
          {fieldErrors.cin_number?.error && (
            <ServerFieldError error={fieldErrors.cin_number.error} duplicate={fieldErrors.cin_number.duplicate} />
          )}
        </Field>
      </div>

      {/* Date of Registration */}
      <Field>
        <FieldLabel htmlFor="date_of_registration">
          Date of Registration <span className="text-destructive">*</span>
        </FieldLabel>
        <Input
          id="date_of_registration"
          type="date"
          max={new Date().toISOString().split("T")[0]}
          {...register("date_of_registration")}
        />
        {errors.date_of_registration && <FieldError errors={[errors.date_of_registration]} />}
      </Field>

      {/* PAN & GST */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="pan_number">
            PAN Number <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="pan_number"
            placeholder="e.g. AABCK1234D"
            className="uppercase"
            {...register("pan_number")}
            onBlur={() => handleBlurValidation("pan_number")}
          />
          {errors.pan_number && <FieldError errors={[errors.pan_number]} />}
          {!errors.pan_number && fieldErrors.pan_number?.error && (
            <ServerFieldError error={fieldErrors.pan_number.error} duplicate={fieldErrors.pan_number.duplicate} />
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="gst_number">GST Number</FieldLabel>
          <Input
            id="gst_number"
            placeholder="e.g. 32AABCK1234D1Z5"
            className="uppercase"
            {...register("gst_number")}
            onBlur={() => handleBlurValidation("gst_number")}
          />
          {fieldErrors.gst_number?.error && (
            <ServerFieldError error={fieldErrors.gst_number.error} duplicate={fieldErrors.gst_number.duplicate} />
          )}
        </Field>
      </div>

      {hasDuplicate && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex flex-col gap-1">
            <p className="font-medium text-amber-700 text-sm dark:text-amber-300">
              An FPO with these details already exists
            </p>
            <p className="text-amber-600 text-xs dark:text-amber-400">
              If this is your FPO, you can claim it instead of creating a new one.
            </p>
            <button
              type="button"
              className="flex w-fit items-center gap-1 font-medium text-amber-700 text-xs underline underline-offset-2 dark:text-amber-300"
              onClick={() => {
                const params = new URLSearchParams();
                if (duplicateFpo) {
                  params.set("fpo_id", String(duplicateFpo.id));
                  params.set("fpo_name", duplicateFpo.name);
                }
                router.push(`/fpo/claim?${params.toString()}`);
              }}
            >
              Claim Your Business <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <div />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={submitMutation.isPending}
            onClick={handleSubmit((v) => {
              setSaveMode("save");
              submitMutation.mutate(v, { onSuccess: (data) => onSave?.(data) });
            }, handleInvalidSubmit)}
          >
            {submitMutation.isPending && saveMode === "save" ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            disabled={submitMutation.isPending}
            onClick={handleSubmit((v) => {
              setSaveMode("next");
              submitMutation.mutate(v, { onSuccess: (data) => onSuccess(data) });
            }, handleInvalidSubmit)}
          >
            {submitMutation.isPending && saveMode === "next"
              ? "Saving…"
              : isEdit
                ? "Next →"
                : "Get Started →"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function ServerFieldError({ error, duplicate }: { error: string; duplicate: boolean }) {
  return (
    <p className={`mt-1 text-xs ${duplicate ? "text-amber-600 dark:text-amber-400" : "text-destructive"}`}>{error}</p>
  );
}
