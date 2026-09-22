"use client";

import { use, useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { cbbosApi } from "@/app/admin/_api/cbbos";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { CBBOForm } from "../../_components/cbbo-form";

type T = Record<string, string>;

export default function EditCBBOPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const locale = useLocaleStore((s) => s.locale);
  const [tForm, setTForm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});
  const { data: cbbo, isLoading } = useQuery({
    queryKey: ["cbbo", id],
    queryFn: () => cbbosApi.getById(Number(id)),
  });

  useEffect(() => {
    translationsApi
      .getPublic(locale, "cbbos_table,common")
      .then((data) => {
        setTForm(data.cbbos_table ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  if (isLoading || !cbbo) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="font-bold text-2xl">{tForm.edit_title ?? "Edit CBBO"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {(tForm.edit_description ?? "Update account details for {name}").replace(
            "{name}",
            `${cbbo.first_name} ${cbbo.last_name}`,
          )}
        </p>
      </div>
      <CBBOForm mode="edit" cbbo={cbbo} t={tForm} tCommon={tCommon} />
    </div>
  );
}
