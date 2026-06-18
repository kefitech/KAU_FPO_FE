"use client";

import { useEffect, useState } from "react";

import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { TemplateForm } from "../_components/template-form";

type T = Record<string, string>;

export default function NewTemplatePage() {
  const locale = useLocaleStore((s) => s.locale);
  const [tForm, setTForm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi.getPublic(locale, "tmpl_dialog,common").then((data) => {
      setTForm(data.tmpl_dialog ?? {});
      setTCommon(data.common ?? {});
    });
  }, [locale]);

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="font-bold text-2xl">{tForm.add_title ?? "Add Template"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {tForm.add_description ?? "Add a language version for a notification template code."}
        </p>
      </div>
      <TemplateForm mode="create" t={tForm} tCommon={tCommon} />
    </div>
  );
}
