"use client";

import { use, useEffect, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { adminSchemesApi } from "@/app/admin/_api/schemes";
import { Skeleton } from "@/components/ui/skeleton";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { AdminScheme } from "@/types/admin";
import type { PaginatedResponse } from "@/types/pagination";

import { SchemeForm } from "../../_components/scheme-form";

type T = Record<string, string>;

export default function EditSchemePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
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

  const cachedList = queryClient.getQueryData<PaginatedResponse<AdminScheme>>(["schemes"]);
  const cachedScheme = cachedList?.data?.find((s) => s.id === Number(id));

  const { data: scheme, isLoading } = useQuery({
    queryKey: ["scheme", id],
    queryFn: () => adminSchemesApi.getById(Number(id)),
    enabled: !!id,
    initialData: cachedScheme,
  });

  if (isLoading && !scheme) {
    return (
      <div className="flex flex-col gap-6 px-8 py-6">
        <div className="mx-auto w-full max-w-3xl">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="mx-auto w-full max-w-3xl">
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-bold text-2xl">{t.edit_title ?? "Edit Scheme"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">{t.edit_subtitle ?? "Update the details for this scheme."}</p>
      </div>
      <SchemeForm mode="edit" scheme={scheme} t={t} tCommon={tCommon} />
    </div>
  );
}
