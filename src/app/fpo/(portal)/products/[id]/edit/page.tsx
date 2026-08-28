"use client";

import { useEffect, useState } from "react";

import { useParams } from "next/navigation";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { productsApi } from "@/app/fpo/_api/products";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { Product } from "@/types/fpo";
import type { PaginatedResponse } from "@/types/pagination";

import { ProductForm } from "../../_components/product-form";

type T = Record<string, string>;

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocaleStore((s) => s.locale);
  const queryClient = useQueryClient();
  const [tForm, setTForm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi.getPublic(locale, "product_form,common").then((data) => {
      setTForm(data.product_form ?? {});
      setTCommon(data.common ?? {});
    });
  }, [locale]);

  // Reuse the cached list query's data if we already have it (e.g. came
  // from the list page) — avoids a redundant loading spinner.
  const cachedList = queryClient.getQueryData<PaginatedResponse<Product>>(["products"]);
  const cachedProduct = cachedList?.data?.find((p) => p.id === Number(id));

  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: () => productsApi.getById(Number(id)),
    enabled: !!id,
    initialData: cachedProduct,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">Loading...</div>;
  }

  if (isError || !product) {
    return (
      <div className="flex items-center justify-center p-12 text-destructive text-sm">Failed to load product.</div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-3 sm:px-8 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-bold text-2xl">{tForm.edit_title ?? "Edit Product"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">{product.name.en}</p>
      </div>
      <ProductForm mode="edit" product={product} t={tForm} tCommon={tCommon} />
    </div>
  );
}
