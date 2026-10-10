"use client";

import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, X } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { masterDataApi } from "@/app/fpo/_api/master-data";
import { productsApi } from "@/app/fpo/_api/products";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  cleanQuantityInput,
  isCountUnit,
  MAX_STOCK_QUANTITY,
  MAX_STOCK_QUANTITY_LABEL,
  toWholeQuantity,
} from "@/lib/validations/stock-quantity";
import { useLocaleStore } from "@/stores/locale-store";
import type { CreateProductPayload, Product, ProductUnit } from "@/types/fpo";
import { UNIT_OPTIONS } from "@/types/fpo";

import { ManageBatchesSheet } from "./manage-batches-sheet";

type T = Record<string, string>;

const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'-]*$/;

function digitLimitRefinement(maxIntDigits: number, maxDecimalDigits: number, label: string, path: string[] = []) {
  return (val: string, ctx: z.RefinementCtx) => {
    if (!val) return;
    const hasDecimal = val.includes(".");
    const [intPart, decPart] = val.split(".");
    if (intPart && intPart.replace(/^0+(?=\d)/, "").length > maxIntDigits) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: hasDecimal
          ? `${label} can have at most ${maxIntDigits} digits before the decimal point`
          : `${label} can have at most ${maxIntDigits} digits`,
      });
    }
    if (decPart !== undefined && decPart.length > maxDecimalDigits) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: `${label} can have at most ${maxDecimalDigits} digits after the decimal point`,
      });
    }
  };
}

/**
 * Zod schema for the Product form. Product-master fields (name, commodity,
 * description, image) are always required. The initial-batch fields are
 * conditionally required when `include_initial_batch` is true — the FPO can
 * tick the "Add initial batch now" switch on create to seed the first
 * ProductStock in the same request. On edit mode the switch is hidden and
 * batches are managed through the Manage Batches sheet.
 */
const schema = z
  .object({
    // Product master
    name_en: z
      .string()
      .min(1, { message: "Product name is required" })
      .regex(NAME_PATTERN, {
        message: "Name must start with a letter and contain only letters, spaces, apostrophes, or hyphens",
      }),
    name_ml: z.string().optional(),
    commodity: z.string().min(1, { message: "Commodity is required" }),
    description_en: z
      .string()
      .min(1, { message: "Description is required" })
      .max(2000, { message: "Description must be 2000 characters or fewer" }),
    description_ml: z
      .string()
      .optional()
      .refine((val) => !val || val.length <= 2000, {
        message: "Description must be 2000 characters or fewer",
      }),
    image: z
      .instanceof(File)
      .optional()
      .nullable()
      .refine((file) => !file || file.size <= 5 * 1024 * 1024, {
        message: "Image must be smaller than 5MB",
      })
      .refine((file) => !file || file.type.startsWith("image/"), {
        message: "File must be an image",
      }),
    // First-batch seed — only required when include_initial_batch is true
    include_initial_batch: z.boolean(),
    quantity: z.string().optional(),
    unit: z.enum(["kg", "quintal", "mt", "litre", "piece"]).optional(),
    price_per_unit: z.string().optional(),
    quality_certification: z
      .string()
      .optional()
      .refine((val) => !val || val.length <= 200, {
        message: "Quality certification must be 200 characters or fewer",
      }),
    available_from: z.string().optional(),
    available_until: z.string().optional(),
    publish_immediately: z.boolean(),
    is_public: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.include_initial_batch) return;
    // Batch fields become required
    if (!data.quantity) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["quantity"], message: "Quantity is required" });
    } else {
      const n = Number(data.quantity);
      if (Number.isNaN(n) || n <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["quantity"],
          message: "Quantity must be greater than 0",
        });
      } else if (n > MAX_STOCK_QUANTITY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["quantity"],
          message: `Quantity cannot exceed ${MAX_STOCK_QUANTITY_LABEL}`,
        });
      }
      // Count units (pieces) are whole numbers — no fractional quantities.
      if (isCountUnit(data.unit) && !Number.isInteger(n)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["quantity"],
          message: "Quantity must be a whole number when the unit is Piece",
        });
      }
      digitLimitRefinement(10, 2, "Quantity", ["quantity"])(data.quantity, ctx);
    }
    if (!data.unit) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["unit"], message: "Unit is required" });
    }
    if (!data.price_per_unit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price_per_unit"],
        message: "Price per unit is required",
      });
    } else {
      digitLimitRefinement(8, 2, "Price per unit", ["price_per_unit"])(data.price_per_unit, ctx);
    }
    if (!data.available_from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["available_from"],
        message: "Available from date is required",
      });
    }
    if (
      data.available_from &&
      data.available_until &&
      new Date(data.available_until) < new Date(data.available_from)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["available_until"],
        message: "Available until date must be the same as or after the Available from date",
      });
    }
    // Public requires published — same rule the BE enforces.
    if (data.is_public && !data.publish_immediately) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["is_public"],
        message: "A batch has to be published before it can go on the public Market Hub.",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

interface ProductFormProps {
  mode: "create" | "edit";
  product?: Product;
  t?: T;
  tCommon?: T;
}

const defaultValues: FormValues = {
  name_en: "",
  name_ml: "",
  commodity: "",
  description_en: "",
  description_ml: "",
  image: null,
  include_initial_batch: false,
  quantity: "",
  unit: "kg",
  price_per_unit: "",
  quality_certification: "",
  available_from: "",
  available_until: "",
  // Default the initial batch to publish + public — the common case is
  // the FPO wants their first batch live right away. The toggles are
  // still visible so they can opt out before saving.
  publish_immediately: true,
  is_public: true,
};

function toFormValues(p: Product): FormValues {
  // Edit mode never seeds the initial-batch fields — they're read-only in
  // this form and managed through the Manage Batches sheet.
  return {
    name_en: p.name?.en ?? "",
    name_ml: p.name?.ml ?? "",
    commodity: String(p.commodity ?? ""),
    description_en: p.description?.en ?? "",
    description_ml: p.description?.ml ?? "",
    image: null,
    include_initial_batch: false,
    quantity: "",
    unit: "kg",
    price_per_unit: "",
    quality_certification: "",
    available_from: "",
    available_until: "",
    publish_immediately: false,
    is_public: false,
  };
}

export function ProductForm({ mode, product, t = {}, tCommon = {} }: ProductFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit";
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(product?.image ?? null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [batchesOpen, setBatchesOpen] = useState(false);

  const locale = useLocaleStore((s) => s.locale);

  const { data: commodities = [], isLoading: commoditiesLoading } = useQuery({
    queryKey: ["master-data", "commodity", locale],
    queryFn: () => masterDataApi.getCommodities(locale),
    staleTime: 10 * 60_000,
  });
  // The commodity picker stores the id (as a string) but searches and shows names.
  const commodityNames = useMemo(() => new Map(commodities.map((c) => [String(c.id), c.name])), [commodities]);
  const commodityIds = useMemo(() => [...commodityNames.keys()], [commodityNames]);

  const {
    control,
    getValues,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: product ? toFormValues(product) : defaultValues,
  });

  const includeInitialBatch = watch("include_initial_batch");
  const selectedUnit = watch("unit");

  useEffect(() => {
    if (product) {
      reset(toFormValues(product));
      setExistingImageUrl(product.image ?? null);
      setSelectedFileName(null);
      setImageRemoved(false);
    }
  }, [product?.id, reset, product]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: CreateProductPayload = {
        name: { en: values.name_en, ml: values.name_ml || "" },
        commodity: Number(values.commodity),
        description: {
          en: values.description_en ?? "",
          ml: values.description_ml || "",
        },
        image: values.image ?? (imageRemoved ? null : undefined),
      };
      // First-batch seed is only sent on create when the FPO opted in.
      if (!isEdit && values.include_initial_batch) {
        payload.quantity = values.quantity;
        payload.unit = values.unit as ProductUnit;
        payload.price_per_unit = values.price_per_unit;
        payload.quality_certification = values.quality_certification ?? "";
        payload.available_from = values.available_from;
        payload.available_until = values.available_until || null;
        payload.status = values.publish_immediately ? "active" : "draft";
        payload.is_public = values.is_public;
      }
      if (isEdit && product) {
        // Stock fields are intentionally omitted on PATCH — the backend
        // ignores them anyway; batch edits go through productStocksApi.
        return productsApi.update(product.id, {
          name: payload.name,
          commodity: payload.commodity,
          description: payload.description,
          image: payload.image,
        });
      }
      return productsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(
        isEdit
          ? (t.toast_updated ?? "Product updated successfully")
          : (t.toast_created ?? "Product added successfully"),
      );
      queryClient.invalidateQueries({ queryKey: ["products"] });
      router.push("/fpo/products");
    },
    onError: (err: unknown) => {
      const apiErr = err as
        | { data?: { message?: string; errors?: Record<string, string[]> }; message?: string }
        | undefined;
      const serverErrors = apiErr?.data?.errors;
      if (serverErrors && Object.keys(serverErrors).length > 0) {
        Object.entries(serverErrors).forEach(([field, messages]) => {
          if (field in defaultValues) {
            setError(field as keyof FormValues, { type: "server", message: messages[0] });
          }
        });
      } else {
        toast.error(
          apiErr?.data?.message ?? apiErr?.message ?? (isEdit ? "Failed to update product" : "Failed to add product"),
        );
      }
    },
  });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.section_details ?? "Product Details"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-6">
            <FieldGroup>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  control={control}
                  name="name_en"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="product-name-en">
                        {t.name_en_label ?? "Name (English)"} <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        id="product-name-en"
                        placeholder={t.name_en_placeholder ?? "e.g. Organic Coconut"}
                        {...field}
                      />
                      {errors.name_en && <FieldError errors={[errors.name_en]} />}
                    </Field>
                  )}
                />
                <Controller
                  control={control}
                  name="name_ml"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="product-name-ml">{t.name_ml_label ?? "Name (Malayalam)"}</FieldLabel>
                      <Input
                        id="product-name-ml"
                        placeholder={t.name_ml_placeholder ?? "Optional — falls back to English"}
                        {...field}
                      />
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  control={control}
                  name="commodity"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="product-commodity">
                        {t.commodity_label ?? "Commodity"} <span className="text-destructive">*</span>
                      </FieldLabel>
                      {/* Remounted once names load so an existing product's commodity shows its name */}
                      <Combobox
                        key={commoditiesLoading ? "loading" : "ready"}
                        items={commodityIds}
                        itemToStringLabel={(id: string) => commodityNames.get(id) ?? ""}
                        value={field.value || null}
                        onValueChange={(id) => field.onChange(id ?? "")}
                        disabled={commoditiesLoading}
                      >
                        <ComboboxInput
                          id="product-commodity"
                          placeholder={
                            commoditiesLoading
                              ? (t.commodity_loading ?? "Loading...")
                              : (t.commodity_placeholder ?? "Select a commodity")
                          }
                          disabled={commoditiesLoading}
                          className="w-full"
                        />
                        <ComboboxContent>
                          <ComboboxEmpty>{t.commodity_empty ?? "No commodity found"}</ComboboxEmpty>
                          <ComboboxList>
                            {(id: string) => (
                              <ComboboxItem key={id} value={id}>
                                {commodityNames.get(id)}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                      {errors.commodity && <FieldError errors={[errors.commodity]} />}
                    </Field>
                  )}
                />
                <Controller
                  control={control}
                  name="image"
                  render={({ field: { onChange, value: _value, ...field } }) => {
                    const existingFileName = existingImageUrl
                      ? decodeURIComponent(existingImageUrl.split("/").pop()?.split("?")[0] ?? "")
                      : null;
                    const displayName = selectedFileName ?? existingFileName;
                    return (
                      <Field>
                        <FieldLabel htmlFor="product-image">{t.image_label ?? "Product Image"}</FieldLabel>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              readOnly
                              tabIndex={-1}
                              placeholder={t.image_placeholder ?? "No file chosen"}
                              value={displayName ?? ""}
                              onClick={() => document.getElementById("product-image")?.click()}
                              onFocus={(e) => e.target.blur()}
                              className="cursor-pointer select-none caret-transparent pr-8"
                            />
                            {displayName && (
                              <button
                                type="button"
                                aria-label={t.image_remove_btn ?? "Remove image"}
                                onClick={() => {
                                  onChange(null);
                                  setSelectedFileName(null);
                                  setExistingImageUrl(null);
                                  setImageRemoved(true);
                                  const input = document.getElementById("product-image") as HTMLInputElement | null;
                                  if (input) input.value = "";
                                }}
                                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById("product-image")?.click()}
                          >
                            {t.image_choose_btn ?? "Choose File"}
                          </Button>
                        </div>
                        <input
                          id="product-image"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            onChange(file);
                            setSelectedFileName(file?.name ?? null);
                            setImageRemoved(false);
                          }}
                          {...field}
                        />
                        {errors.image && <FieldError errors={[errors.image]} />}
                      </Field>
                    );
                  }}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  control={control}
                  name="description_en"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="product-desc-en">
                        {t.description_en_label ?? "Description (English)"} <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Textarea
                        id="product-desc-en"
                        rows={4}
                        maxLength={2000}
                        className="max-h-40 resize-none overflow-y-auto"
                        {...field}
                      />
                      <p className="text-xs text-muted-foreground">{field.value?.length ?? 0}/2000</p>
                      {errors.description_en && <FieldError errors={[errors.description_en]} />}
                    </Field>
                  )}
                />
                <Controller
                  control={control}
                  name="description_ml"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="product-desc-ml">
                        {t.description_ml_label ?? "Description (Malayalam)"}
                      </FieldLabel>
                      <Textarea
                        id="product-desc-ml"
                        rows={4}
                        maxLength={2000}
                        className="max-h-40 resize-none overflow-y-auto"
                        {...field}
                      />
                      <p className="text-xs text-muted-foreground">{field.value?.length ?? 0}/2000</p>
                      {errors.description_ml && <FieldError errors={[errors.description_ml]} />}
                    </Field>
                  )}
                />
              </div>
            </FieldGroup>

            {/* Initial-batch section — create mode only. Edit mode gets a
                "Manage Batches" button instead, since stock edits don't
                flow through the product endpoint anymore. */}
            {isEdit ? (
              <div className="rounded-lg border border-dashed p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-sm">{t.batches_card_title ?? "Stock Batches"}</p>
                    <p className="text-muted-foreground text-sm">
                      {t.batches_card_description ??
                        "A product can have multiple stock batches live at once. Add, edit, publish, or mark batches sold from the Manage Batches panel."}
                    </p>
                    {product && (
                      <p className="text-muted-foreground text-xs">
                        {product.stocks.length === 0
                          ? (t.no_batches ?? "No batches yet")
                          : `${product.stocks.length} ${product.stocks.length === 1 ? (t.batch_singular ?? "batch") : (t.batch_plural ?? "batches")}`}
                      </p>
                    )}
                  </div>
                  {product && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setBatchesOpen(true)}>
                      <Layers className="mr-1.5 h-4 w-4" />
                      {t.manage_batches_btn ?? "Manage Batches"}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 rounded-lg border p-4">
                <Controller
                  control={control}
                  name="include_initial_batch"
                  render={({ field }) => (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-0.5">
                        <FieldLabel className="mb-0 text-sm">
                          {t.initial_batch_toggle ?? "Add an initial stock batch now"}
                        </FieldLabel>
                        <p className="text-muted-foreground text-xs">
                          {t.initial_batch_hint ??
                            "You can also create the product first and add batches later from Manage Batches."}
                        </p>
                      </div>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />

                {includeInitialBatch && (
                  <FieldGroup>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Controller
                        control={control}
                        name="quantity"
                        render={({ field }) => (
                          <Field>
                            <FieldLabel htmlFor="product-quantity">
                              {t.quantity_label ?? "Quantity"} <span className="text-destructive">*</span>
                            </FieldLabel>
                            <Input
                              id="product-quantity"
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
                            <FieldLabel htmlFor="product-unit">{t.unit_label ?? "Unit"}</FieldLabel>
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
                              <SelectTrigger id="product-unit">
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
                      <Controller
                        control={control}
                        name="price_per_unit"
                        render={({ field }) => (
                          <Field>
                            <FieldLabel htmlFor="product-price">
                              {t.price_label ?? "Price per unit (₹)"} <span className="text-destructive">*</span>
                            </FieldLabel>
                            <Input
                              id="product-price"
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
                    </div>

                    <Controller
                      control={control}
                      name="quality_certification"
                      render={({ field }) => (
                        <Field>
                          <FieldLabel htmlFor="product-quality">
                            {t.quality_label ?? "Quality certification"}
                          </FieldLabel>
                          <Input
                            id="product-quality"
                            maxLength={200}
                            placeholder={t.quality_placeholder ?? "e.g. FSSAI, NPOP Organic, ISO 22000"}
                            {...field}
                          />
                          <p className="text-xs text-muted-foreground">{field.value?.length ?? 0}/200</p>
                          {errors.quality_certification && <FieldError errors={[errors.quality_certification]} />}
                        </Field>
                      )}
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Controller
                        control={control}
                        name="available_from"
                        render={({ field }) => (
                          <Field>
                            <FieldLabel htmlFor="product-from">
                              {t.available_from_label ?? "Available from"} <span className="text-destructive">*</span>
                            </FieldLabel>
                            <Input
                              id="product-from"
                              type="date"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const next = e.target.value;
                                field.onChange(next);
                                // Keep 'until' consistent with the new 'from'.
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
                            <FieldLabel htmlFor="product-until">
                              {t.available_until_label ?? "Available until"}
                            </FieldLabel>
                            <Input
                              id="product-until"
                              type="date"
                              {...field}
                              value={field.value ?? ""}
                              min={watch("available_from") || undefined}
                            />
                            {errors.available_until && <FieldError errors={[errors.available_until]} />}
                          </Field>
                        )}
                      />
                    </div>

                    {/* Publish + public toggles — same shape as the BatchForm
                        shown inside the Manage Batches sheet, so the create
                        flow is consistent whether the FPO ticks "Add initial
                        batch" here or adds it later. */}
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
                              disabled={!watch("publish_immediately")}
                              onCheckedChange={field.onChange}
                            />
                          </div>
                        )}
                      />
                      {errors.is_public && <FieldError errors={[errors.is_public]} />}
                    </div>
                  </FieldGroup>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.push("/fpo/products")}>
                {tCommon.cancel_btn ?? "Cancel"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  reset(product ? toFormValues(product) : defaultValues);
                  setSelectedFileName(null);
                  setExistingImageUrl(product?.image ?? null);
                  const input = document.getElementById("product-image") as HTMLInputElement | null;
                  if (input) input.value = "";
                }}
              >
                {tCommon.reset_btn ?? "Reset"}
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : (tCommon.save_btn ?? "Save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {product && (
        <ManageBatchesSheet
          product={product}
          open={batchesOpen}
          onOpenChange={setBatchesOpen}
          t={t}
          tCommon={tCommon}
        />
      )}
    </div>
  );
}
