"use client";

import { useEffect, useState } from "react";

import { useParams } from "next/navigation";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { menuApi } from "@/app/admin/_api/menu";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { AdminMenuItem } from "@/types/admin";
import type { PaginatedResponse } from "@/types/pagination";

import { MenuItemForm } from "../../_components/menu-item-form";

type T = Record<string, string>;

export default function EditMenuItemPage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocaleStore((s) => s.locale);
  const queryClient = useQueryClient();
  const [tForm, setTForm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi.getPublic(locale, "menu_dialog,common").then((data) => {
      setTForm(data.menu_dialog ?? {});
      setTCommon(data.common ?? {});
    });
  }, [locale]);

  const cachedList = queryClient.getQueryData<PaginatedResponse<AdminMenuItem>>(["menu-items"]);
  const cachedItem = cachedList?.data?.find((m) => m.id === Number(id));

  const {
    data: menuItem,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["menu-item", id],
    queryFn: () => menuApi.getById(Number(id)),
    enabled: !!id,
    initialData: cachedItem,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">Loading...</div>;
  }

  if (isError || !menuItem) {
    return (
      <div className="flex items-center justify-center p-12 text-destructive text-sm">Failed to load menu item.</div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-bold text-2xl">{tForm.edit_title ?? "Edit Menu Item"}</h1>
        <p className="mt-0.5 font-mono text-muted-foreground text-sm text-xs">{menuItem.label_key}</p>
      </div>
      <MenuItemForm mode="edit" menuItem={menuItem} t={tForm} tCommon={tCommon} />
    </div>
  );
}
