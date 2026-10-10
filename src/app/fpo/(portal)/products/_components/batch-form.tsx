"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  cleanQuantityInput,
  isCountUnit,
  MAX_STOCK_QUANTITY,
  MAX_STOCK_QUANTITY_LABEL,
  toWholeQuantity,
} from "@/lib/validations/stock-quantity";
import type { CreateStockPayload, ProductStock, ProductUnit } from "@/types/fpo";
import { UNIT_OPTIONS } from "@/types/fpo";

type T = Record<string, string>;

function digitLimitRefinement(maxIntDigits: number, maxDecimalDigits: number, label: string) {
  return (val: string, ctx: z.RefinementCtx) => {
    if (!val) return;
    const hasDecimal = val.includes(".");
    const [intPart, decPart] = val.split(".");
    if (intPart && intPart.replace(/^0+(?=\d)/, "").length > maxIntDigits) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: hasDecimal
          ? `${label} can have at most ${maxIntDigits} digits before the decimal point`
          : `${label} can have at most ${maxIntDigits} digits`,
      });
    }
    if (decPart !== undefined && decPart.length > maxDecimalDigits) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${label} can have at most ${maxDecimalDigits} digits after the decimal point`,
      });
    }
  };
}

export const batchSchema = z
  .object({
    quantity: z
      .string()
      .min(1, { message: "Quantity is required" })
      .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
        message: "Quantity must be greater than 0",
      })
      .refine((val) => Number.isNaN(Number(val)) || Number(val) <= MAX_STOCK_QUANTITY, {
        message: `Quantity cannot exceed ${MAX_STOCK_QUANTITY_LABEL}`,
      })
      .superRefine(digitLimitRefinement(10, 2, "Quantity")),
    unit: z.enum(["kg", "quintal", "mt", "litre", "piece"]),
    price_per_unit: z
      .string()
      .min(1, { message: "Price per unit is required" })
      .superRefine(digitLimitRefinement(8, 2, "Price per unit")),
    quality_certification: z
      .string()
      .optional()
      .refine((val) => !val || val.length <= 200, {
        message: "Quality certification must be 200 characters or fewer",
      }),
    available_from: z.string().min(1, { message: "Available from date is required" }),
    available_until: z.string().optional(),
    publish_immediately: z.boolean(),
    is_public: z.boolean(),
    contact_phone: z
      .string()
      .optional()
      .refine((val) => !val || /^\d{10}$/.test(val), {
        message: "Enter a valid 10-digit phone number, or leave blank",
      }),
  })
  .refine(
    (data) => {
      if (!data.available_until) return true;
      return new Date(data.available_until) >= new Date(data.available_from);
    },
    {
      message: "Available until date must be the same as or after the Available from date",
      path: ["available_until"],
    },
  )
  .refine(
    (data) => !(data.is_public && !data.publish_immediately),
    {
      message: "A batch has to be published before it can go on the public Market Hub.",
      path: ["is_public"],
    },
  )
  // Count units (pieces) are whole numbers — no fractional quantities.
  .refine((data) => !isCountUnit(data.unit) || Number.isInteger(Number(data.quantity)), {
    message: "Quantity must be a whole number when the unit is Piece",
    path: ["quantity"],
  });

export type BatchFormValues = z.infer<typeof batchSchema>;

export const emptyBatch: BatchFormValues = {
  quantity: "",
  unit: "kg",
  price_per_unit: "",
  quality_certification: "",
  available_from: "",
  available_until: "",
  // Default a new batch to live + public — the common case is the FPO
  // wants their stock visible right away. Edit mode reads the actual
  // state from the stock via batchFromStock() instead.
  publish_immediately: true,
  is_public: true,
  contact_phone: "",
};

export function batchFromStock(stock: ProductStock): BatchFormValues {
  return {
    // Count units are whole numbers — drop the ".00" the API returns for decimal columns.
    quantity: isCountUnit(stock.unit) ? toWholeQuantity(stock.quantity ?? "") : (stock.quantity ?? ""),
    unit: stock.unit,
    price_per_unit: stock.price_per_unit ?? "",
    quality_certification: stock.quality_certification ?? "",
    available_from: stock.available_from ?? "",
    available_until: stock.available_until ?? "",
    publish_immediately: stock.status === "active",
    is_public: stock.is_public,
    contact_phone: stock.contact_phone ?? "",
  };
}

export function toCreatePayload(values: BatchFormValues): CreateStockPayload {
  return {
    quantity: values.quantity,
    unit: values.unit as ProductUnit,
    price_per_unit: values.price_per_unit,
    quality_certification: values.quality_certification ?? "",
    available_from: values.available_from,
    available_until: values.available_until || null,
    status: values.publish_immediately ? "active" : "draft",
    is_public: values.is_public,
    contact_phone: values.contact_phone ?? "",
  };
}

interface BatchFormProps {
  defaultValues?: BatchFormValues;
  onSubmit: (values: BatchFormValues) => void;
  onCancel?: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  /** Field errors returned by the API (e.g. quantity bounds) — shown under the matching inputs. */
  serverErrors?: Record<string, string[]>;
  t?: T;
  tCommon?: T;
}

/**
 * Reusable form for one ProductStock batch. Used both as the standalone
 * Add/Edit form inside the Manage Batches sheet and (indirectly, via the
 * same payload shape) as the "initial batch" fields on the Product form.
 *
 * Layout notes: fields reflow into 2 columns at `sm` so the form fits
 * comfortably inside a side-sheet (~672px wide) without feeling cramped.
 */
export function BatchForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
  isSubmitting = false,
  serverErrors,
  t = {},
  tCommon = {},
}: BatchFormProps) {
  const {
    control,
    getValues,
    handleSubmit,
    watch,
    setError,
    setValue,
    formState: { errors },
  } = useForm<BatchFormValues>({
    resolver: zodResolver(batchSchema),
    defaultValues: defaultValues ?? emptyBatch,
  });

  const publishImmediately = watch("publish_immediately");
  const availableFrom = watch("available_from");
  const selectedUnit = watch("unit");

  // Backend validation (same bounds as the schema, plus anything only the
  // server knows) lands on the matching field instead of a generic toast.
  useEffect(() => {
    if (!serverErrors) return;
    for (const [field, messages] of Object.entries(serverErrors)) {
      if (field in emptyBatch && messages[0]) {
        setError(field as keyof BatchFormValues, { type: "server", message: messages[0] });
      }
    }
  }, [serverErrors, setError]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="quantity"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="batch-quantity">
                  {t.quantity_label ?? "Quantity"} <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="batch-quantity"
                  inputMode={isCountUnit(selectedUnit) ? "numeric" : "decimal"}
                  {...field}
                  onChange={(e) => field.onChange(cleanQuantityInput(e.target.value, selectedUnit))}
                />
                {errors.quantity && <FieldError errors={[errors.quantity]} />}
              </Field>
            )}
          />
          <Controller
            control={control}
            name="unit"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="batch-unit">{t.unit_label ?? "Unit"}</FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    // Switching to a count unit drops any decimals already typed in Quantity.
                    const quantity = getValues("quantity") ?? "";
                    if (isCountUnit(value) && quantity.includes(".")) {
                      setValue("quantity", toWholeQuantity(quantity), { shouldValidate: true });
                    }
                  }}
                >
                  <SelectTrigger id="batch-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {t[`unit_${u.value}`] ?? u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
        </div>

        <Controller
          control={control}
          name="price_per_unit"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="batch-price">
                {t.price_label ?? "Price per unit (₹)"} <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="batch-price"
                inputMode="decimal"
                {...field}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
                  field.onChange(cleaned);
                }}
              />
              {errors.price_per_unit && <FieldError errors={[errors.price_per_unit]} />}
            </Field>
          )}
        />

        <Controller
          control={control}
          name="quality_certification"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="batch-quality">{t.quality_label ?? "Quality certification"}</FieldLabel>
              <Input
                id="batch-quality"
                maxLength={200}
                placeholder={t.quality_placeholder ?? "e.g. FSSAI, NPOP Organic, ISO 22000"}
                {...field}
              />
              <p className="text-xs text-muted-foreground">{(field.value?.length ?? 0)}/200</p>
              {errors.quality_certification && <FieldError errors={[errors.quality_certification]} />}
            </Field>
          )}
        />

        <Controller
          control={control}
          name="contact_phone"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="batch-phone">
                {t.contact_phone_label ?? "Seller contact phone"}
              </FieldLabel>
              <Input
                id="batch-phone"
                inputMode="numeric"
                maxLength={10}
                placeholder={t.contact_phone_placeholder ?? "10-digit mobile (optional)"}
                {...field}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
              />
              <p className="text-xs text-muted-foreground">
                {t.contact_phone_hint ??
                  "Shown to buyers as a tap-to-call link on the product card. Leave blank to route inquiries only through the Market Hub form."}
              </p>
              {errors.contact_phone && <FieldError errors={[errors.contact_phone]} />}
            </Field>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="available_from"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="batch-from">
                  {t.available_from_label ?? "Available from"} <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="batch-from"
                  type="date"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const next = e.target.value;
                    field.onChange(next);
                    // If the new 'from' falls after the current 'until',
                    // clear 'until' so the picker can't stay in an invalid
                    // state after this change.
                    const until = watch("available_until");
                    if (next && until && new Date(until) < new Date(next)) {
                      setValue("available_until", "", { shouldValidate: true });
                    }
                  }}
                />
                {errors.available_from && <FieldError errors={[errors.available_from]} />}
              </Field>
            )}
          />
          <Controller
            control={control}
            name="available_until"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="batch-until">{t.available_until_label ?? "Available until"}</FieldLabel>
                <Input
                  id="batch-until"
                  type="date"
                  {...field}
                  value={field.value ?? ""}
                  min={availableFrom || undefined}
                />
                {errors.available_until && <FieldError errors={[errors.available_until]} />}
              </Field>
            )}
          />
        </div>
      </FieldGroup>

      <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
        <Controller
          control={control}
          name="publish_immediately"
          render={({ field }) => (
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <FieldLabel className="mb-0 text-sm">
                  {t.publish_now_label ?? "Publish immediately"}
                </FieldLabel>
                <p className="text-muted-foreground text-xs">
                  {t.publish_now_hint ??
                    "Make this batch Active right away. Leave off to save as a draft and publish later."}
                </p>
              </div>
              <Switch
                checked={field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked);
                  // Turning off publish forces is_public off too — a draft
                  // batch can't be public (BE validation enforces this).
                  if (!checked) setValue("is_public", false);
                }}
              />
            </div>
          )}
        />
        <Controller
          control={control}
          name="is_public"
          render={({ field }) => (
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <FieldLabel className="mb-0 text-sm">
                  {t.public_label ?? "Visible on public Market Hub"}
                </FieldLabel>
                <p className="text-muted-foreground text-xs">
                  {t.public_hint ??
                    "Show this batch to anonymous visitors on the public Market Hub (requires publish)."}
                </p>
              </div>
              <Switch
                checked={field.value}
                disabled={!publishImmediately}
                onCheckedChange={field.onChange}
              />
            </div>
          )}
        />
        {errors.is_public && <FieldError errors={[errors.is_public]} />}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {tCommon.cancel_btn ?? "Cancel"}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : (submitLabel ?? tCommon.save_btn ?? "Save")}
        </Button>
      </div>
    </form>
  );
}
