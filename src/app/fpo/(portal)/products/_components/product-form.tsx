"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { masterDataApi } from "@/app/fpo/_api/master-data";
import { productsApi } from "@/app/fpo/_api/products";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useLocaleStore } from "@/stores/locale-store";
import type { Product, ProductUnit } from "@/types/fpo";
import { UNIT_OPTIONS } from "@/types/fpo";

type T = Record<string, string>;

const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'-]*$/;

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

const schema = z
  .object({
    name_en: z.string().min(1, { message: "Product name is required" }).regex(NAME_PATTERN, {
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
    quantity: z
      .string()
      .min(1, { message: "Quantity is required" })
      .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
        message: "Quantity must be greater than 0",
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
    is_public: z.boolean(),
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
  );

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
  quantity: "",
  unit: "kg",
  price_per_unit: "",
  quality_certification: "",
  available_from: "",
  available_until: "",
  is_public: false,
  image: null,
};

function toFormValues(p: Product): FormValues {
  return {
    name_en: p.name?.en ?? "",
    name_ml: p.name?.ml ?? "",
    commodity: String(p.commodity ?? ""),
    description_en: p.description?.en ?? "",
    description_ml: p.description?.ml ?? "",
    quantity: p.quantity ?? "",
    unit: p.unit,
    price_per_unit: p.price_per_unit ?? "",
    quality_certification: p.quality_certification ?? "",
    available_from: p.available_from ?? "",
    available_until: p.available_until ?? "",
    is_public: p.is_public ?? false,
    image: null,
  };
}

export function ProductForm({ mode, product, t = {}, tCommon = {} }: ProductFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit";
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);

  const locale = useLocaleStore((s) => s.locale);

  const { data: commodities = [], isLoading: commoditiesLoading } = useQuery({
    queryKey: ["master-data", "commodity", locale],
    queryFn: () => masterDataApi.getCommodities(locale),
    staleTime: 10 * 60_000,
  });

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: product ? toFormValues(product) : defaultValues,
  });

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
      const payload = {
        name: { en: values.name_en, ml: values.name_ml || "" },
        commodity: Number(values.commodity),
        description: {
          en: values.description_en ?? "",
          ml: values.description_ml || "",
        },
        quantity: values.quantity,
        unit: values.unit as ProductUnit,
        price_per_unit: values.price_per_unit,
        quality_certification: values.quality_certification ?? "",
        available_from: values.available_from,
        available_until: values.available_until || null,
        is_public: values.is_public,
        image: values.image ?? (imageRemoved ? null : undefined),
      };
      if (isEdit && product) {
        return productsApi.update(product.id, payload);
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
                      <Select value={field.value} onValueChange={field.onChange} disabled={commoditiesLoading}>
                        <SelectTrigger id="product-commodity">
                          <SelectValue
                            placeholder={
                              commoditiesLoading
                                ? (t.commodity_loading ?? "Loading...")
                                : (t.commodity_placeholder ?? "Select a commodity")
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {commodities.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <p className="text-xs text-muted-foreground">{(field.value?.length ?? 0)}/2000</p>
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
                      <p className="text-xs text-muted-foreground">{(field.value?.length ?? 0)}/2000</p>
                      {errors.description_ml && <FieldError errors={[errors.description_ml]} />}
                    </Field>
                  )}
                />
              </div>

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
                        inputMode="decimal"
                        {...field}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
                          field.onChange(cleaned);
                        }}
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
                      <Select value={field.value} onValueChange={field.onChange}>
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
                    <FieldLabel htmlFor="product-quality">{t.quality_label ?? "Quality certification"}</FieldLabel>
                    <Input
                      id="product-quality"
                      maxLength={200}
                      placeholder={t.quality_placeholder ?? "e.g. FSSAI, NPOP Organic, ISO 22000"}
                      {...field}
                    />
                    <p className="text-xs text-muted-foreground">
                      {(field.value?.length ?? 0)}/200
                    </p>
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
                      <Input id="product-from" type="date" {...field} />
                      {errors.available_from && <FieldError errors={[errors.available_from]} />}
                    </Field>
                  )}
                />
                <Controller
                  control={control}
                  name="available_until"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="product-until">{t.available_until_label ?? "Available until"}</FieldLabel>
                      <Input id="product-until" type="date" {...field} />
                      {errors.available_until && <FieldError errors={[errors.available_until]} />}
                    </Field>
                  )}
                />
              </div>
            </FieldGroup>

            <div className="border-t pt-5">
              <Controller
                control={control}
                name="is_public"
                render={({ field }) => (
                  <div className="flex max-w-sm items-center justify-between rounded-lg border p-3">
                    <FieldLabel className="mb-0 text-sm">{t.public_label ?? "Visible on public Market Hub"}</FieldLabel>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </div>
                )}
              />
            </div>

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
    </div>
  );
}
