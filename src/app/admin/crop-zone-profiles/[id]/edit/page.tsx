"use client";

import { use, useEffect, useState } from "react";

import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { CropZoneProfileForm } from "../../_components/crop-zone-profile-form";

type T = Record<string, string>;

export default function EditCropZoneProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "admin_crop_zone_profiles,common")
      .then((data) => {
        setT(data.admin_crop_zone_profiles ?? {});
        setTCommon(data.common ?? {});
      })
      .catch(() => undefined);
  }, [locale]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="mx-auto max-w-2xl w-full">
        <h1 className="font-bold text-2xl">{t.edit_title ?? "Edit Crop Zone Profile"}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{t.edit_subtitle ?? "Update this crop's documented requirements."}</p>
      </div>
      <CropZoneProfileForm mode="edit" id={Number(id)} t={t} tCommon={tCommon} />
    </div>
  );
}
