"use client";

import { useEffect, useState } from "react";

import { useParams } from "next/navigation";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { notificationTemplateApi } from "@/app/admin/_api/notification-template";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { NotificationTemplate } from "@/types";
import type { PaginatedResponse } from "@/types/pagination";

import { TemplateForm } from "../../_components/template-form";

type T = Record<string, string>;

export default function EditTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocaleStore((s) => s.locale);
  const queryClient = useQueryClient();
  const [tForm, setTForm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi.getPublic(locale, "tmpl_dialog,common").then((data) => {
      setTForm(data.tmpl_dialog ?? {});
      setTCommon(data.common ?? {});
    });
  }, [locale]);

  const cachedList = queryClient.getQueryData<PaginatedResponse<NotificationTemplate>>(["notification-templates"]);
  const cachedItem = cachedList?.data?.find((t) => t.id === Number(id));

  const {
    data: template,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["notification-template", id],
    queryFn: () => notificationTemplateApi.getById(Number(id)),
    enabled: !!id,
    initialData: cachedItem,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">Loading...</div>;
  }

  if (isError || !template) {
    return (
      <div className="flex items-center justify-center p-12 text-destructive text-sm">Failed to load template.</div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="font-bold text-2xl">{tForm.edit_title ?? "Edit Template"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {template.language_name} — {template.template_code_detail?.name}
        </p>
      </div>
      <TemplateForm mode="edit" template={template} t={tForm} tCommon={tCommon} />
    </div>
  );
}
