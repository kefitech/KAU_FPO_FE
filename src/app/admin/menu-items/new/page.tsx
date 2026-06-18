"use client";

import { useEffect, useState } from "react";

import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { MenuItemForm } from "../_components/menu-item-form";

type T = Record<string, string>;

export default function NewMenuItemPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [tForm, setTForm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi.getPublic(locale, "menu_dialog,common").then((data) => {
      setTForm(data.menu_dialog ?? {});
      setTCommon(data.common ?? {});
    });
  }, [locale]);

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-bold text-2xl">{tForm.add_title ?? "Add Menu Item"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {tForm.add_description ?? "Add a new item to the admin sidebar menu."}
        </p>
      </div>
      <MenuItemForm mode="create" t={tForm} tCommon={tCommon} />
    </div>
  );
}
