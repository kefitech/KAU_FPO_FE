"use client";

import { useEffect, useState } from "react";

import { useParams } from "next/navigation";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { translationCategoryApi } from "@/app/admin/_api/translation-category";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { TranslationCategory } from "@/types";
import type { PaginatedResponse } from "@/types/pagination";

import { CategoryForm } from "../../_components/category-form";

type T = Record<string, string>;

export default function EditCategoryPage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocaleStore((s) => s.locale);
  const queryClient = useQueryClient();
  const [tForm, setTForm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi.getPublic(locale, "cat_dialog,common").then((data) => {
      setTForm(data.cat_dialog ?? {});
      setTCommon(data.common ?? {});
    });
  }, [locale]);

  const cachedList = queryClient.getQueryData<PaginatedResponse<TranslationCategory>>(["translation-categories"]);
  const cachedCategory = cachedList?.data?.find((c) => c.id === Number(id));

  const {
    data: category,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["category", id],
    queryFn: () => translationCategoryApi.getById(Number(id)),
    enabled: !!id,
    initialData: cachedCategory,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">Loading...</div>;
  }

  if (isError || !category) {
    return (
      <div className="flex items-center justify-center p-12 text-destructive text-sm">Failed to load category.</div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-lg">
        <h1 className="font-bold text-2xl">{tForm.edit_title ?? "Edit Category"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">{category.name}</p>
      </div>
      <CategoryForm mode="edit" category={category} t={tForm} tCommon={tCommon} />
    </div>
  );
}
