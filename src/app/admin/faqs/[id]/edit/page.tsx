"use client";

import { use, useEffect, useState } from "react";

import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { FaqForm } from "../../_components/faq-form";

type T = Record<string, string>;

export default function EditFaqPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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
        <h1 className="font-bold text-2xl">{t.edit_title ?? "Edit FAQ"}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {t.edit_subtitle ?? "Update the FAQ details."}
        </p>
      </div>
      <FaqForm mode="edit" id={Number(id)} t={t} tCommon={tCommon} />
    </div>
  );
}
