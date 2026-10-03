"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { ProductForm } from "../_components/product-form";

type T = Record<string, string>;

export default function NewProductPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [tForm, setTForm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi.getPublic(locale, "product_form,common").then((data) => {
      setTForm(data.product_form ?? {});
      setTCommon(data.common ?? {});
    });
  }, [locale]);

  return (
    <div className="flex flex-col gap-6 px-3 sm:px-8 py-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit text-muted-foreground">
          <Link href="/fpo/products">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {tCommon.back_btn ?? tForm.back_btn ?? "Back to Products"}
          </Link>
        </Button>
        <div>
          <h1 className="font-bold text-2xl">{tForm.add_title ?? "Add Product"}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {tForm.add_description ?? "List a new product for buyers to discover."}
          </p>
        </div>
      </div>
      <ProductForm mode="create" t={tForm} tCommon={tCommon} />
    </div>
  );
}
