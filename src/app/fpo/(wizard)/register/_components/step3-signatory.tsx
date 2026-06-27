"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, type Resolver, useForm } from "react-hook-form";
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
import type { FpoProfile } from "@/types/fpo";

const toNum = (msg: string) => z.string().refine((v) => !Number.isNaN(Number(v)) && v !== "", { message: msg });
const toOptionalNum = () =>
  z.string().refine((v) => v === "" || !Number.isNaN(Number(v)), { message: "Enter a valid number" });

const schema = z
  .object({
    signatory_name: z
      .string()
      .min(1, { message: "Signatory name is required" })
      .max(100, { message: "Signatory name must be at most 100 characters" })
      .regex(/^[a-zA-Z\s]+$/, { message: "Only alphabetic characters and spaces are allowed" }),
    signatory_designation: z.string().min(1, { message: "Designation is required" }),
    signatory_phone: z.string().refine((v) => /^\d{10}$/.test(v), { message: "Enter a valid 10-digit phone number" }),
    signatory_email: z.string().email({ message: "Enter a valid email address" }),
    signatory_aadhaar_last4: z.string().refine((v) => /^\d{4}$/.test(v), { message: "Enter last 4 digits of Aadhaar" }),
    total_members: toNum("Total members is required").refine((v) => Number(v) >= 10, {
      message: "Minimum 10 members required",
    }),
    male_members: toNum("Required"),
    female_members: toNum("Required"),
    sc_st_members: toOptionalNum(),
    promoting_agency: z.string().min(1, { message: "Promoting agency is required" }),
    facilitating_agency_name: z.string().min(1, { message: "Facilitating agency name is required" }),
    ceo_available: z.boolean(),
    accountant_available: z.boolean(),
    total_directors: toNum("Required").refine((v) => Number(v) > 0, {
      message: "Total directors must be greater than 0",
    }),
    women_directors: toOptionalNum(),
    directors_under_35: toOptionalNum(),
  })
  .superRefine((data, ctx) => {
    const total = Number(data.total_members);
    const male = Number(data.male_members);
    const female = data.female_members ? Number(data.female_members) : 0;
    const scst = data.sc_st_members ? Number(data.sc_st_members) : 0;

    if (male + female + scst !== total) {
      const msg = `Total members is not tally with member count(${male + female + scst})`;
      for (const path of ["male_members", "female_members", "sc_st_members"] as const) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ["total_members"] });
      }
    }
  });

type FormValues = {
  signatory_name: string;
  signatory_designation: string;
  signatory_phone: string;
  signatory_email: string;
  signatory_aadhaar_last4: string;
  total_members: string;
  male_members: string;
  female_members: string;
  sc_st_members: string;
  promoting_agency: string;
  facilitating_agency_name: string;
  ceo_available: boolean;
  accountant_available: boolean;
  total_directors: string;
  women_directors: string;
  directors_under_35: string;
};

interface Step3Props {
  profile: FpoProfile;
  onSave?: () => void;
  onSuccess: () => void;
  onBack: () => void;
}

const FIELD_LABELS: Partial<Record<keyof FormValues, string>> = {
  signatory_name: "Signatory Name",
  signatory_designation: "Designation",
  signatory_phone: "Phone",
  signatory_email: "Email",
  signatory_aadhaar_last4: "Aadhaar Last 4 Digits",
  total_members: "Total Members",
  male_members: "Male Members",
  female_members: "Female Members",
  promoting_agency: "Promoting Agency",
  total_directors: "Total Directors",
  facilitating_agency_name: "Facilitating Agency Name",
};

export function Step3Signatory({ profile, onSave, onSuccess, onBack }: Step3Props) {
  const { speak } = useVoiceGuidance();
  const [designations, setDesignations] = useState<MasterDataItem[]>([]);
  const [saveMode, setSaveMode] = useState<"save" | "next" | null>(null);
  const [designationsLoaded, setDesignationsLoaded] = useState(false);
  const [agencies, setAgencies] = useState<MasterDataItem[]>([]);
  const [agenciesLoaded, setAgenciesLoaded] = useState(false);

  useEffect(() => {
    masterDataApi.get("signatory_designation").then((data) => {
      setDesignations(data);
      setDesignationsLoaded(true);
    });
    masterDataApi.get("promoting_agency").then((data) => {
      setAgencies(data);
      setAgenciesLoaded(true);
    });
  }, []);

  const {
    register,
    handleSubmit,
    control,
    getValues,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: {
      signatory_name: profile.signatory_name || "",
      signatory_designation: profile.signatory_designation || "",
      signatory_phone: profile.signatory_phone || "",
      signatory_email: profile.signatory_email || "",
      signatory_aadhaar_last4: profile.signatory_aadhaar_last4 || "",
      total_members: profile.total_members?.toString() ?? "",
      male_members: profile.male_members?.toString() ?? "",
      female_members: profile.female_members?.toString() ?? "",
      sc_st_members: profile.sc_st_members?.toString() ?? "",
      promoting_agency: profile.promoting_agency || "",
      facilitating_agency_name: profile.facilitating_agency_name || "",
      ceo_available: profile.ceo_available ?? false,
      accountant_available: profile.accountant_available ?? false,
      total_directors: profile.total_directors?.toString() ?? "",
      women_directors: profile.women_directors?.toString() ?? "",
      directors_under_35: profile.directors_under_35?.toString() ?? "",
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

  const submitMutation = useMutation({
    mutationFn: (values: FormValues) =>
      fpoRegistrationApi.updateStep({
        step: 3,
        signatory_name: values.signatory_name,
        signatory_designation: values.signatory_designation,
        signatory_phone: values.signatory_phone,
        signatory_email: values.signatory_email,
        signatory_aadhaar_last4: values.signatory_aadhaar_last4,
        total_members: Number(values.total_members),
        male_members: Number(values.male_members),
        female_members: Number(values.female_members),
        sc_st_members: values.sc_st_members ? Number(values.sc_st_members) : undefined,
        promoting_agency: values.promoting_agency,
        facilitating_agency_name: values.facilitating_agency_name || undefined,
        ceo_available: values.ceo_available,
        accountant_available: values.accountant_available,
        total_directors: Number(values.total_directors),
        women_directors: values.women_directors ? Number(values.women_directors) : 0,
        directors_under_35: values.directors_under_35 ? Number(values.directors_under_35) : 0,
      }),
    onSuccess: () => {
      toast.success("Signatory details saved");
    },
    onSettled: () => setSaveMode(null),
    onError: (err: unknown) => {
      const apiErr = err as {
        data?: { errors?: Record<string, string[]> };
        message?: string;
      };

      const serverErrors = apiErr?.data?.errors;

      if (serverErrors) {
        Object.entries(serverErrors).forEach(([field, messages]) => {
          const message = messages[0];

          if (field === "non_field_errors") {
            // Show toast
            toast.error(message);

            // Mark Total Directors as invalid
            setError("total_directors", {
              type: "server",
              message,
            });

            return;
          }

          setError(field as keyof FormValues, {
            type: "server",
            message,
          });
        });

        return;
      }

      toast.error(apiErr?.message ?? "Failed to save. Please try again.");
    },
  });

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-5">
      <div>
        <h2 className="font-semibold text-lg">Signatory & Members</h2>
        <p className="mt-0.5 text-muted-foreground text-sm">Authorized signatory details and membership information</p>
      </div>

      {/* Authorized Signatory */}
      <div className="flex flex-col gap-4 rounded-lg border p-4">
        <p className="font-medium text-muted-foreground text-sm">Authorized Signatory</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="signatory_name">
              Full Name <span className="text-destructive">*</span>
            </FieldLabel>
            <Input id="signatory_name" placeholder="e.g. Rajan Kumar" maxLength={100} {...register("signatory_name")} />
            {errors.signatory_name && <FieldError errors={[errors.signatory_name]} />}
          </Field>

          <Field>
            <FieldLabel htmlFor="signatory_designation">
              Designation <span className="text-destructive">*</span>
            </FieldLabel>
            {designationsLoaded ? (
              <Controller
                control={control}
                name="signatory_designation"
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={designations.map((d) => ({ value: d.code, label: d.name }))}
                    placeholder="Search designation…"
                  />
                )}
              />
            ) : (
              <Skeleton className="h-9 w-full" />
            )}
            {errors.signatory_designation && <FieldError errors={[errors.signatory_designation]} />}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="signatory_phone">
              Phone <span className="text-destructive">*</span>
            </FieldLabel>
            <Input id="signatory_phone" placeholder="10-digit mobile" maxLength={10} {...register("signatory_phone")} />
            {errors.signatory_phone && <FieldError errors={[errors.signatory_phone]} />}
          </Field>

          <Field>
            <FieldLabel htmlFor="signatory_email">
              Email <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="signatory_email"
              type="email"
              placeholder="signatory@email.com"
              {...register("signatory_email")}
            />
            {errors.signatory_email && <FieldError errors={[errors.signatory_email]} />}
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="signatory_aadhaar_last4">
            Aadhaar Last 4 Digits <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="signatory_aadhaar_last4"
            placeholder="e.g. 4321"
            maxLength={4}
            className="w-32"
            {...register("signatory_aadhaar_last4")}
          />
          {errors.signatory_aadhaar_last4 && <FieldError errors={[errors.signatory_aadhaar_last4]} />}
        </Field>
      </div>

      {/* Membership */}
      <div className="flex flex-col gap-4 rounded-lg border p-4">
        <p className="font-medium text-muted-foreground text-sm">Membership Details</p>

        <Field>
          <FieldLabel htmlFor="total_members">
            Total Members <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="total_members"
            type="number"
            min={10}
            placeholder="Minimum 10"
            className="w-40"
            {...register("total_members")}
          />
          {errors.total_members && <FieldError errors={[errors.total_members]} />}
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="male_members">Male Members</FieldLabel>
            <Input id="male_members" type="number" min={0} placeholder="0" {...register("male_members")} />
            {errors.male_members && <FieldError errors={[errors.male_members]} />}
          </Field>

          <Field>
            <FieldLabel htmlFor="female_members">Female Members</FieldLabel>
            <Input id="female_members" type="number" min={0} placeholder="0" {...register("female_members")} />
            {errors.female_members && <FieldError errors={[errors.female_members]} />}
          </Field>

          <Field>
            <FieldLabel htmlFor="sc_st_members">SC / ST Members</FieldLabel>
            <Input id="sc_st_members" type="number" min={0} placeholder="0" {...register("sc_st_members")} />
            {errors.sc_st_members && <FieldError errors={[errors.sc_st_members]} />}
          </Field>
        </div>
      </div>

      {/* Governance */}
      <div className="flex flex-col gap-4 rounded-lg border p-4">
        <p className="font-medium text-muted-foreground text-sm">Governance & Agencies</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="promoting_agency">
              Promoting Agency <span className="text-destructive">*</span>
            </FieldLabel>
            {agenciesLoaded ? (
              <Controller
                control={control}
                name="promoting_agency"
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={agencies.map((a) => ({ value: a.code, label: a.name }))}
                    placeholder="Search agency…"
                  />
                )}
              />
            ) : (
              <Skeleton className="h-9 w-full" />
            )}
            {errors.promoting_agency && <FieldError errors={[errors.promoting_agency]} />}
          </Field>

          <Field>
            <FieldLabel htmlFor="facilitating_agency_name">Facilitating Agency Name</FieldLabel>
            <Input
              id="facilitating_agency_name"
              placeholder="e.g. NABARD Kerala"
              {...register("facilitating_agency_name")}
            />
            {errors.facilitating_agency_name && <FieldError errors={[errors.facilitating_agency_name]} />}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="total_directors">
              Total Directors <span className="text-destructive">*</span>
            </FieldLabel>
            <Input id="total_directors" type="number" min={0} placeholder="0" {...register("total_directors")} />
            {errors.total_directors && errors.total_directors.type !== "server" && (
              <FieldError errors={[errors.total_directors]} />
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="women_directors">Women Directors</FieldLabel>
            <Input id="women_directors" type="number" min={0} placeholder="0" {...register("women_directors")} />
            {errors.women_directors && <FieldError errors={[errors.women_directors]} />}
          </Field>

          <Field>
            <FieldLabel htmlFor="directors_under_35">Directors Under 35</FieldLabel>
            <Input id="directors_under_35" type="number" min={0} placeholder="0" {...register("directors_under_35")} />
            {errors.directors_under_35 && <FieldError errors={[errors.directors_under_35]} />}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="ceo_available"
            render={({ field }) => (
              <label className="flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3">
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="h-4 w-4 cursor-pointer accent-foreground"
                />
                <div>
                  <p className="font-medium text-sm">CEO Available</p>
                  <p className="text-muted-foreground text-xs">FPO has a dedicated CEO</p>
                </div>
              </label>
            )}
          />

          <Controller
            control={control}
            name="accountant_available"
            render={({ field }) => (
              <label className="flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3">
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="h-4 w-4 cursor-pointer accent-foreground"
                />
                <div>
                  <p className="font-medium text-sm">Accountant Available</p>
                  <p className="text-muted-foreground text-xs">FPO has a dedicated accountant</p>
                </div>
              </label>
            )}
          />
        </div>
      </div>

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
