"use client";

import { useEffect, useState } from "react";

import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { ExpertForm } from "../_components/expert-form";

type T = Record<string, string>;

export default function NewExpertPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "admin_experts,common")
      .then((data) => {
        setT(data.admin_experts ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-bold text-2xl">{t.create_title ?? "Add Expert"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t.create_subtitle ?? "Add a new expert to the KAU Expert Directory."}
        </p>
      </div>
      <ExpertForm mode="create" t={t} tCommon={tCommon} />
    </div>
  );
}
