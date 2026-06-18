"use client";

import { useEffect, useState } from "react";

import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { ChannelSettingsForm } from "../_components/channel-settings-form";

type T = Record<string, string>;

export default function NewChannelSettingsPage() {
  const locale = useLocaleStore((s) => s.locale);
  const [tForm, setTForm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi.getPublic(locale, "channel_settings_dialog,common").then((data) => {
      setTForm(data.channel_settings_dialog ?? {});
      setTCommon(data.common ?? {});
    });
  }, [locale]);

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="font-bold text-2xl">{tForm.add_title ?? "Add Channel Setting"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {tForm.add_description ?? "Configure a notification delivery channel."}
        </p>
      </div>
      <ChannelSettingsForm mode="create" t={tForm} tCommon={tCommon} />
    </div>
  );
}
