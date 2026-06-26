"use client";

import { useEffect, useRef, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { fpoRegistrationApi } from "@/app/fpo/_api/fpo-registration";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useVoiceGuidance } from "@/hooks/use-voice-guidance";
import { type MasterDataItem, masterDataApi } from "@/lib/api/master-data";
import type { FpoProfile } from "@/types/fpo";

import { CommodityInput } from "./commodity-input";

const FIELD_LABELS: Partial<Record<string, string>> = {
  primary_commodities: "Primary Commodities",
  bank_name: "Bank Name",
  bank_branch: "Bank Branch",
  account_number: "Account Number",
  ifsc_code: "IFSC Code",
};

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigitWords(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : "");
}

function lakhsToWords(lakhs: number): string {
  const rupees = Math.round(lakhs * 100000);
  if (rupees === 0) return "";
  const crore = Math.floor(rupees / 10_000_000);
  const lakh = Math.floor((rupees % 10_000_000) / 100_000);
  const thousand = Math.floor((rupees % 100_000) / 1_000);
  const rest = rupees % 1_000;
  const hundred = Math.floor(rest / 100);
  const rem = rest % 100;
  const parts: string[] = [];
  if (crore > 0) parts.push(`${twoDigitWords(crore)} Crore`);
  if (lakh > 0) parts.push(`${twoDigitWords(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${twoDigitWords(thousand)} Thousand`);
  if (hundred > 0) parts.push(`${ONES[hundred]} Hundred`);
  if (rem > 0) parts.push(twoDigitWords(rem));
  return parts.join(" ");
}

const schema = z.object({
  primary_commodities: z.array(z.string()).min(1, { message: "Add at least one primary commodity" }),
  secondary_commodities: z.array(z.string()),
  annual_turnover: z
    .string()
    .trim()
    .min(1, { message: "Annual turnover is required" })
    .refine((v) => /^\d+(\.\d{1,3})?$/.test(v), {
      message: "Enter a valid amount (e.g. 25.50)",
    })
    .refine((v) => Number(v) > 0, {
      message: "Annual turnover must be greater than 0",
    })
    .refine((v) => Number(v) <= 9999.99, {
      message: "Amount cannot exceed 9999.99 lakhs",
    }),
  bank_name: z.string().min(1, { message: "Bank name is required" }),
  bank_branch: z.string().min(1, { message: "Branch is required" }),
  account_number: z.string().min(1, { message: "Account number is required" }),
  ifsc_code: z
    .string()
    .refine((v) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v), { message: "Enter a valid IFSC code (e.g. SBIN0001234)" }),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type FieldValidationState = Record<string, { error: string | null; duplicate: boolean }>;

interface Step4Props {
  profile: FpoProfile;
  onSave?: () => void;
  onSuccess: () => void;
  onBack: () => void;
}

export function Step4Business({ profile, onSave, onSuccess, onBack }: Step4Props) {
  const [fieldErrors, setFieldErrors] = useState<FieldValidationState>({});
  const { speak } = useVoiceGuidance();
  const [saveMode, setSaveMode] = useState<"save" | "next" | null>(null);
  const [commodities, setCommodities] = useState<MasterDataItem[]>([]);
  const [bankNames, setBankNames] = useState<MasterDataItem[]>([]);
  const [bankNamesLoaded, setBankNamesLoaded] = useState(false);

  useEffect(() => {
    masterDataApi.get("commodity").then(setCommodities);
    masterDataApi.get("bank_name").then((data) => {
      setBankNames(data);
      setBankNamesLoaded(true);
    });
  }, []);

  const {
    register,
    handleSubmit,
    control,
    getValues,
    setError,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      primary_commodities: profile.primary_commodities ?? [],
      secondary_commodities: profile.secondary_commodities ?? [],
      annual_turnover: profile.annual_turnover ?? "",
      bank_name: profile.bank_name || "",
      bank_branch: profile.bank_branch || "",
      account_number: profile.account_number || "",
      ifsc_code: profile.ifsc_code || "",
      description: profile.description || "",
    },
  });

  const turnoverValue = watch("annual_turnover");
  const speechTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (speechTimeout.current) clearTimeout(speechTimeout.current);
    const lakhs = Number(turnoverValue);
    if (!lakhs || lakhs <= 0) return;
    speechTimeout.current = setTimeout(() => {
      const words = lakhsToWords(lakhs);
      if (words) speak(`You have entered ${words} rupees`);
    }, 800);
    return () => {
      if (speechTimeout.current) clearTimeout(speechTimeout.current);
    };
  }, [turnoverValue, speak]);

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
    const firstField = Object.keys(formErrors)[0];
    if (!firstField) return;
    const label = FIELD_LABELS[firstField] ?? firstField;
    const val = getValues(firstField as keyof FormValues);
    const isEmpty = !val || (Array.isArray(val) && val.length === 0) || val === "";
    speak(isEmpty ? `You haven't filled ${label}. This is a required field.` : `Please enter a valid ${label}.`);
  }

  function handleBlurValidation(field: string) {
    const value = getValues(field as keyof FormValues) as string;
    if (!value?.trim()) return;
    validateMutation.mutate({ field, value });
  }

  const submitMutation = useMutation({
    mutationFn: (values: FormValues) =>
      fpoRegistrationApi.updateStep({
        step: 4,
        primary_commodities: values.primary_commodities,
        secondary_commodities: values.secondary_commodities,
        annual_turnover: values.annual_turnover || undefined,
        bank_name: values.bank_name,
        bank_branch: values.bank_branch,
        account_number: values.account_number,
        ifsc_code: values.ifsc_code.toUpperCase(),
        description: values.description || undefined,
      }),
    onSuccess: () => {
      toast.success("Business details saved");
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
        <h2 className="font-semibold text-lg">Business & Bank Details</h2>
        <p className="mt-0.5 text-muted-foreground text-sm">Commodities, financial overview and banking information</p>
      </div>

      {/* Commodities */}
      <div className="flex flex-col gap-4 rounded-lg border p-4">
        <p className="font-medium text-muted-foreground text-sm">Commodities</p>

        <Controller
          control={control}
          name="primary_commodities"
          render={({ field }) => (
            <Field>
              <FieldLabel>
                Primary Commodities <span className="text-destructive">*</span>
              </FieldLabel>
              <CommodityInput
                value={field.value}
                onChange={field.onChange}
                placeholder="Select a commodity…"
                options={commodities.map((c) => ({ code: c.code, name: c.name }))}
              />
              {errors.primary_commodities && (
                <p className="mt-1 text-destructive text-xs">
                  {errors.primary_commodities.message ?? (errors.primary_commodities as { message?: string }).message}
                </p>
              )}
            </Field>
          )}
        />

        <Controller
          control={control}
          name="secondary_commodities"
          render={({ field }) => (
            <Field>
              <FieldLabel>Secondary Commodities</FieldLabel>
              <CommodityInput
                value={field.value}
                onChange={field.onChange}
                placeholder="Select a commodity…"
                options={commodities.map((c) => ({ code: c.code, name: c.name }))}
              />
            </Field>
          )}
        />
      </div>

      {/* Financial */}
      <Field>
        <FieldLabel htmlFor="annual_turnover">Annual Turnover (Lakhs ₹)</FieldLabel>
        <Input
          id="annual_turnover"
          type="number"
          min={0}
          max={9999.99}
          step="0.01"
          placeholder="e.g. 25.50"
          {...register("annual_turnover")}
        />
        {errors.annual_turnover && <FieldError errors={[errors.annual_turnover]} />}
        {(() => {
          const lakhs = Number(watch("annual_turnover"));
          if (!lakhs || lakhs <= 0) return null;
          const rupees = lakhs * 100000;
          const formatted = new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          }).format(rupees);
          return (
            <p className="mt-1 text-muted-foreground text-xs">
              = {formatted} &mdash; {lakhsToWords(lakhs)}
            </p>
          );
        })()}
      </Field>

      <Field>
        <FieldLabel htmlFor="description">About the FPO</FieldLabel>
        <Textarea
          id="description"
          placeholder="Brief description of your FPO's activities and goals (optional)"
          rows={3}
          {...register("description")}
        />
      </Field>

      {/* Bank Details */}
      <div className="flex flex-col gap-4 rounded-lg border p-4">
        <p className="font-medium text-muted-foreground text-sm">Bank Details</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="bank_name">
              Bank Name <span className="text-destructive">*</span>
            </FieldLabel>
            {bankNamesLoaded ? (
              <Controller
                control={control}
                name="bank_name"
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={bankNames.map((b) => ({ value: b.code, label: b.name }))}
                    placeholder="Search bank…"
                  />
                )}
              />
            ) : (
              <Skeleton className="h-9 w-full" />
            )}
            {errors.bank_name && <FieldError errors={[errors.bank_name]} />}
          </Field>

          <Field>
            <FieldLabel htmlFor="bank_branch">
              Branch <span className="text-destructive">*</span>
            </FieldLabel>
            <Input id="bank_branch" placeholder="e.g. Irinjalakuda" {...register("bank_branch")} />
            {errors.bank_branch && <FieldError errors={[errors.bank_branch]} />}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="account_number">
              Account Number <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="account_number"
              placeholder="e.g. 123456789012"
              {...register("account_number")}
              onBlur={() => handleBlurValidation("account_number")}
            />
            {errors.account_number && <FieldError errors={[errors.account_number]} />}
            {!errors.account_number && fieldErrors.account_number?.error && (
              <p className="mt-1 text-destructive text-xs">{fieldErrors.account_number.error}</p>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="ifsc_code">
              IFSC Code <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="ifsc_code"
              placeholder="e.g. SBIN0001234"
              className="uppercase"
              {...register("ifsc_code")}
              onBlur={() => handleBlurValidation("ifsc_code")}
            />
            {errors.ifsc_code && <FieldError errors={[errors.ifsc_code]} />}
            {!errors.ifsc_code && fieldErrors.ifsc_code?.error && (
              <p className="mt-1 text-destructive text-xs">{fieldErrors.ifsc_code.error}</p>
            )}
          </Field>
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
