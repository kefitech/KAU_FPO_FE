"use client";

import { useEffect, useState } from "react";

import { useParams } from "next/navigation";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { translationApi } from "@/app/admin/_api/translation";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { Translation } from "@/types";
import type { PaginatedResponse } from "@/types/pagination";

import { TranslationForm } from "../../_components/translation-form";

type T = Record<string, string>;

export default function EditTranslationPage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocaleStore((s) => s.locale);
  const queryClient = useQueryClient();
  const [tForm, setTForm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi.getPublic(locale, "trans_dialog,common").then((data) => {
      setTForm(data.trans_dialog ?? {});
      setTCommon(data.common ?? {});
    });
  }, [locale]);

  const cachedList = queryClient.getQueryData<PaginatedResponse<Translation>>(["translations"]);
  const cachedTranslation = cachedList?.data?.find((tr) => tr.id === Number(id));

  const {
    data: translation,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["translation", id],
    queryFn: () => translationApi.getById(Number(id)),
    enabled: !!id,
    initialData: cachedTranslation,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">Loading...</div>;
  }

  if (isError || !translation) {
    return (
      <div className="flex items-center justify-center p-12 text-destructive text-sm">Failed to load translation.</div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="font-bold text-2xl">{tForm.edit_title ?? "Edit Translation"}</h1>
        <p className="mt-0.5 font-mono text-muted-foreground text-sm text-xs">{translation.full_key}</p>
      </div>
      <TranslationForm mode="edit" translation={translation} t={tForm} tCommon={tCommon} />
    </div>
  );
}
