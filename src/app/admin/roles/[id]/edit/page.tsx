"use client";

import { useEffect, useState } from "react";

import { useParams } from "next/navigation";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { rolesApi } from "@/app/admin/_api/roles";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { Role } from "@/types/admin";
import type { PaginatedResponse } from "@/types/pagination";

import { RoleForm } from "../../_components/role-form";

type T = Record<string, string>;

export default function EditRolePage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocaleStore((s) => s.locale);
  const queryClient = useQueryClient();
  const [tForm, setTForm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi.getPublic(locale, "roles_dialog,common").then((data) => {
      setTForm(data.roles_dialog ?? {});
      setTCommon(data.common ?? {});
    });
  }, [locale]);

  const cachedList = queryClient.getQueryData<PaginatedResponse<Role>>(["roles"]);
  const cachedRole = cachedList?.data?.find((r) => r.id === Number(id));

  const {
    data: role,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["role", id],
    queryFn: () => rolesApi.getById(Number(id)),
    enabled: !!id,
    initialData: cachedRole,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">Loading...</div>;
  }

  if (isError || !role) {
    return <div className="flex items-center justify-center p-12 text-destructive text-sm">Failed to load role.</div>;
  }

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-lg">
        <h1 className="font-bold text-2xl">{tForm.edit_title ?? "Edit Role"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">{role.name}</p>
      </div>
      <RoleForm mode="edit" role={role} t={tForm} tCommon={tCommon} />
    </div>
  );
}
