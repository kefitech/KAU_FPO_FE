"use client";

import { useEffect, useState } from "react";

import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { SchemeForm } from "../_components/scheme-form";

type T = Record<string, string>;

export default function NewSchemePage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "admin_schemes,common")
      .then((data) => {
        setT(data.admin_schemes ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-bold text-2xl">{t.create_title ?? "Add Scheme"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.create_subtitle ?? "Create a new government scheme entry for FPOs to browse."}
        </p>
      </div>
      <SchemeForm mode="create" t={t} tCommon={tCommon} />
    </div>
  );
}
