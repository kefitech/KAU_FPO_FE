"use client";

import { useEffect, useState } from "react";

import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { TranslationForm } from "../_components/translation-form";

type T = Record<string, string>;

export default function NewTranslationPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [tForm, setTForm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi.getPublic(locale, "trans_dialog,common").then((data) => {
      setTForm(data.trans_dialog ?? {});
      setTCommon(data.common ?? {});
    });
  }, [locale]);

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="font-bold text-2xl">{tForm.add_title ?? "Add Translation"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {tForm.add_description ?? "Add a new translation key and value."}
        </p>
      </div>
      <TranslationForm mode="create" t={tForm} tCommon={tCommon} />
    </div>
  );
}
