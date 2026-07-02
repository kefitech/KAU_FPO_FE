"use client";

import { useEffect, useState } from "react";

import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { FaqForm } from "../_components/faq-form";

type T = Record<string, string>;

export default function NewFaqPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "admin_faqs,common")
      .then((data) => {
        setT(data.admin_faqs ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="mx-auto max-w-3xl w-full">
        <h1 className="font-bold text-2xl">{t.create_title ?? "Add FAQ"}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {t.create_subtitle ?? "Create a new frequently asked question for the landing page."}
        </p>
      </div>
      <FaqForm mode="create" t={t} tCommon={tCommon} />
    </div>
  );
}
