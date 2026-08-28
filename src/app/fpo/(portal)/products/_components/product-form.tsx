"use client";

import { useEffect } from "react";

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
import type { Product, ProductUnit } from "@/types/fpo";
import { UNIT_OPTIONS } from "@/types/fpo";

type T = Record<string, string>;

// commodity now uses a real dropdown of MasterLookup(category='commodity')
// entries, fetched via /api/public/master-data/?category=commodity.
const schema = z.object({
  name_en: z.string().min(1, { message: "Product name is required" }),
  name_ml: z.string().optional(),
  commodity: z.string().min(1, { message: "Commodity is required" }),
  description_en: z.string().min(1, { message: "Description is required" }),
  description_ml: z.string().optional(),
  quantity: z.string().min(1, { message: "Quantity is required" }),
  unit: z.enum(["kg", "quintal", "mt", "litre", "piece"]),
  price_per_unit: z.string().min(1, { message: "Price per unit is required" }),
  quality_certification: z.string().optional(),
  available_from: z.string().min(1, { message: "Available from date is required" }),
  available_until: z.string().optional(),
  is_public: z.boolean(),
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
  quantity: "",
  unit: "kg",
  price_per_unit: "",
  quality_certification: "",
  available_from: "",
  available_until: "",
  is_public: false,
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
  };
}

export function ProductForm({ mode, product, t = {}, tCommon = {} }: ProductFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit";

  const { data: commodities = [], isLoading: commoditiesLoading } = useQuery({
    queryKey: ["master-data", "commodity"],
    queryFn: masterDataApi.getCommodities,
    staleTime: 10 * 60_000, // rarely changes — cache for 10 minutes
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
    if (product) reset(toFormValues(product));
  }, [product?.id, reset, product]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        name: { en: values.name_en, ml: values.name_ml || values.name_en },
        commodity: Number(values.commodity),
        description: {
          en: values.description_en ?? "",
          ml: values.description_ml || values.description_en || "",
        },
        quantity: values.quantity,
        unit: values.unit as ProductUnit,
        price_per_unit: values.price_per_unit,
        quality_certification: values.quality_certification ?? "",
        available_from: values.available_from,
        available_until: values.available_until || null,
        is_public: values.is_public,
      };
      return isEdit ? productsApi.update(product!.id, payload) : productsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(
        isEdit
          ? (t.toast_updated ?? "Product updated successfully")
          : (t.toast_created ?? "Product added successfully"),
      );
      queryClient.invalidateQueries({ queryKey: ["products"] });
      if (!isEdit) router.push("/fpo/products");
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <Controller
                control={control}
                name="commodity"
                render={({ field }) => (
                  <Field className="max-w-xs">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Controller
                  control={control}
                  name="description_en"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="product-desc-en">
                        {t.description_en_label ?? "Description (English)"} <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Textarea id="product-desc-en" rows={2} {...field} />
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
                      <Textarea id="product-desc-ml" rows={2} {...field} />
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Controller
                  control={control}
                  name="quantity"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="product-quantity">
                        {t.quantity_label ?? "Quantity"} <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input id="product-quantity" inputMode="decimal" {...field} />
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
                              {u.label}
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
                      <Input id="product-price" inputMode="decimal" {...field} />
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
                      placeholder={t.quality_placeholder ?? "e.g. FSSAI, NPOP Organic, ISO 22000"}
                      {...field}
                    />
                  </Field>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                onClick={() => reset(product ? toFormValues(product) : defaultValues)}
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
