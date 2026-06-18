"use client";

import { useEffect, useState } from "react";

import { useParams } from "next/navigation";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { channelSettingsApi } from "@/app/admin/_api/notification-channel-settings";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { ChannelSetting } from "@/types";
import type { PaginatedResponse } from "@/types/pagination";

import { ChannelSettingsForm } from "../../_components/channel-settings-form";

type T = Record<string, string>;

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  in_app: "In-App",
};

export default function EditChannelSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocaleStore((s) => s.locale);
  const queryClient = useQueryClient();
  const [tForm, setTForm] = useState<T>({});
  const [tCommon, setTCommon] = useState<T>({});

  useEffect(() => {
    translationsApi.getPublic(locale, "channel_settings_dialog,common").then((data) => {
      setTForm(data.channel_settings_dialog ?? {});
      setTCommon(data.common ?? {});
    });
  }, [locale]);

  const cachedList = queryClient.getQueryData<PaginatedResponse<ChannelSetting>>(["channel-settings"]);
  const cachedItem = cachedList?.data?.find((c) => c.id === Number(id));

  const {
    data: channelSetting,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["channel-setting", id],
    queryFn: () => channelSettingsApi.getById(Number(id)),
    enabled: !!id,
    initialData: cachedItem,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">Loading...</div>;
  }

  if (isError || !channelSetting) {
    return (
      <div className="flex items-center justify-center p-12 text-destructive text-sm">
        Failed to load channel setting.
      </div>
    );
  }

  const channelLabel =
    channelSetting.channel_display ?? CHANNEL_LABELS[channelSetting.channel] ?? channelSetting.channel;

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="font-bold text-2xl">{tForm.edit_title ?? "Edit Channel Setting"}</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">{channelLabel}</p>
      </div>
      <ChannelSettingsForm mode="edit" channelSetting={channelSetting} t={tForm} tCommon={tCommon} />
    </div>
  );
}
