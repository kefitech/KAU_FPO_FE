"use client";

import { useEffect, useState } from "react";

import { useParams } from "next/navigation";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { notificationTemplateCodeApi } from "@/app/admin/_api/notification-template-code";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { NotificationTemplateCode } from "@/types";
import type { PaginatedResponse } from "@/types/pagination";

import { TemplateCodeForm } from "../../_components/template-code-form";

type T = Record<string, string>;

export default function EditTemplateCodePage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocaleStore((s) => s.locale);
  const queryClient = useQueryClient();
  const [tForm, setTForm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi.getPublic(locale, "tmpl_code_dialog,common").then((data) => {
      setTForm(data.tmpl_code_dialog ?? {});
      setTCommon(data.common ?? {});
    });
  }, [locale]);

  const cachedList = queryClient.getQueryData<PaginatedResponse<NotificationTemplateCode>>([
    "notification-template-codes",
  ]);
  const cachedItem = cachedList?.data?.find((c) => c.id === Number(id));

  const {
    data: templateCode,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["notification-template-code", id],
    queryFn: () => notificationTemplateCodeApi.getById(Number(id)),
    enabled: !!id,
    initialData: cachedItem,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">Loading...</div>;
  }

  if (isError || !templateCode) {
    return (
      <div className="flex items-center justify-center p-12 text-destructive text-sm">
        Failed to load template code.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="font-bold text-2xl">{tForm.edit_title ?? "Edit Template Code"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">{templateCode.name}</p>
      </div>
      <TemplateCodeForm mode="edit" templateCode={templateCode} t={tForm} tCommon={tCommon} />
    </div>
  );
}
