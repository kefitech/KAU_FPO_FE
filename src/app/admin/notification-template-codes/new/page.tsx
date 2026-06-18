"use client";

import { useEffect, useState } from "react";

import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { TemplateCodeForm } from "../_components/template-code-form";

type T = Record<string, string>;

export default function NewTemplateCodePage() {
  const locale = useLocaleStore((s) => s.locale);
  const [tForm, setTForm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi.getPublic(locale, "tmpl_code_dialog,common").then((data) => {
      setTForm(data.tmpl_code_dialog ?? {});
      setTCommon(data.common ?? {});
    });
  }, [locale]);

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="font-bold text-2xl">{tForm.add_title ?? "Add Template Code"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {tForm.add_description ?? "Define a new notification event and its delivery channel."}
        </p>
      </div>
      <TemplateCodeForm mode="create" t={tForm} tCommon={tCommon} />
    </div>
  );
}
