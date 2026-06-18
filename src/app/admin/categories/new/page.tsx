"use client";

import { useEffect, useState } from "react";

import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { CategoryForm } from "../_components/category-form";

type T = Record<string, string>;

export default function NewCategoryPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [tForm, setTForm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi.getPublic(locale, "cat_dialog,common").then((data) => {
      setTForm(data.cat_dialog ?? {});
      setTCommon(data.common ?? {});
    });
  }, [locale]);

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-lg">
        <h1 className="font-bold text-2xl">{tForm.add_title ?? "Add Category"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {tForm.add_description ?? "Create a new translation category."}
        </p>
      </div>
      <CategoryForm mode="create" t={tForm} tCommon={tCommon} />
    </div>
  );
}
