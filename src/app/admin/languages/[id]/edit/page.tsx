"use client";

import { useEffect, useState } from "react";

import { useParams } from "next/navigation";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { languageApi } from "@/app/admin/_api/language";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { Language } from "@/types";
import type { PaginatedResponse } from "@/types/pagination";

import { LanguageForm } from "../../_components/language-form";

type T = Record<string, string>;

export default function EditLanguagePage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocaleStore((s) => s.locale);
  const queryClient = useQueryClient();
  const [tForm, setTForm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi.getPublic(locale, "lang_dialog,common").then((data) => {
      setTForm(data.lang_dialog ?? {});
      setTCommon(data.common ?? {});
    });
  }, [locale]);

  const cachedList = queryClient.getQueryData<PaginatedResponse<Language>>(["languages"]);
  const cachedLanguage = cachedList?.data?.find((l) => l.id === Number(id));

  const {
    data: language,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["language", id],
    queryFn: () => languageApi.getById(Number(id)),
    enabled: !!id,
    initialData: cachedLanguage,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">Loading...</div>;
  }

  if (isError || !language) {
    return (
      <div className="flex items-center justify-center p-12 text-destructive text-sm">Failed to load language.</div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-bold text-2xl">{tForm.edit_title ?? "Edit Language"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">{language.name}</p>
      </div>
      <LanguageForm mode="edit" language={language} t={tForm} tCommon={tCommon} />
    </div>
  );
}
