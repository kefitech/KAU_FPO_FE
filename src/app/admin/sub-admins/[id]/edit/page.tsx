"use client";

import { useEffect, useState } from "react";

import { useParams } from "next/navigation";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { subAdminsApi } from "@/app/admin/_api/sub-admins";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { SubAdmin } from "@/types/admin";
import type { PaginatedResponse } from "@/types/pagination";

import { SubAdminForm } from "../../_components/sub-admin-form";

type T = Record<string, string>;

export default function EditSubAdminPage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocaleStore((s) => s.locale);
  const queryClient = useQueryClient();
  const [tForm, setTForm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "sub_admins_dialog,common")
      .then((data) => {
        setTForm(data.sub_admins_dialog ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  const cachedList = queryClient.getQueryData<PaginatedResponse<SubAdmin>>(["sub-admins"]);
  const cachedSubAdmin = cachedList?.data?.find((s) => s.id === Number(id));

  const {
    data: subAdmin,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["sub-admin", id],
    queryFn: () => subAdminsApi.getById(Number(id)),
    enabled: !!id,
    initialData: cachedSubAdmin,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">Loading...</div>;
  }

  if (isError || !subAdmin) {
    return (
      <div className="flex items-center justify-center p-12 text-destructive text-sm">Failed to load sub-admin.</div>
    );
  }

  const fullName = `${subAdmin.first_name} ${subAdmin.last_name}`.trim() || subAdmin.email;

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-bold text-2xl">{tForm.edit_title ?? "Edit Sub-Admin"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">{fullName}</p>
      </div>

      <SubAdminForm mode="edit" subAdmin={subAdmin} t={tForm} tCommon={tCommon} />
    </div>
  );
}
