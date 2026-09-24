"use client";

import { useEffect, useState } from "react";

import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { CBBOForm } from "../_components/cbbo-form";

type T = Record<string, string>;

export default function NewCBBOPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [tForm, setTForm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "cbbos_table,common")
      .then((data) => {
        setTForm(data.cbbos_table ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="font-bold text-2xl">{tForm.add_title ?? "Add CBBO"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {tForm.add_description ?? "Create a new CBBO/NGO account and assign their jurisdiction"}
        </p>
      </div>
      <CBBOForm mode="create" t={tForm} tCommon={tCommon} />
    </div>
  );
}
