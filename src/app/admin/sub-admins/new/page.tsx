"use client";

import { useEffect, useState } from "react";

import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { SubAdminForm } from "../_components/sub-admin-form";

type T = Record<string, string>;

export default function NewSubAdminPage() {
  const locale = useLocaleStore((s) => s.locale);
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

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-bold text-2xl">{tForm.add_title ?? "Add Sub-Admin"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {tForm.add_description ?? "Fill in the details to create a new sub-admin account."}
        </p>
      </div>

      <SubAdminForm mode="create" t={tForm} tCommon={tCommon} />
    </div>
  );
}
